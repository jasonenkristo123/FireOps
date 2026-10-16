-- Local completion slice. No official boundaries, scoring rules, scheduler or staff are seeded.
alter table public.teams
 add column row_version bigint not null default 1 check(row_version>0),
 add column base_latitude double precision,
 add column base_longitude double precision,
 add column base_source text,
 add column base_recorded_at timestamptz,
 add column base_location extensions.geography(Point,4326) generated always as
  (extensions.st_setsrid(extensions.st_makepoint(base_longitude,base_latitude),4326)::extensions.geography) stored,
 add constraint team_base_valid check (
  (base_latitude is null and base_longitude is null and base_source is null and base_recorded_at is null) or
  (base_latitude is not null and base_longitude is not null and base_source is not null and base_recorded_at is not null
   and base_latitude between -90 and 90 and base_longitude between -180 and 180
   and length(btrim(base_source)) between 3 and 500));

create function public.update_team_details(target uuid, expected_version bigint, payload jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare t public.teams; reason text:=btrim(payload->>'reason');
begin
 perform id from public.profiles where id=auth.uid() for share;
 select * into t from public.teams where id=target for update;
 if not found or not private.has_active_role(array['admin']::public.user_role[])
  or not exists(select 1 from public.districts d where d.id=t.district_id and public.can_access_district(d.code))
  then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if expected_version is null or expected_version<>t.row_version then raise exception 'VERSION_CONFLICT' using errcode='40001'; end if;
 if payload is null or jsonb_typeof(payload)<>'object' or reason is null or length(reason) not between 10 and 2000
  or payload->>'active' is null or payload->>'name' is null or payload->>'authority_type' is null
  or (payload->>'base_recorded_at')::timestamptz>now()+interval '5 minutes'
  then raise exception 'VALIDATION_ERROR' using errcode='22023'; end if;
 update public.teams set name=btrim(payload->>'name'),authority_type=btrim(payload->>'authority_type'),
  active=(payload->>'active')::boolean,base_latitude=(payload->>'base_latitude')::double precision,
  base_longitude=(payload->>'base_longitude')::double precision,base_source=nullif(btrim(payload->>'base_source'),''),
  base_recorded_at=(payload->>'base_recorded_at')::timestamptz,row_version=row_version+1 where id=target;
 insert into public.access_audit_logs(actor_id,subject_id,reason,before_state,after_state)
 values(auth.uid(),auth.uid(),reason,jsonb_build_object('team_id',t.id,'name',t.name,'active',t.active,'version',t.row_version),
  payload||jsonb_build_object('team_id',target,'version',t.row_version+1));
end $$;
revoke all on function public.update_team_details(uuid,bigint,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.update_team_details(uuid,bigint,jsonb) to authenticated;

-- Minimal scoped roster with derived straight-line base distance; no personal GPS location.
create function public.eligible_assignees(target uuid)
returns table(team_id uuid,team_name text,authority_type text,owner_id uuid,display_name text,
 availability text,availability_at timestamptz,distance_to_team_km double precision,base_source text,base_recorded_at timestamptz)
language sql stable security definer set search_path='' as $$
 select t.id,t.name,t.authority_type,p.id,p.display_name,m.availability,m.updated_at,
  extensions.st_distance(t.base_location,i.representative_location)/1000,t.base_source,t.base_recorded_at
 from public.incidents i join public.teams t on t.district_id=i.district_id and t.active
 join public.team_members m on m.team_id=t.id join public.profiles p on p.id=m.user_id
 join auth.users u on u.id=p.id join public.districts d on d.id=i.district_id
 join public.profile_district_grants g on g.user_id=p.id and g.district_code=d.code
 where i.id=target and private.incident_allowed(i.id)
  and private.has_active_role(array['coordinator','admin']::public.user_role[])
  and p.status='active' and p.role='field_officer' and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)
 order by t.name,p.display_name,p.id
$$;
revoke all on function public.eligible_assignees(uuid) from public,anon,authenticated,service_role;
grant execute on function public.eligible_assignees(uuid) to authenticated;

-- An officer report is evidence, never a satellite observation or an automatic verification.
create function public.create_report_incident(payload jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; district public.districts; actor uuid:=auth.uid();
begin
 perform id from public.profiles where id=actor for share;
 select * into district from public.districts where id=(payload->>'district_id')::uuid;
 if not found or not private.has_active_role(array['coordinator','admin']::public.user_role[])
  or not public.can_access_district(district.code) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if payload is null or jsonb_typeof(payload)<>'object' or payload->>'data_mode' is distinct from district.data_mode::text
  or payload->>'title' is null or length(btrim(payload->>'title')) not between 3 and 200
  or payload->>'body' is null or length(btrim(payload->>'body')) not between 10 and 2000
  or payload->>'source_label' is null or length(btrim(payload->>'source_label')) not between 3 and 300
  or payload->>'latitude' is null or payload->>'longitude' is null or payload->>'observed_at' is null
  or (payload->>'observed_at')::timestamptz>now()+interval '5 minutes'
  then raise exception 'VALIDATION_ERROR' using errcode='22023'; end if;
 insert into public.incidents(reference,title,description,latitude,longitude,district_id,data_mode,created_by)
 values('FO-'||upper(substr(gen_random_uuid()::text,1,8)),btrim(payload->>'title'),btrim(payload->>'body'),
  (payload->>'latitude')::double precision,(payload->>'longitude')::double precision,district.id,district.data_mode,actor)
 returning id into result;
 insert into public.reports(incident_id,author_id,body,observed_at,source_label)
 values(result,actor,btrim(payload->>'body'),(payload->>'observed_at')::timestamptz,btrim(payload->>'source_label'));
 insert into public.incident_events(incident_id,actor_id,event_type,note,new_value)
 values(result,actor,'created',btrim(payload->>'body'),jsonb_build_object('source_label',payload->>'source_label','origin','human_report'));
 return result;
end $$;
revoke all on function public.create_report_incident(jsonb) from public,anon,authenticated,service_role;
grant execute on function public.create_report_incident(jsonb) to authenticated;

-- Invoker functions preserve district/mode RLS; no public geography endpoint.
create function public.district_features(requested_mode public.data_mode)
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('type','FeatureCollection','features',coalesce(jsonb_agg(jsonb_build_object(
  'type','Feature','geometry',extensions.st_asgeojson(d.geometry)::jsonb,'properties',jsonb_build_object(
  'code',d.code,'name',d.name,'source',d.source,'license',d.license,'version',d.boundary_version,'mode',d.data_mode)) order by d.code),'[]'::jsonb))
 from public.districts d where d.data_mode=requested_mode
$$;
revoke all on function public.district_features(public.data_mode) from public,anon,authenticated,service_role;
grant execute on function public.district_features(public.data_mode) to authenticated;

create function public.operations_summary(requested_mode public.data_mode,since_at timestamptz default null,
 district_code text default '',feed_source text default '')
returns table(open_incidents bigint,confirmed_incidents bigint,information_needed bigint,not_confirmed_incidents bigint,
 high_priority_active bigint,active_assignments bigint,unassigned_active bigint,last_observation_at timestamptz)
language sql stable security invoker set search_path='' as $$
 with cases as (
 select i.* from public.incidents i join public.districts d on d.id=i.district_id
 where i.data_mode=requested_mode and (district_code='' or d.code=district_code)
  and (since_at is null or i.created_at>=since_at)
  and (feed_source='' or exists(select 1 from public.incident_observations l join public.hotspot_observations o
   on o.id=l.observation_id where l.incident_id=i.id and o.source=feed_source))
 )
 select count(*) filter(where current_status not in ('resolved','cancelled')),
 count(*) filter(where verification_status='confirmed'),count(*) filter(where verification_status='needs_more_information'),
 count(*) filter(where verification_status='not_confirmed'),
 count(*) filter(where final_priority in ('critical','high') and current_status not in ('resolved','cancelled')),
 count(*) filter(where exists(select 1 from public.assignments a where a.incident_id=cases.id and a.ended_at is null)),
 count(*) filter(where current_status not in ('resolved','cancelled') and not exists(select 1 from public.assignments a where a.incident_id=cases.id and a.ended_at is null)),
 (select max(o.detected_at) from public.hotspot_observations o join public.districts d on d.id=o.district_id
  where o.data_mode=requested_mode and (district_code='' or d.code=district_code)
   and (since_at is null or o.detected_at>=since_at) and (feed_source='' or o.source=feed_source))
 from cases
$$;
revoke all on function public.operations_summary(public.data_mode,timestamptz,text,text) from public,anon,authenticated,service_role;
grant execute on function public.operations_summary(public.data_mode,timestamptz,text,text) to authenticated;

create function public.ingestion_status(requested_mode public.data_mode)
returns table(id uuid,source text,status public.feed_status,started_at timestamptz,finished_at timestamptz,
 rows_seen bigint,rows_inserted bigint,rows_updated bigint,unmatched_observations bigint)
language sql stable security definer set search_path='' as $$
 select r.id,r.source,r.status,r.started_at,r.finished_at,r.rows_seen,r.rows_inserted,r.rows_updated,
 (select count(*) from public.hotspot_observations o where o.ingest_run_id=r.id and o.district_id is null)
 from public.ingest_runs r where r.data_mode=requested_mode
 and private.has_active_role(array['admin']::public.user_role[])
 and exists(select 1 from public.districts d where d.data_mode=requested_mode and public.can_access_district(d.code))
 order by r.started_at desc,r.id desc limit 30
$$;
revoke all on function public.ingestion_status(public.data_mode) from public,anon,authenticated,service_role;
grant execute on function public.ingestion_status(public.data_mode) to authenticated;

create index notifications_unread_idx on public.notifications(recipient_id,data_mode,created_at desc) where read_at is null;
create index incidents_created_filter_idx on public.incidents(data_mode,district_id,created_at desc);
notify pgrst,'reload schema';
