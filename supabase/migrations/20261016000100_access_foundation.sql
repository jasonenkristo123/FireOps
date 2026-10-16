-- Phase 1 only. No operational observations, incidents or geographic fixtures.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create type public.user_role as enum ('pending', 'viewer', 'field_officer', 'coordinator', 'admin');
create type public.account_status as enum ('pending', 'active', 'suspended');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  display_name text not null default '' check (length(display_name) <= 100),
  role public.user_role not null default 'pending',
  status public.account_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pending_role_is_restricted check (role <> 'pending' or status <> 'active')
);

-- Codes will reference the approved district catalogue in Phase 2. No invented polygons.
create table public.profile_district_grants (
  user_id uuid not null references public.profiles(id) on delete restrict,
  district_code text not null check (length(btrim(district_code)) between 1 and 32),
  granted_by uuid not null references public.profiles(id),
  granted_at timestamptz not null default now(),
  primary key (user_id, district_code)
);
create index profile_district_grants_granted_by_idx on public.profile_district_grants(granted_by);

create table public.access_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id),
  subject_id uuid not null references public.profiles(id),
  reason text not null check (length(btrim(reason)) between 10 and 2000),
  before_state jsonb not null,
  after_state jsonb not null,
  created_at timestamptz not null default now()
);
create index access_audit_logs_actor_idx on public.access_audit_logs(actor_id, created_at);
create index access_audit_logs_subject_idx on public.access_audit_logs(subject_id, created_at);

alter table public.profiles enable row level security;
alter table public.profile_district_grants enable row level security;
alter table public.access_audit_logs enable row level security;

revoke all on public.profiles, public.profile_district_grants, public.access_audit_logs from public, anon, authenticated, service_role;
grant select on public.profiles, public.profile_district_grants, public.access_audit_logs to authenticated;
grant update (display_name) on public.profiles to authenticated;

-- Do not read roles, status or district grants from user-controlled metadata/JWTs.
create function private.has_active_role(allowed_roles public.user_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p join auth.users u on u.id = p.id
    where p.id = (select auth.uid()) and p.status = 'active'
      and p.role = any(allowed_roles) and u.email_confirmed_at is not null
      and coalesce(u.is_anonymous, false) = false
  );
$$;
revoke all on function private.has_active_role(public.user_role[]) from public, anon, authenticated, service_role;
grant execute on function private.has_active_role(public.user_role[]) to authenticated;

create function public.can_access_district(requested_code text)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_active_role(array['viewer','field_officer','coordinator','admin']::public.user_role[])
    and exists (select 1 from public.profile_district_grants
      where user_id = (select auth.uid()) and district_code = requested_code);
$$;
revoke all on function public.can_access_district(text) from public, anon, authenticated, service_role;
grant execute on function public.can_access_district(text) to authenticated;

create policy profiles_read on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.has_active_role(array['admin']::public.user_role[])));
create policy profiles_update_name on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy district_grants_read on public.profile_district_grants for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_active_role(array['admin']::public.user_role[])));
create policy access_audit_read on public.access_audit_logs for select to authenticated
  using ((select private.has_active_role(array['admin']::public.user_role[])));

create function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated, service_role;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

create function private.touch_profile()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.touch_profile() from public, anon, authenticated, service_role;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.touch_profile();

-- Only this audited, atomic path can approve/revoke accounts via the Data API.
-- Bootstrap of the first administrator is a separate reviewed operator operation.
create function public.set_account_access(
  target_user_id uuid,
  new_role public.user_role,
  new_status public.account_status,
  district_codes text[],
  reason text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  previous_profile public.profiles;
  previous_districts text[];
begin
  if actor is null or actor = target_user_id then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  -- Serialize actor/subject changes so concurrent revocation cannot bypass authorization.
  perform id from public.profiles where id in (actor, target_user_id) order by id for update;
  if not private.has_active_role(array['admin']::public.user_role[]) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if reason is null or length(btrim(reason)) not between 10 and 2000
    or district_codes is null or cardinality(district_codes) > 100
    or exists (select 1 from unnest(district_codes) c where c is null or length(btrim(c)) not between 1 and 32)
    or new_role is null or new_status is null
    or (new_role = 'pending' and new_status = 'active') then
    raise exception 'VALIDATION_ERROR' using errcode = '22023';
  end if;
  select * into previous_profile from public.profiles where id = target_user_id;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if new_status = 'active' and not exists (
    select 1 from auth.users where id = target_user_id and email_confirmed_at is not null
      and coalesce(is_anonymous, false) = false
  ) then raise exception 'UNVERIFIED_ACCOUNT' using errcode = '22023'; end if;
  select coalesce(array_agg(district_code order by district_code), '{}'::text[]) into previous_districts
    from public.profile_district_grants where user_id = target_user_id;
  update public.profiles set role = new_role, status = new_status where id = target_user_id;
  delete from public.profile_district_grants where user_id = target_user_id;
  insert into public.profile_district_grants(user_id, district_code, granted_by)
    select target_user_id, btrim(c), actor from unnest(district_codes) c group by btrim(c);
  insert into public.access_audit_logs(actor_id, subject_id, reason, before_state, after_state)
    values (actor, target_user_id, btrim(reason),
      jsonb_build_object('role', previous_profile.role, 'status', previous_profile.status, 'district_codes', previous_districts),
      jsonb_build_object('role', new_role, 'status', new_status, 'district_codes',
        (select coalesce(jsonb_agg(district_code order by district_code), '[]'::jsonb)
          from public.profile_district_grants where user_id = target_user_id)));
end;
$$;
revoke all on function public.set_account_access(uuid, public.user_role, public.account_status, text[], text) from public, anon, authenticated, service_role;
grant execute on function public.set_account_access(uuid, public.user_role, public.account_status, text[], text) to authenticated;

create function private.reject_audit_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'APPEND_ONLY' using errcode = '42501';
end;
$$;
revoke all on function private.reject_audit_mutation() from public, anon, authenticated, service_role;
create trigger access_audit_immutable before update or delete on public.access_audit_logs
  for each row execute function private.reject_audit_mutation();
