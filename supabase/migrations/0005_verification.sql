-- Grey verification ticks.
-- Run this once in the Supabase SQL editor after 0004_platform_updates.sql.
-- A profile tick comes from DigiLocker. A studio page tick comes from an active GSTIN.
-- The public tables only store true or false. The document and GST details stay in private.
--
-- This file does not contain a secret. After you choose a long random signing secret,
-- put the same value in Vercel as VERIFICATION_HMAC_SECRET and run this once:
--   insert into private.verification_config (id, hmac_secret)
--   values (1, 'paste_the_same_secret')
--   on conflict (id) do update set hmac_secret = excluded.hmac_secret;

create schema if not exists private;
revoke all on schema private from public;

create table if not exists private.verification_config (
  id integer primary key check (id = 1),
  hmac_secret text
);

revoke all on private.verification_config from public, anon, authenticated;

alter table public.profiles
  add column if not exists verified boolean not null default false;

alter table public.pages
  add column if not exists verified boolean not null default false;

revoke update (verified) on public.profiles from public, anon, authenticated;
revoke update (verified) on public.pages from public, anon, authenticated;

create or replace function public.reject_untrusted_verified_change()
returns trigger
language plpgsql
as $$
begin
  if current_setting('ign.allow_verified', true) is distinct from '1' then
    if tg_op = 'INSERT' then
      new.verified := false;
    elsif new.verified is distinct from old.verified then
      raise exception 'The verified tick cannot be edited from a profile form';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_verified_guard on public.profiles;
create trigger profiles_verified_guard
  before insert or update on public.profiles
  for each row execute function public.reject_untrusted_verified_change();

drop trigger if exists pages_verified_guard on public.pages;
create trigger pages_verified_guard
  before insert or update on public.pages
  for each row execute function public.reject_untrusted_verified_change();

create table if not exists private.profile_verifications (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  document_type text not null check (document_type in ('aadhaar', 'pan', 'driving_licence')),
  last4 text not null check (last4 ~ '^[A-Za-z0-9]{4}$'),
  government_name text not null check (char_length(government_name) between 2 and 120),
  verified_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists private.page_verifications (
  page_id uuid primary key references public.pages (id) on delete cascade,
  gstin text not null check (char_length(gstin) = 15),
  legal_name text not null check (char_length(legal_name) between 2 and 160),
  verified_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists private.verification_nonces (
  nonce text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('profile', 'page')),
  page_id uuid references public.pages (id) on delete cascade,
  document_type text,
  code_verifier text,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

revoke all on private.profile_verifications from public, anon, authenticated;
revoke all on private.page_verifications from public, anon, authenticated;
revoke all on private.verification_nonces from public, anon, authenticated;

create or replace function public.begin_verification(
  p_kind text,
  p_document_type text,
  p_verifier text
)
returns text
language plpgsql
security definer
set search_path = public, private
as $$
declare
  nonce text := gen_random_uuid()::text;
  owned_page uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;

  if p_kind = 'profile' then
    if p_document_type not in ('aadhaar', 'pan', 'driving_licence') then
      raise exception 'That document cannot be used';
    end if;
    if p_verifier is null or char_length(p_verifier) < 43 or char_length(p_verifier) > 128 then
      raise exception 'Verification could not be started';
    end if;
  elsif p_kind = 'page' then
    select id into owned_page from public.pages where owner_id = auth.uid();
    if owned_page is null then
      raise exception 'Create your studio page first';
    end if;
    p_document_type := null;
    p_verifier := null;
  else
    raise exception 'Verification could not be started';
  end if;

  delete from private.verification_nonces
  where user_id = auth.uid() and kind = p_kind and used_at is null;

  insert into private.verification_nonces (nonce, user_id, kind, page_id, document_type, code_verifier)
  values (nonce, auth.uid(), p_kind, owned_page, p_document_type, p_verifier);

  return nonce;
end;
$$;

create or replace function public.verification_challenge(p_nonce text)
returns table (code_verifier text, document_type text)
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;
  return query
  select n.code_verifier, n.document_type
  from private.verification_nonces n
  where n.nonce = p_nonce
    and n.user_id = auth.uid()
    and n.kind = 'profile'
    and n.used_at is null
    and n.created_at > now() - interval '20 minutes';
end;
$$;

create or replace function public.confirm_profile_verification(
  p_document_type text,
  p_last4 text,
  p_government_name text,
  p_nonce text,
  p_signature text
)
returns void
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  secret text;
  expected text;
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;
  if p_document_type not in ('aadhaar', 'pan', 'driving_licence') then
    raise exception 'That document cannot be used';
  end if;
  if p_last4 is null or p_last4 !~ '^[A-Za-z0-9]{4}$' then
    raise exception 'Verification could not be confirmed';
  end if;
  if p_government_name is null or char_length(btrim(p_government_name)) < 2 then
    raise exception 'Verification could not be confirmed';
  end if;

  select hmac_secret into secret from private.verification_config where id = 1;
  if secret is null or char_length(secret) < 16 then
    raise exception 'Verification is not set up';
  end if;

  expected := encode(
    hmac(
      'profile|' || auth.uid()::text || '|' || p_document_type || '|' || p_last4 || '|' || p_government_name || '|' || p_nonce,
      secret,
      'sha256'
    ),
    'hex'
  );
  if lower(expected) is distinct from lower(p_signature) then
    raise exception 'Verification could not be confirmed';
  end if;

  update private.verification_nonces
  set used_at = now()
  where nonce = p_nonce
    and user_id = auth.uid()
    and kind = 'profile'
    and document_type = p_document_type
    and used_at is null
    and created_at > now() - interval '20 minutes';
  if not found then
    raise exception 'Verification could not be confirmed';
  end if;

  perform set_config('ign.allow_verified', '1', true);
  update public.profiles set verified = true where id = auth.uid();

  insert into private.profile_verifications (profile_id, document_type, last4, government_name, verified_at, revoked_at)
  values (auth.uid(), p_document_type, p_last4, btrim(p_government_name), now(), null)
  on conflict (profile_id) do update
  set document_type = excluded.document_type,
      last4 = excluded.last4,
      government_name = excluded.government_name,
      verified_at = excluded.verified_at,
      revoked_at = null;
end;
$$;

create or replace function public.confirm_page_verification(
  p_gstin text,
  p_legal_name text,
  p_nonce text,
  p_signature text
)
returns void
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  secret text;
  expected text;
  owned_page uuid;
  clean_gstin text := upper(btrim(p_gstin));
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;
  select id into owned_page from public.pages where owner_id = auth.uid();
  if owned_page is null then
    raise exception 'Create your studio page first';
  end if;
  if clean_gstin is null or char_length(clean_gstin) <> 15 then
    raise exception 'Verification could not be confirmed';
  end if;
  if p_legal_name is null or char_length(btrim(p_legal_name)) < 2 then
    raise exception 'Verification could not be confirmed';
  end if;

  select hmac_secret into secret from private.verification_config where id = 1;
  if secret is null or char_length(secret) < 16 then
    raise exception 'Verification is not set up';
  end if;

  expected := encode(
    hmac(
      'page|' || auth.uid()::text || '|' || owned_page::text || '|' || clean_gstin || '|' || p_legal_name || '|' || p_nonce,
      secret,
      'sha256'
    ),
    'hex'
  );
  if lower(expected) is distinct from lower(p_signature) then
    raise exception 'Verification could not be confirmed';
  end if;

  update private.verification_nonces
  set used_at = now()
  where nonce = p_nonce
    and user_id = auth.uid()
    and kind = 'page'
    and page_id = owned_page
    and used_at is null
    and created_at > now() - interval '20 minutes';
  if not found then
    raise exception 'Verification could not be confirmed';
  end if;

  perform set_config('ign.allow_verified', '1', true);
  update public.pages set verified = true where id = owned_page;

  insert into private.page_verifications (page_id, gstin, legal_name, verified_at, revoked_at)
  values (owned_page, clean_gstin, btrim(p_legal_name), now(), null)
  on conflict (page_id) do update
  set gstin = excluded.gstin,
      legal_name = excluded.legal_name,
      verified_at = excluded.verified_at,
      revoked_at = null;
end;
$$;

create or replace function public.admin_list_verifications()
returns table (
  kind text,
  target_id uuid,
  label text,
  detail text,
  government_name text,
  verified_at timestamptz
)
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    return;
  end if;

  return query
  select
    'profile'::text,
    pr.id,
    pr.display_name,
    case v.document_type
      when 'aadhaar' then 'Aadhaar'
      when 'pan' then 'PAN'
      else 'Driving licence'
    end || ' · ' || v.last4,
    v.government_name,
    v.verified_at
  from private.profile_verifications v
  join public.profiles pr on pr.id = v.profile_id
  where pr.verified and v.revoked_at is null
  union all
  select
    'page'::text,
    pg.id,
    pg.name,
    v.gstin,
    v.legal_name,
    v.verified_at
  from private.page_verifications v
  join public.pages pg on pg.id = v.page_id
  where pg.verified and v.revoked_at is null
  order by 6 desc;
end;
$$;

create or replace function public.admin_revoke_verification(p_kind text, p_target uuid)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Not allowed';
  end if;

  perform set_config('ign.allow_verified', '1', true);
  if p_kind = 'profile' then
    update public.profiles set verified = false where id = p_target;
    update private.profile_verifications set revoked_at = now() where profile_id = p_target;
  elsif p_kind = 'page' then
    update public.pages set verified = false where id = p_target;
    update private.page_verifications set revoked_at = now() where page_id = p_target;
  else
    raise exception 'Not allowed';
  end if;
end;
$$;

revoke all on function public.begin_verification(text, text, text) from public;
revoke all on function public.verification_challenge(text) from public;
revoke all on function public.confirm_profile_verification(text, text, text, text, text) from public;
revoke all on function public.confirm_page_verification(text, text, text, text) from public;
revoke all on function public.admin_list_verifications() from public;
revoke all on function public.admin_revoke_verification(text, uuid) from public;

grant execute on function public.begin_verification(text, text, text) to authenticated;
grant execute on function public.verification_challenge(text) to authenticated;
grant execute on function public.confirm_profile_verification(text, text, text, text, text) to authenticated;
grant execute on function public.confirm_page_verification(text, text, text, text) to authenticated;
grant execute on function public.admin_list_verifications() to authenticated;
grant execute on function public.admin_revoke_verification(text, uuid) to authenticated;
