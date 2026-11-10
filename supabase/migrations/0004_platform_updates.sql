-- Updates 2, 3, 9–16, and 18–25.
-- Run this once in the Supabase SQL editor after 0003_game_promos.sql.
-- It also marks ashwamani4@gmail.com as the private admin when that login exists.

create schema if not exists private;
revoke all on schema private from public;

create table if not exists private.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

revoke all on private.admins from public, anon, authenticated;

insert into private.admins (user_id)
select id from auth.users where lower(email) = 'ashwamani4@gmail.com'
on conflict do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from private.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.profiles
  add column if not exists languages text[] not null default '{}',
  add column if not exists looking_for text,
  add column if not exists pinned_post_id uuid references public.posts (id) on delete set null,
  add column if not exists created_at timestamptz not null default now();

alter table public.profiles drop constraint if exists profiles_looking_for_len;
alter table public.profiles
  add constraint profiles_looking_for_len check (looking_for is null or char_length(looking_for) <= 80);

alter table public.pages
  add column if not exists pinned_post_id uuid references public.posts (id) on delete set null;

alter table public.posts
  add column if not exists closed_at timestamptz,
  add column if not exists image_expires_at timestamptz,
  add column if not exists image_expired boolean not null default false;

grant update (closed_at) on public.posts to authenticated;

drop policy if exists posts_update_closed on public.posts;
create policy posts_update_closed on public.posts
  for update to authenticated
  using (author_id = auth.uid() and post_type in ('job', 'collab'))
  with check (author_id = auth.uid() and post_type in ('job', 'collab'));

create or replace function public.prepare_feed_image()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  account_created timestamptz;
  posted_today integer;
begin
  if new.post_type = 'image' then
    select created_at into account_created from public.profiles where id = new.author_id;
    if account_created is not null and account_created > now() - interval '14 days' then
      select count(*) into posted_today
      from public.posts
      where author_id = new.author_id
        and post_type = 'image'
        and created_at > date_trunc('day', now());
      if posted_today >= 3 then
        raise exception 'New accounts can post 3 images a day';
      end if;
    end if;
    new.image_expires_at := now() + interval '7 days';
    new.image_expired := false;
  end if;
  return new;
end;
$$;

drop trigger if exists posts_prepare_feed_image on public.posts;
create trigger posts_prepare_feed_image
  before insert on public.posts
  for each row execute function public.prepare_feed_image();

create or replace function public.expire_feed_images()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer := 0;
  doomed record;
begin
  for doomed in
    select id, image_path
    from public.posts
    where post_type = 'image'
      and image_expired = false
      and image_expires_at is not null
      and image_expires_at <= now()
      and image_path is not null
  loop
    delete from storage.objects
    where bucket_id = 'posts' and name = doomed.image_path;
    update public.posts
    set image_path = null, image_expired = true
    where id = doomed.id;
    removed := removed + 1;
  end loop;
  return removed;
end;
$$;

revoke all on function public.expire_feed_images() from public;
grant execute on function public.expire_feed_images() to anon, authenticated;

create or replace function public.guard_profile_pin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.pinned_post_id is null then
    return new;
  end if;
  if not exists (
    select 1 from public.posts
    where id = new.pinned_post_id and author_id = new.id
  ) then
    raise exception 'Pin one of your own posts';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_pin on public.profiles;
create trigger profiles_guard_pin
  before insert or update of pinned_post_id on public.profiles
  for each row execute function public.guard_profile_pin();

create or replace function public.guard_page_pin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.pinned_post_id is null then
    return new;
  end if;
  if not exists (
    select 1 from public.posts
    where id = new.pinned_post_id and page_id = new.id
  ) then
    raise exception 'Pin one post from this page';
  end if;
  return new;
end;
$$;

drop trigger if exists pages_guard_pin on public.pages;
create trigger pages_guard_pin
  before insert or update of pinned_post_id on public.pages
  for each row execute function public.guard_page_pin();

create table if not exists public.saved_listings (
  user_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('playtest', 'post')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);

grant select, insert, delete on public.saved_listings to authenticated;
alter table public.saved_listings enable row level security;
drop policy if exists saved_listings_own on public.saved_listings;
create policy saved_listings_own on public.saved_listings
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('post', 'profile')),
  target_id uuid not null,
  reason text not null,
  created_at timestamptz not null default now(),
  constraint reports_reason_len check (char_length(reason) between 3 and 500)
);

grant select, insert on public.reports to authenticated;
alter table public.reports enable row level security;
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports
  for insert to authenticated
  with check (reporter_id = auth.uid());
drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports
  for select to authenticated
  using (public.is_admin());

create table if not exists public.game_follows (
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_key text not null,
  game_name text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, game_key),
  constraint game_follows_name_len check (char_length(game_name) between 2 and 80)
);

grant select, insert, delete on public.game_follows to authenticated;
alter table public.game_follows enable row level security;
drop policy if exists game_follows_select on public.game_follows;
create policy game_follows_select on public.game_follows for select using (true);
drop policy if exists game_follows_write on public.game_follows;
create policy game_follows_write on public.game_follows
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table if not exists public.page_members (
  page_id uuid not null references public.pages (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (page_id, profile_id)
);

grant select, insert, delete on public.page_members to authenticated;
alter table public.page_members enable row level security;
drop policy if exists page_members_select on public.page_members;
create policy page_members_select on public.page_members for select using (true);
drop policy if exists page_members_write on public.page_members;
create policy page_members_write on public.page_members
  for all to authenticated
  using (exists (select 1 from public.pages pg where pg.id = page_id and pg.owner_id = auth.uid()))
  with check (
    exists (select 1 from public.pages pg where pg.id = page_id and pg.owner_id = auth.uid())
    and profile_id <> auth.uid()
  );

create table if not exists public.meetups (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  city text not null,
  place text not null,
  starts_at timestamptz not null,
  spots integer not null,
  note text not null,
  created_at timestamptz not null default now(),
  constraint meetups_name_len check (char_length(name) between 3 and 80),
  constraint meetups_place_len check (char_length(place) between 2 and 120),
  constraint meetups_note_len check (char_length(note) between 10 and 1000),
  constraint meetups_spots check (spots between 2 and 200)
);

create table if not exists public.meetup_requests (
  id uuid primary key default gen_random_uuid(),
  meetup_id uuid not null references public.meetups (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  why text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  unique (meetup_id, profile_id),
  constraint meetup_requests_why_len check (char_length(why) between 3 and 280)
);

grant select, insert, update, delete on public.meetups to authenticated;
grant select on public.meetups to anon;
grant select, insert, update on public.meetup_requests to authenticated;

alter table public.meetups enable row level security;
alter table public.meetup_requests enable row level security;

drop policy if exists meetups_select on public.meetups;
create policy meetups_select on public.meetups for select using (true);
drop policy if exists meetups_insert on public.meetups;
create policy meetups_insert on public.meetups
  for insert to authenticated
  with check (host_id = auth.uid());
drop policy if exists meetups_update on public.meetups;
create policy meetups_update on public.meetups
  for update to authenticated
  using (host_id = auth.uid())
  with check (host_id = auth.uid());
drop policy if exists meetups_delete on public.meetups;
create policy meetups_delete on public.meetups
  for delete to authenticated
  using (host_id = auth.uid());

drop policy if exists meetup_requests_select on public.meetup_requests;
create policy meetup_requests_select on public.meetup_requests
  for select to authenticated
  using (
    profile_id = auth.uid()
    or exists (select 1 from public.meetups m where m.id = meetup_id and m.host_id = auth.uid())
    or status = 'accepted'
  );
drop policy if exists meetup_requests_insert on public.meetup_requests;
create policy meetup_requests_insert on public.meetup_requests
  for insert to authenticated
  with check (profile_id = auth.uid() and status = 'pending');
drop policy if exists meetup_requests_update on public.meetup_requests;
create policy meetup_requests_update on public.meetup_requests
  for update to authenticated
  using (
    profile_id = auth.uid()
    or exists (select 1 from public.meetups m where m.id = meetup_id and m.host_id = auth.uid())
  )
  with check (
    profile_id = auth.uid()
    or exists (select 1 from public.meetups m where m.id = meetup_id and m.host_id = auth.uid())
  );

alter table public.game_promos
  add column if not exists genre text,
  add column if not exists expires_at timestamptz;

alter table public.game_promos drop constraint if exists game_promos_genre;
alter table public.game_promos
  add constraint game_promos_genre check (
    genre is null or genre in (
      'Action', 'Adventure', 'RPG', 'Strategy', 'Simulation',
      'Sports', 'Racing', 'Puzzle', 'Horror', 'Casual'
    )
  );

update public.game_promos
set expires_at = paid_at + interval '30 days'
where payment_status = 'paid' and paid_at is not null and expires_at is null;

grant update (genre) on public.game_promos to authenticated;

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
    and (
      (payment_status = 'unpaid' and razorpay_order_id is null)
      or (payment_status = 'paid' and expires_at is not null and expires_at <= now())
    );

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
      paid_at = now(),
      expires_at = now() + interval '30 days'
  where id = p_promo_id
    and author_id = auth.uid()
    and razorpay_order_id = p_order_id
    and amount_paise = 49900
    and (
      payment_status = 'unpaid'
      or (payment_status = 'paid' and expires_at is not null and expires_at <= now())
    );

  if not found then
    raise exception 'This trailer is not waiting for payment';
  end if;
end;
$$;

create or replace function public.admin_accounts()
returns table (
  id uuid,
  email text,
  username text,
  display_name text,
  role text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'You do not have permission to do that';
  end if;
  return query
  select p.id, u.email::text, p.username, p.display_name, p.role, p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  order by p.created_at desc
  limit 200;
end;
$$;

create or replace function public.admin_delete_login(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'You do not have permission to do that';
  end if;
  if target_id = auth.uid() then
    raise exception 'You cannot remove your own login';
  end if;
  if exists (select 1 from private.admins where user_id = target_id) then
    raise exception 'You cannot remove an admin login';
  end if;
  delete from auth.users where id = target_id;
end;
$$;

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in first';
  end if;
  delete from private.admins where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.admin_accounts() from public;
revoke all on function public.admin_delete_login(uuid) from public;
revoke all on function public.delete_own_account() from public;
grant execute on function public.admin_accounts() to authenticated;
grant execute on function public.admin_delete_login(uuid) to authenticated;
grant execute on function public.delete_own_account() to authenticated;

create or replace function public.search_people_by_game(p_game text)
returns table (
  id uuid,
  username text,
  display_name text,
  role text,
  headline text,
  city text,
  state text,
  avatar_path text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.username, p.display_name, p.role, p.headline, p.city, p.state, p.avatar_path
  from public.profiles p
  where p.onboarding_complete
    and char_length(trim(p_game)) >= 2
    and (
      exists (
        select 1 from jsonb_array_elements_text(coalesce(p.role_details->'favorite_games', '[]'::jsonb)) game
        where lower(game) = lower(trim(p_game))
      )
      or exists (
        select 1 from jsonb_array_elements_text(coalesce(p.role_details->'games_tested', '[]'::jsonb)) game
        where lower(game) = lower(trim(p_game))
      )
    )
  order by p.display_name
  limit 40;
$$;

revoke all on function public.search_people_by_game(text) from public;
grant execute on function public.search_people_by_game(text) to anon, authenticated;

-- Accepted meetup names and page teams are readable without a login.
drop policy if exists meetup_requests_select on public.meetup_requests;
create policy meetup_requests_select on public.meetup_requests
  for select
  using (
    status = 'accepted'
    or profile_id = auth.uid()
    or exists (select 1 from public.meetups m where m.id = meetup_id and m.host_id = auth.uid())
  );

grant select on public.meetup_requests to anon;
grant select on public.page_members to anon;

create or replace function public.admin_update_profile(
  target_id uuid,
  p_display_name text,
  p_headline text,
  p_about text,
  p_city text,
  p_state text,
  p_looking_for text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'You do not have permission to do that';
  end if;
  if target_id is null or char_length(trim(coalesce(p_display_name, ''))) < 2 then
    raise exception 'Add a name';
  end if;
  if char_length(coalesce(p_about, '')) > 4000 then
    raise exception 'About is too long';
  end if;
  if char_length(coalesce(p_looking_for, '')) > 80 then
    raise exception 'Looking for is too long';
  end if;

  update public.profiles
  set display_name = trim(p_display_name),
      headline = nullif(trim(coalesce(p_headline, '')), ''),
      about = nullif(trim(coalesce(p_about, '')), ''),
      city = nullif(trim(coalesce(p_city, '')), ''),
      state = nullif(trim(coalesce(p_state, '')), ''),
      looking_for = nullif(trim(coalesce(p_looking_for, '')), ''),
      updated_at = now()
  where id = target_id;

  if not found then
    raise exception 'That profile was not found';
  end if;
end;
$$;

create or replace function public.admin_update_page(
  page_id uuid,
  p_name text,
  p_headline text,
  p_about text,
  p_city text,
  p_state text,
  p_featured boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'You do not have permission to do that';
  end if;
  if page_id is null or char_length(trim(coalesce(p_name, ''))) < 2 then
    raise exception 'Add a page name';
  end if;
  if char_length(coalesce(p_about, '')) > 4000 then
    raise exception 'About is too long';
  end if;

  update public.pages
  set name = trim(p_name),
      headline = nullif(trim(coalesce(p_headline, '')), ''),
      about = nullif(trim(coalesce(p_about, '')), ''),
      city = nullif(trim(coalesce(p_city, '')), ''),
      state = nullif(trim(coalesce(p_state, '')), ''),
      featured = coalesce(p_featured, false),
      updated_at = now()
  where id = page_id;

  if not found then
    raise exception 'That page was not found';
  end if;
end;
$$;

revoke all on function public.admin_update_profile(uuid, text, text, text, text, text, text) from public;
revoke all on function public.admin_update_page(uuid, text, text, text, text, text, boolean) from public;
grant execute on function public.admin_update_profile(uuid, text, text, text, text, text, text) to authenticated;
grant execute on function public.admin_update_page(uuid, text, text, text, text, text, boolean) to authenticated;
