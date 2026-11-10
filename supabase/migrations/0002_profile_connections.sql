-- Profile connections (people, not studio pages).
-- Run this once in the Supabase SQL editor after 0001_init.sql.
-- A mutual on a profile is a person both accounts have accepted.
-- Page follows stay as they are and still drive the Following feed.

create table if not exists public.profile_connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  constraint profile_connections_not_self check (requester_id <> addressee_id),
  constraint profile_connections_pair unique (requester_id, addressee_id)
);

create unique index if not exists profile_connections_undirected_idx
  on public.profile_connections (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create index if not exists profile_connections_requester_idx
  on public.profile_connections (requester_id, status);

create index if not exists profile_connections_addressee_idx
  on public.profile_connections (addressee_id, status);

-- Allow connection alerts without dropping comment, interest, or page_follow.
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'notifications'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%type%'
  loop
    execute format('alter table public.notifications drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('comment', 'interest', 'page_follow', 'connection_request', 'connection_accept'));

create or replace function public.guard_profile_connection()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.requester_id = new.addressee_id then
      raise exception 'You cannot connect with yourself';
    end if;
    if new.status <> 'pending' then
      raise exception 'A new connection starts as a request';
    end if;
    return new;
  end if;

  if new.id is distinct from old.id
     or new.requester_id is distinct from old.requester_id
     or new.addressee_id is distinct from old.addressee_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Connection parties cannot change';
  end if;

  if old.status is distinct from 'pending' or new.status is distinct from 'accepted' then
    raise exception 'Only a pending request can be accepted';
  end if;

  return new;
end;
$$;

drop trigger if exists profile_connections_guard on public.profile_connections;
create trigger profile_connections_guard
  before insert or update on public.profile_connections
  for each row execute function public.guard_profile_connection();

create or replace function public.notify_on_connection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    insert into public.notifications (recipient_id, actor_id, type, entity_id)
    values (new.addressee_id, new.requester_id, 'connection_request', new.id);
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'accepted' then
    insert into public.notifications (recipient_id, actor_id, type, entity_id)
    values (new.requester_id, new.addressee_id, 'connection_accept', new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists profile_connections_notify on public.profile_connections;
create trigger profile_connections_notify
  after insert or update on public.profile_connections
  for each row execute function public.notify_on_connection();

grant select on public.profile_connections to anon, authenticated;
grant insert, update, delete on public.profile_connections to authenticated;

alter table public.profile_connections enable row level security;

drop policy if exists connections_select on public.profile_connections;
create policy connections_select on public.profile_connections
  for select using (true);

drop policy if exists connections_insert on public.profile_connections;
create policy connections_insert on public.profile_connections
  for insert to authenticated
  with check (requester_id = auth.uid() and status = 'pending');

drop policy if exists connections_update on public.profile_connections;
create policy connections_update on public.profile_connections
  for update to authenticated
  using (addressee_id = auth.uid() and status = 'pending')
  with check (addressee_id = auth.uid() and status = 'accepted');

drop policy if exists connections_delete on public.profile_connections;
create policy connections_delete on public.profile_connections
  for delete to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());
