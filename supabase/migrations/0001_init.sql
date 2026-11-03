-- Indian Gaming Network MVP
-- Run this once in the Supabase SQL editor (or with the Supabase CLI).
-- It creates tables, row level security, storage buckets, and notification triggers.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  display_name text not null,
  role text not null check (role in ('gamer', 'tester', 'studio', 'streamer', 'cosplay_artist')),
  headline text,
  about text,
  city text,
  state text,
  avatar_path text,
  banner_path text,
  skills text[] not null default '{}',
  website text,
  contact_email text,
  availability text,
  socials jsonb not null default '{}'::jsonb,
  role_details jsonb not null default '{}'::jsonb,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,20}$'),
  constraint profiles_about_len check (about is null or char_length(about) <= 4000)
);

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles (id) on delete cascade,
  slug text not null unique,
  name text not null,
  page_type text not null default 'studio' check (page_type in ('studio', 'organization')),
  headline text,
  about text,
  city text,
  state text,
  logo_path text,
  banner_path text,
  website text,
  contact_email text,
  games text[] not null default '{}',
  specialties text[] not null default '{}',
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pages_slug_format check (slug ~ '^[a-z0-9-]{3,40}$')
);

create table public.page_follows (
  user_id uuid not null references public.profiles (id) on delete cascade,
  page_id uuid not null references public.pages (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, page_id)
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  page_id uuid references public.pages (id) on delete set null,
  post_type text not null check (post_type in ('image', 'youtube', 'job', 'collab')),
  body text not null default '',
  image_path text,
  youtube_url text,
  job_title text,
  job_location text,
  job_type text check (job_type is null or job_type in ('full_time', 'contract', 'freelance', 'internship')),
  collab_title text,
  collab_looking_for text[] not null default '{}',
  game_title text,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_body_len check (char_length(body) <= 4000),
  constraint posts_type_fields check (
    (
      post_type = 'image'
      and image_path is not null
      and youtube_url is null
      and job_title is null
      and job_type is null
      and collab_title is null
    )
    or (
      post_type = 'youtube'
      and youtube_url is not null
      and image_path is null
      and job_title is null
      and job_type is null
      and collab_title is null
    )
    or (
      post_type = 'job'
      and job_title is not null
      and job_type is not null
      and image_path is null
      and youtube_url is null
      and collab_title is null
    )
    or (
      post_type = 'collab'
      and collab_title is not null
      and image_path is null
      and youtube_url is null
      and job_title is null
      and job_type is null
    )
  )
);

create table public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table public.playtest_listings (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  game_title text not null,
  description text not null,
  platforms text[] not null default '{}',
  location_type text not null check (location_type in ('remote', 'onsite', 'hybrid')),
  city text,
  state text,
  compensation text,
  slots integer check (slots is null or slots > 0),
  deadline date,
  status text not null default 'open' check (status in ('open', 'closed')),
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint playtests_title_len check (char_length(title) between 3 and 120),
  constraint playtests_description_len check (char_length(description) between 10 and 4000)
);

create table public.interests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid references public.posts (id) on delete cascade,
  playtest_id uuid references public.playtest_listings (id) on delete cascade,
  message text not null default '',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  constraint interests_one_target check (
    (post_id is not null and playtest_id is null)
    or (post_id is null and playtest_id is not null)
  ),
  constraint interests_message_len check (char_length(message) <= 1000)
);

create unique index interests_one_post
  on public.interests (user_id, post_id)
  where post_id is not null;

create unique index interests_one_playtest
  on public.interests (user_id, playtest_id)
  where playtest_id is not null;

create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  caption text,
  media_path text,
  external_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.experience_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  organization text,
  game_title text,
  start_date date,
  end_date date,
  description text,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  type text not null check (type in ('comment', 'interest', 'page_follow')),
  entity_id uuid not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);
create index profiles_state_idx on public.profiles (state);
create index posts_created_idx on public.posts (created_at desc);
create index posts_type_idx on public.posts (post_type);
create index posts_author_idx on public.posts (author_id);
create index posts_page_idx on public.posts (page_id);
create index comments_post_idx on public.post_comments (post_id, created_at);
create index playtests_status_idx on public.playtest_listings (status, created_at desc);
create index playtests_page_idx on public.playtest_listings (page_id);
create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
create index portfolio_profile_idx on public.portfolio_items (profile_id, sort_order);
create index experience_profile_idx on public.experience_items (profile_id, start_date desc);

-- ---------------------------------------------------------------------------
-- Helper triggers
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger pages_touch before update on public.pages
  for each row execute function public.touch_updated_at();
create trigger posts_touch before update on public.posts
  for each row execute function public.touch_updated_at();
create trigger playtests_touch before update on public.playtest_listings
  for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_name text;
  candidate text;
  desired_role text;
  display text;
  n int := 0;
begin
  desired_role := coalesce(new.raw_user_meta_data->>'role', 'gamer');
  if desired_role not in ('gamer', 'tester', 'studio', 'streamer', 'cosplay_artist') then
    desired_role := 'gamer';
  end if;

  display := nullif(trim(coalesce(new.raw_user_meta_data->>'display_name', '')), '');
  if display is null then
    display := split_part(coalesce(new.email, 'member'), '@', 1);
  end if;

  base_name := lower(regexp_replace(coalesce(split_part(new.email, '@', 1), 'user'), '[^a-zA-Z0-9_]', '', 'g'));
  if base_name is null or length(base_name) < 3 then
    base_name := 'user';
  end if;
  base_name := left(base_name, 16);
  candidate := base_name;

  while exists (select 1 from public.profiles where username = candidate) loop
    n := n + 1;
    candidate := left(base_name, 12) || '_' || substr(replace(new.id::text, '-', ''), 1, 4) || n::text;
  end loop;

  insert into public.profiles (id, username, display_name, role)
  values (new.id, candidate, left(display, 80), desired_role);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.prevent_self_follow()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  owner uuid;
begin
  select owner_id into owner from public.pages where id = new.page_id;
  if owner = new.user_id then
    raise exception 'You cannot follow your own page';
  end if;
  return new;
end;
$$;

create trigger page_follows_no_self
  before insert on public.page_follows
  for each row execute function public.prevent_self_follow();

create or replace function public.enforce_interest_target()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  ptype text;
  pstatus text;
begin
  if new.post_id is not null then
    select post_type into ptype from public.posts where id = new.post_id;
    if ptype is null or ptype not in ('job', 'collab') then
      raise exception 'Interest is only allowed on job and collab posts';
    end if;
  end if;

  if new.playtest_id is not null then
    select status into pstatus from public.playtest_listings where id = new.playtest_id;
    if pstatus is distinct from 'open' then
      raise exception 'This playtest is not open';
    end if;
  end if;

  return new;
end;
$$;

create trigger interests_check_target
  before insert on public.interests
  for each row execute function public.enforce_interest_target();

create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
begin
  select author_id into owner from public.posts where id = new.post_id;
  if owner is not null and owner <> new.author_id then
    insert into public.notifications (recipient_id, actor_id, type, entity_id)
    values (owner, new.author_id, 'comment', new.post_id);
  end if;
  return new;
end;
$$;

create trigger comments_notify
  after insert on public.post_comments
  for each row execute function public.notify_on_comment();

create or replace function public.notify_on_interest()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient uuid;
begin
  if new.post_id is not null then
    select author_id into recipient from public.posts where id = new.post_id;
  else
    select pg.owner_id into recipient
    from public.playtest_listings l
    join public.pages pg on pg.id = l.page_id
    where l.id = new.playtest_id;
  end if;

  if recipient is not null and recipient <> new.user_id then
    insert into public.notifications (recipient_id, actor_id, type, entity_id)
    values (recipient, new.user_id, 'interest', coalesce(new.post_id, new.playtest_id));
  end if;
  return new;
end;
$$;

create trigger interests_notify
  after insert on public.interests
  for each row execute function public.notify_on_interest();

create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
begin
  select owner_id into owner from public.pages where id = new.page_id;
  if owner is not null and owner <> new.user_id then
    insert into public.notifications (recipient_id, actor_id, type, entity_id)
    values (owner, new.user_id, 'page_follow', new.page_id);
  end if;
  return new;
end;
$$;

create trigger follows_notify
  after insert on public.page_follows
  for each row execute function public.notify_on_follow();

-- Inbox view. security_invoker keeps the underlying row level security.
create view public.interest_inbox
with (security_invoker = true) as
select
  i.id,
  i.user_id,
  i.message,
  i.status,
  i.created_at,
  i.post_id,
  i.playtest_id,
  case when i.post_id is not null then p.author_id else pg.owner_id end as owner_id,
  case
    when i.post_id is not null then p.post_type
    else 'playtest'
  end as kind,
  coalesce(p.job_title, p.collab_title, l.title) as target_title,
  applicant.display_name as applicant_name,
  applicant.username as applicant_username,
  applicant.avatar_path as applicant_avatar_path
from public.interests i
join public.profiles applicant on applicant.id = i.user_id
left join public.posts p on p.id = i.post_id
left join public.playtest_listings l on l.id = i.playtest_id
left join public.pages pg on pg.id = l.page_id;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select on public.profiles, public.pages, public.page_follows, public.posts,
  public.post_likes, public.post_comments, public.playtest_listings,
  public.portfolio_items, public.experience_items, public.interest_inbox
  to anon, authenticated;

grant select on public.interests, public.notifications to authenticated;

grant insert, update on public.profiles to authenticated;
grant insert, update, delete on public.pages to authenticated;
grant insert, delete on public.page_follows to authenticated;
grant insert, delete on public.posts to authenticated;
grant insert, delete on public.post_likes to authenticated;
grant insert, delete on public.post_comments to authenticated;
grant insert, update, delete on public.playtest_listings to authenticated;
grant insert, update on public.interests to authenticated;
grant insert, update, delete on public.portfolio_items to authenticated;
grant insert, update, delete on public.experience_items to authenticated;
grant update on public.notifications to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.pages enable row level security;
alter table public.page_follows enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.playtest_listings enable row level security;
alter table public.interests enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.experience_items enable row level security;
alter table public.notifications enable row level security;

create policy profiles_select on public.profiles for select using (true);
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy pages_select on public.pages for select using (true);
create policy pages_insert on public.pages for insert to authenticated
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid() and pr.role = 'studio'
    )
  );
create policy pages_update on public.pages for update to authenticated
  using (
    owner_id = auth.uid()
    and exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'studio')
  )
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'studio')
  );
create policy pages_delete on public.pages for delete to authenticated
  using (owner_id = auth.uid());

create policy follows_select on public.page_follows for select using (true);
create policy follows_insert on public.page_follows for insert to authenticated
  with check (user_id = auth.uid());
create policy follows_delete on public.page_follows for delete to authenticated
  using (user_id = auth.uid());

create policy posts_select on public.posts for select using (true);
create policy posts_insert on public.posts for insert to authenticated
  with check (
    author_id = auth.uid()
    and (
      page_id is null
      or exists (select 1 from public.pages pg where pg.id = page_id and pg.owner_id = auth.uid())
    )
  );
create policy posts_delete on public.posts for delete to authenticated
  using (author_id = auth.uid());

create policy likes_select on public.post_likes for select using (true);
create policy likes_insert on public.post_likes for insert to authenticated
  with check (user_id = auth.uid());
create policy likes_delete on public.post_likes for delete to authenticated
  using (user_id = auth.uid());

create policy comments_select on public.post_comments for select using (true);
create policy comments_insert on public.post_comments for insert to authenticated
  with check (author_id = auth.uid());
create policy comments_delete on public.post_comments for delete to authenticated
  using (author_id = auth.uid());

create policy playtests_select on public.playtest_listings for select using (true);
create policy playtests_insert on public.playtest_listings for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (select 1 from public.pages pg where pg.id = page_id and pg.owner_id = auth.uid())
  );
create policy playtests_update on public.playtest_listings for update to authenticated
  using (
    exists (select 1 from public.pages pg where pg.id = page_id and pg.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.pages pg where pg.id = page_id and pg.owner_id = auth.uid())
  );
create policy playtests_delete on public.playtest_listings for delete to authenticated
  using (
    exists (select 1 from public.pages pg where pg.id = page_id and pg.owner_id = auth.uid())
  );

create policy interests_select on public.interests for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
    or exists (
      select 1
      from public.playtest_listings l
      join public.pages pg on pg.id = l.page_id
      where l.id = playtest_id and pg.owner_id = auth.uid()
    )
  );
create policy interests_insert on public.interests for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');
create policy interests_update on public.interests for update to authenticated
  using (
    exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
    or exists (
      select 1
      from public.playtest_listings l
      join public.pages pg on pg.id = l.page_id
      where l.id = playtest_id and pg.owner_id = auth.uid()
    )
  )
  with check (
    exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
    or exists (
      select 1
      from public.playtest_listings l
      join public.pages pg on pg.id = l.page_id
      where l.id = playtest_id and pg.owner_id = auth.uid()
    )
  );

create policy portfolio_select on public.portfolio_items for select using (true);
create policy portfolio_write on public.portfolio_items for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy experience_select on public.experience_items for select using (true);
create policy experience_write on public.experience_items for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy notifications_select on public.notifications for select to authenticated
  using (recipient_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('banners', 'banners', true),
  ('posts', 'posts', true),
  ('portfolio', 'portfolio', true)
on conflict (id) do nothing;

create policy media_public_read on storage.objects
  for select to public
  using (bucket_id in ('avatars', 'banners', 'posts', 'portfolio'));

create policy media_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('avatars', 'banners', 'posts', 'portfolio')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy media_owner_update on storage.objects
  for update to authenticated
  using (
    bucket_id in ('avatars', 'banners', 'posts', 'portfolio')
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id in ('avatars', 'banners', 'posts', 'portfolio')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy media_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('avatars', 'banners', 'posts', 'portfolio')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when undefined_object then null;
  when duplicate_object then null;
end $$;
