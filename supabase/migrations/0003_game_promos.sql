-- Paid upcoming-game trailers.
-- Run this once in the Supabase SQL editor after 0001_init.sql.
-- A trailer stays hidden until the studio pays ₹499.
-- The Razorpay secret is not stored in this file. After you add
-- RAZORPAY_KEY_SECRET to the server env, run this once as well:
--   insert into private.payment_config (id, razorpay_key_secret)
--   values (1, 'your_razorpay_key_secret')
--   on conflict (id) do update set razorpay_key_secret = excluded.razorpay_key_secret;

create schema if not exists private;
revoke all on schema private from public;

create table if not exists private.payment_config (
  id integer primary key check (id = 1),
  razorpay_key_secret text
);

revoke all on private.payment_config from public, anon, authenticated;

create table if not exists public.game_promos (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  game_title text not null,
  body text not null,
  youtube_url text not null,
  platforms text[] not null default '{}',
  release_label text,
  amount_paise integer not null,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid')),
  razorpay_order_id text,
  razorpay_payment_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  constraint game_promos_title_len check (char_length(game_title) between 2 and 120),
  constraint game_promos_body_len check (char_length(body) between 10 and 2000),
  constraint game_promos_release_len check (release_label is null or char_length(release_label) between 1 and 80),
  constraint game_promos_price check (amount_paise = 49900)
);

create unique index if not exists game_promos_order_idx
  on public.game_promos (razorpay_order_id)
  where razorpay_order_id is not null;

create unique index if not exists game_promos_payment_idx
  on public.game_promos (razorpay_payment_id)
  where razorpay_payment_id is not null;

create index if not exists game_promos_paid_idx
  on public.game_promos (paid_at desc)
  where payment_status = 'paid';

grant select (
  id, page_id, author_id, game_title, body, youtube_url, platforms,
  release_label, amount_paise, payment_status, paid_at, created_at
) on public.game_promos to anon, authenticated;

grant insert (
  page_id, author_id, game_title, body, youtube_url, platforms,
  release_label, amount_paise, payment_status
) on public.game_promos to authenticated;

grant delete on public.game_promos to authenticated;

alter table public.game_promos enable row level security;

drop policy if exists game_promos_select on public.game_promos;
create policy game_promos_select on public.game_promos
  for select using (payment_status = 'paid' or author_id = auth.uid());

drop policy if exists game_promos_insert on public.game_promos;
create policy game_promos_insert on public.game_promos
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and payment_status = 'unpaid'
    and amount_paise = 49900
    and exists (
      select 1 from public.pages pg
      where pg.id = page_id and pg.owner_id = auth.uid()
    )
  );

drop policy if exists game_promos_delete on public.game_promos;
create policy game_promos_delete on public.game_promos
  for delete to authenticated
  using (author_id = auth.uid() and payment_status = 'unpaid');

create or replace function public.attach_promo_order(p_promo_id uuid, p_order_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_order_id is null or char_length(p_order_id) < 8 or char_length(p_order_id) > 64 then
    raise exception 'That payment order is not valid';
  end if;
  if exists (select 1 from public.game_promos where razorpay_order_id = p_order_id and id <> p_promo_id) then
    raise exception 'That payment order is already used';
  end if;

  update public.game_promos
  set razorpay_order_id = p_order_id
  where id = p_promo_id
    and author_id = auth.uid()
    and payment_status = 'unpaid'
    and razorpay_order_id is null;

  if not found then
    raise exception 'This trailer is not waiting for payment';
  end if;
end;
$$;

create or replace function public.confirm_promo_payment(
  p_promo_id uuid,
  p_order_id text,
  p_payment_id text,
  p_signature text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  secret text;
  expected text;
begin
  select razorpay_key_secret into secret from private.payment_config where id = 1;
  if secret is null or secret = '' then
    raise exception 'Payment is not set up';
  end if;
  if p_order_id is null or p_payment_id is null or p_signature is null then
    raise exception 'Payment could not be confirmed';
  end if;

  expected := encode(hmac(p_order_id || '|' || p_payment_id, secret, 'sha256'), 'hex');
  if lower(expected) is distinct from lower(p_signature) then
    raise exception 'Payment could not be confirmed';
  end if;

  update public.game_promos
  set payment_status = 'paid',
      razorpay_payment_id = p_payment_id,
      paid_at = now()
  where id = p_promo_id
    and author_id = auth.uid()
    and payment_status = 'unpaid'
    and razorpay_order_id = p_order_id
    and amount_paise = 49900;

  if not found then
    raise exception 'This trailer is not waiting for payment';
  end if;
end;
$$;

create or replace function public.promo_checkout_state(p_promo_id uuid)
returns table (order_id text, payment_status text)
language sql
security definer
set search_path = public
as $$
  select razorpay_order_id, game_promos.payment_status
  from public.game_promos
  where id = p_promo_id and author_id = auth.uid();
$$;

revoke all on function public.attach_promo_order(uuid, text) from public;
revoke all on function public.confirm_promo_payment(uuid, text, text, text) from public;
revoke all on function public.promo_checkout_state(uuid) from public;
grant execute on function public.attach_promo_order(uuid, text) to authenticated;
grant execute on function public.confirm_promo_payment(uuid, text, text, text) to authenticated;
grant execute on function public.promo_checkout_state(uuid) to authenticated;
