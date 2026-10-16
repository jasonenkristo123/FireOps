-- Phase 2 database slice. No official geography or live observations are seeded.
create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_extension e join pg_catalog.pg_namespace n on n.oid=e.extnamespace
    where e.extname='postgis' and n.nspname='extensions'
  ) then
    raise exception 'POSTGIS_SCHEMA_REVIEW_REQUIRED';
  end if;
end;
$$;

create type public.data_mode as enum ('demo', 'live');
create type public.verification_status as enum ('confirmed', 'not_confirmed', 'needs_more_information');
create type public.priority_level as enum ('critical', 'high', 'medium', 'low', 'unassessed');
create type public.incident_status as enum ('new', 'triaging', 'assigned', 'in_progress', 'monitoring', 'resolved', 'cancelled');
create type public.feed_status as enum ('running', 'success', 'partial', 'failed');

create table public.districts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (length(btrim(code)) between 1 and 32),
  province_code text not null check (length(btrim(province_code)) between 1 and 32),
  name text not null check (length(btrim(name)) between 1 and 200),
  geometry extensions.geometry(MultiPolygon,4326) not null,
  source text not null check (length(btrim(source)) between 1 and 500),
  source_url text,
  license text not null check (length(btrim(license)) between 1 and 500),
  boundary_version text not null check (length(btrim(boundary_version)) between 1 and 100),
  data_mode public.data_mode not null,
  approved_by uuid references public.profiles(id) on delete restrict,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, data_mode),
  check (extensions.st_isvalid(geometry) and not extensions.st_isempty(geometry)),
  check (extensions.st_xmin(geometry::extensions.box3d) >= -180
     and extensions.st_xmax(geometry::extensions.box3d) <= 180
     and extensions.st_ymin(geometry::extensions.box3d) >= -90
     and extensions.st_ymax(geometry::extensions.box3d) <= 90),
  check (data_mode = 'demo' or (approved_by is not null and approved_at is not null))
);
create index districts_geometry_idx on public.districts using gist (geometry);
create index districts_approved_by_idx on public.districts(approved_by);

-- Enforce new grants immediately; preserve existing strings without inventing a catalogue.
-- Reconcile legacy grants with approved districts, then VALIDATE in a reviewed follow-up.
alter table public.profile_district_grants add constraint profile_district_grants_district_fkey
  foreign key (district_code) references public.districts(code) on delete restrict not valid;
create index profile_district_grants_district_idx on public.profile_district_grants(district_code);

-- Also fail closed for old grants that have no catalogue record.
create or replace function public.can_access_district(requested_code text)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_active_role(array['viewer','field_officer','coordinator','admin']::public.user_role[])
    and exists (
      select 1 from public.profile_district_grants g join public.districts d on d.code=g.district_code
      where g.user_id=(select auth.uid()) and d.code=requested_code
    );
$$;
revoke all on function public.can_access_district(text) from public, anon, authenticated, service_role;
grant execute on function public.can_access_district(text) to authenticated;

create table public.ingest_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null check (length(btrim(source)) between 1 and 100),
  data_mode public.data_mode not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status public.feed_status not null default 'running',
  rows_seen bigint not null default 0 check (rows_seen >= 0),
  rows_inserted bigint not null default 0 check (rows_inserted >= 0),
  rows_updated bigint not null default 0 check (rows_updated >= 0),
  error_summary text check (length(error_summary) <= 2000),
  source_window_start timestamptz not null,
  source_window_end timestamptz not null,
  unique (id, data_mode, source),
  check (source_window_end >= source_window_start),
  check ((status='running' and finished_at is null)
     or (status<>'running' and finished_at is not null and finished_at >= started_at)),
  check (rows_inserted + rows_updated <= rows_seen)
);
create index ingest_runs_health_idx on public.ingest_runs(data_mode, source, finished_at desc)
  where status='success';

create table public.hotspot_observations (
  id uuid primary key default gen_random_uuid(),
  observation_key text not null check (length(btrim(observation_key)) between 1 and 500),
  source text not null check (length(btrim(source)) between 1 and 100),
  satellite text not null check (length(btrim(satellite)) between 1 and 100),
  instrument text not null check (length(btrim(instrument)) between 1 and 100),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  geom extensions.geography(Point,4326) generated always as
    (extensions.st_setsrid(extensions.st_makepoint(longitude,latitude),4326)::extensions.geography) stored,
  detected_at timestamptz not null,
  received_at timestamptz not null default now(),
  confidence_raw text,
  confidence_kind text,
  frp double precision check (frp >= 0 and frp < 'Infinity'::double precision),
  brightness double precision check (brightness > 0 and brightness < 'Infinity'::double precision),
  raw_payload jsonb not null check (jsonb_typeof(raw_payload)='object'),
  district_id uuid,
  data_mode public.data_mode not null,
  ingest_run_id uuid,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (data_mode, observation_key),
  unique (id, data_mode),
  foreign key (district_id, data_mode) references public.districts(id, data_mode) on delete restrict,
  foreign key (ingest_run_id, data_mode, source) references public.ingest_runs(id, data_mode, source) on delete restrict,
  check (last_seen_at >= received_at)
);
create index hotspot_observations_geom_idx on public.hotspot_observations using gist (geom);
create index hotspot_observations_filter_idx on public.hotspot_observations(data_mode, district_id, detected_at desc, source);
create index hotspot_observations_district_idx on public.hotspot_observations(district_id, data_mode);
create index hotspot_observations_ingest_run_idx on public.hotspot_observations(ingest_run_id, data_mode, source);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  reference text not null check (length(btrim(reference)) between 1 and 100),
  title text not null check (length(btrim(title)) between 1 and 200),
  description text not null default '' check (length(description) <= 10000),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  representative_location extensions.geography(Point,4326) generated always as
    (extensions.st_setsrid(extensions.st_makepoint(longitude,latitude),4326)::extensions.geography) stored,
  district_id uuid not null,
  data_mode public.data_mode not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  verification_status public.verification_status not null default 'needs_more_information',
  current_status public.incident_status not null default 'new',
  recommended_priority public.priority_level not null default 'unassessed',
  final_priority public.priority_level not null default 'unassessed',
  priority_reason text,
  priority_ruleset_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  row_version bigint not null default 1 check (row_version > 0),
  unique (data_mode, reference),
  unique (id, data_mode),
  foreign key (district_id, data_mode) references public.districts(id, data_mode) on delete restrict,
  -- These projections stay locked until authorized, audited workflow RPCs exist.
  constraint incidents_verification_locked check (verification_status='needs_more_information'),
  constraint incidents_priority_locked check (recommended_priority='unassessed' and final_priority='unassessed'
    and priority_reason is null and priority_ruleset_version is null),
  constraint incidents_workflow_locked check (current_status='new')
);
create index incidents_location_idx on public.incidents using gist (representative_location);
create index incidents_filter_idx on public.incidents(data_mode, district_id, current_status, final_priority, updated_at desc);
create index incidents_district_idx on public.incidents(district_id, data_mode);
create index incidents_created_by_idx on public.incidents(created_by);

create table public.incident_observations (
  incident_id uuid not null,
  observation_id uuid not null,
  data_mode public.data_mode not null,
  linked_by uuid not null references public.profiles(id) on delete restrict,
  linked_at timestamptz not null default now(),
  primary key (incident_id, observation_id),
  foreign key (incident_id, data_mode) references public.incidents(id, data_mode) on delete restrict,
  foreign key (observation_id, data_mode) references public.hotspot_observations(id, data_mode) on delete restrict
);
create index incident_observations_observation_idx on public.incident_observations(observation_id, data_mode);
create index incident_observations_linked_by_idx on public.incident_observations(linked_by);

alter table public.districts enable row level security;
alter table public.ingest_runs enable row level security;
alter table public.hotspot_observations enable row level security;
alter table public.incidents enable row level security;
alter table public.incident_observations enable row level security;
revoke all on public.districts, public.ingest_runs, public.hotspot_observations,
  public.incidents, public.incident_observations from public, anon, authenticated, service_role;
grant select on public.districts, public.hotspot_observations, public.incidents, public.incident_observations to authenticated;
-- Trusted ingestion can persist observations and sync health, never incidents or decisions.
grant select on public.districts to service_role;
grant select, insert, update on public.ingest_runs, public.hotspot_observations to service_role;

create policy districts_scoped_read on public.districts for select to authenticated
  using (public.can_access_district(code));
create policy observations_scoped_read on public.hotspot_observations for select to authenticated
  using (exists (select 1 from public.districts d where d.id=district_id and d.data_mode=hotspot_observations.data_mode));
create policy incidents_scoped_read on public.incidents for select to authenticated
  using (exists (select 1 from public.districts d where d.id=district_id and d.data_mode=incidents.data_mode));
create policy incident_observations_scoped_read on public.incident_observations for select to authenticated
  using (exists (select 1 from public.incidents i where i.id=incident_id and i.data_mode=incident_observations.data_mode)
     and exists (select 1 from public.hotspot_observations o where o.id=observation_id and o.data_mode=incident_observations.data_mode));
-- No end-user ingest_runs policy: scoped health projections are a later ingestion slice.

create function private.check_point_district()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.district_id is not null and not exists (
    select 1 from public.districts d where d.id=new.district_id and d.data_mode=new.data_mode
      and extensions.st_covers(d.geometry,extensions.st_setsrid(extensions.st_makepoint(new.longitude,new.latitude),4326))
  ) then raise exception 'DISTRICT_POINT_MISMATCH' using errcode='23514'; end if;
  return new;
end;
$$;
revoke all on function private.check_point_district() from public, anon, authenticated, service_role;
create trigger observation_district_guard before insert or update on public.hotspot_observations
  for each row execute function private.check_point_district();
create trigger incident_district_guard before insert or update on public.incidents
  for each row execute function private.check_point_district();

create function private.touch_incident()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.row_version := old.row_version + 1;
  return new;
end;
$$;
revoke all on function private.touch_incident() from public, anon, authenticated, service_role;
create trigger incidents_updated_at before update on public.incidents
  for each row execute function private.touch_incident();

-- Invoker security preserves RLS. Return ALL matches, including shared borders;
-- ingestion must leave ambiguous/unmatched points unassigned, never guess a district.
create function public.districts_for_point(latitude double precision, longitude double precision, requested_mode public.data_mode)
returns table (district_id uuid, district_code text)
language plpgsql stable security invoker set search_path = '' as $$
begin
  if latitude is null or longitude is null or requested_mode is null
    or not (latitude between -90 and 90) or not (longitude between -180 and 180) then
    raise exception 'INVALID_COORDINATES_OR_MODE' using errcode='22023';
  end if;
  return query select d.id,d.code from public.districts d
    where d.data_mode=requested_mode and extensions.st_covers(d.geometry,
      extensions.st_setsrid(extensions.st_makepoint(longitude,latitude),4326)) order by d.code;
end;
$$;
revoke all on function public.districts_for_point(double precision,double precision,public.data_mode) from public, anon, authenticated, service_role;
grant execute on function public.districts_for_point(double precision,double precision,public.data_mode) to authenticated, service_role;
