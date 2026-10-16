-- Human-operated workflows. No credentials, real boundaries, role bootstrap or approved scoring rules.
alter table public.incidents drop constraint incidents_verification_locked;
alter table public.incidents drop constraint incidents_priority_locked;
alter table public.incidents drop constraint incidents_workflow_locked;
alter table public.incidents add constraint recommendation_unapproved check (recommended_priority='unassessed' and priority_ruleset_version is null);

create table public.teams (
 id uuid primary key default gen_random_uuid(), name text not null check(length(btrim(name)) between 3 and 150),
 district_id uuid not null references public.districts(id), active boolean not null default true,
 authority_type text not null check(length(btrim(authority_type)) between 3 and 300), created_at timestamptz not null default now()
);
create index teams_district_idx on public.teams(district_id);
create table public.team_members (
 team_id uuid not null references public.teams(id), user_id uuid not null references public.profiles(id),
 availability text not null default 'unknown' check(availability in ('available','busy','unavailable','unknown')),
 updated_at timestamptz not null default now(), primary key(team_id,user_id)
);
create index team_members_user_idx on public.team_members(user_id);
create table public.assignments (
 id uuid primary key default gen_random_uuid(), incident_id uuid not null references public.incidents(id),
 team_id uuid not null references public.teams(id), owner_id uuid not null references public.profiles(id),
 assigned_by uuid not null references public.profiles(id), assigned_at timestamptz not null default now(), ended_at timestamptz,
 reason text not null check(length(btrim(reason)) between 10 and 2000)
);
create unique index assignments_one_active_idx on public.assignments(incident_id) where ended_at is null;
create index assignments_owner_idx on public.assignments(owner_id,ended_at);
create index assignments_team_idx on public.assignments(team_id);
create index assignments_actor_idx on public.assignments(assigned_by);
create table public.incident_events (
 id uuid primary key default gen_random_uuid(), incident_id uuid not null references public.incidents(id),
 actor_id uuid not null references public.profiles(id), event_type text not null, note text not null,
 previous_value jsonb not null default '{}'::jsonb, new_value jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index incident_events_timeline_idx on public.incident_events(incident_id,created_at,id);
create index incident_events_actor_idx on public.incident_events(actor_id);
create table public.verification_decisions (
 id uuid primary key default gen_random_uuid(), incident_id uuid not null references public.incidents(id),
 decision public.verification_status not null, reason text not null check(length(btrim(reason)) between 10 and 2000),
 actor_id uuid not null references public.profiles(id), decided_at timestamptz not null default now(),
 supersedes_id uuid references public.verification_decisions(id)
);
create index verification_incident_idx on public.verification_decisions(incident_id,decided_at);
create index verification_actor_idx on public.verification_decisions(actor_id);
create index verification_supersedes_idx on public.verification_decisions(supersedes_id);
create table public.priority_assessments (
 id uuid primary key default gen_random_uuid(), incident_id uuid not null references public.incidents(id),
 recommendation public.priority_level not null default 'unassessed', final_priority public.priority_level not null,
 severity text not null default 'unknown', urgency text not null default 'unknown', evidence_strength text not null default 'insufficient',
 data_freshness text not null default 'unknown', ruleset_version text not null default 'unapproved',
 override_reason text not null check(length(btrim(override_reason)) between 10 and 2000),
 actor_id uuid not null references public.profiles(id), assessed_at timestamptz not null default now(),
 check(recommendation='unassessed' and ruleset_version='unapproved')
);
create index priority_assessments_incident_idx on public.priority_assessments(incident_id,assessed_at);
create index priority_assessments_actor_idx on public.priority_assessments(actor_id);
create table public.reports (
 id uuid primary key default gen_random_uuid(), incident_id uuid not null references public.incidents(id),
 author_id uuid not null references public.profiles(id), body text not null check(length(btrim(body)) between 10 and 5000),
 observed_at timestamptz not null, submitted_at timestamptz not null default now(), source_label text not null default 'Laporan petugas'
);
create index reports_incident_idx on public.reports(incident_id,submitted_at);
create index reports_author_idx on public.reports(author_id);
create table public.evidence_files (
 id uuid primary key default gen_random_uuid(), incident_id uuid not null references public.incidents(id),
 uploaded_by uuid not null references public.profiles(id), storage_path text not null unique,
 mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp','application/pdf')),
 size_bytes bigint not null check(size_bytes between 1 and 5000000), description text not null check(length(btrim(description)) between 10 and 2000),
 captured_at timestamptz not null, created_at timestamptz not null default now()
);
create index evidence_files_incident_idx on public.evidence_files(incident_id);
create index evidence_files_actor_idx on public.evidence_files(uploaded_by);
create table public.notifications (
 id uuid primary key default gen_random_uuid(), recipient_id uuid not null references public.profiles(id),
 incident_id uuid not null references public.incidents(id), event_id uuid not null references public.incident_events(id),
 title text not null, data_mode public.data_mode not null, created_at timestamptz not null default now(), read_at timestamptz,
 unique(recipient_id,event_id)
);
create index notifications_recipient_idx on public.notifications(recipient_id,created_at desc);
create index notifications_incident_idx on public.notifications(incident_id);
create index notifications_event_idx on public.notifications(event_id);

create function private.incident_allowed(target uuid, writing boolean default false)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.incidents i join public.districts d on d.id=i.district_id
 where i.id=target and public.can_access_district(d.code) and (not writing or
 private.has_active_role(array['admin','coordinator']::public.user_role[]) or
 (private.has_active_role(array['field_officer']::public.user_role[]) and exists(select 1 from public.assignments a
 where a.incident_id=i.id and a.owner_id=(select auth.uid()) and a.ended_at is null))))
$$;
revoke all on function private.incident_allowed(uuid,boolean) from public,anon,authenticated,service_role;
grant execute on function private.incident_allowed(uuid,boolean) to authenticated;

do $$
declare t text;
begin
 foreach t in array array['teams','team_members','assignments','incident_events','verification_decisions','priority_assessments','reports','evidence_files','notifications'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
 execute format('grant select on public.%I to authenticated',t);
 end loop;
 foreach t in array array['assignments','incident_events','verification_decisions','priority_assessments','reports','evidence_files'] loop
 execute format('create policy scoped_read on public.%I for select to authenticated using (private.incident_allowed(incident_id))',t);
 end loop;
 foreach t in array array['incident_events','verification_decisions','priority_assessments','reports','evidence_files'] loop
 execute format('create trigger immutable before update or delete on public.%I for each row execute function private.reject_audit_mutation()',t);
 execute format('create trigger no_truncate before truncate on public.%I for each statement execute function private.reject_audit_mutation()',t);
 end loop;
end $$;
create policy teams_read on public.teams for select to authenticated using(exists(select 1 from public.districts d where d.id=district_id));
create policy members_read on public.team_members for select to authenticated using(exists(select 1 from public.teams t where t.id=team_id));
create policy notifications_read on public.notifications for select to authenticated using(recipient_id=(select auth.uid()) and private.incident_allowed(incident_id));
grant update(read_at) on public.notifications to authenticated;
create policy notifications_mark on public.notifications for update to authenticated using(recipient_id=(select auth.uid()) and private.incident_allowed(incident_id)) with check(recipient_id=(select auth.uid()) and private.incident_allowed(incident_id));

-- All mutations re-check verified identity, role AND catalogue grants. Serializes per incident.
create function public.mutate_incident(target uuid, expected_version bigint, operation text, payload jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare i public.incidents; actor uuid:=auth.uid(); reason text:=btrim(payload->>'reason');
 manager boolean; owner uuid; team uuid; ev uuid; decision public.verification_status; priority public.priority_level;
 next_status public.incident_status; prev_decision uuid;
begin
 if actor is null or payload is null or jsonb_typeof(payload)<>'object' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 perform id from public.profiles where id=actor for share;
 select * into i from public.incidents where id=target for update;
 if not found or not private.incident_allowed(target,true) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if expected_version is null or i.row_version<>expected_version then raise exception 'VERSION_CONFLICT' using errcode='40001'; end if;
 if reason is null or length(reason) not between 10 and 2000 then raise exception 'REASON_REQUIRED' using errcode='22023'; end if;
 manager:=private.has_active_role(array['coordinator','admin']::public.user_role[]);
 if operation in ('verify','priority','assign','link') and not manager then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if operation='verify' then
  decision:=(payload->>'decision')::public.verification_status;
  if decision is null then raise exception 'INVALID_DECISION' using errcode='22023'; end if;
  select id into prev_decision from public.verification_decisions where incident_id=target order by decided_at desc,id desc limit 1;
  insert into public.verification_decisions(incident_id,decision,reason,actor_id,supersedes_id) values(target,decision,reason,actor,prev_decision);
  update public.incidents set verification_status=decision where id=target;
 elsif operation='priority' then
  priority:=(payload->>'priority')::public.priority_level;
  if priority is null then raise exception 'INVALID_PRIORITY' using errcode='22023'; end if;
  insert into public.priority_assessments(incident_id,final_priority,override_reason,actor_id) values(target,priority,reason,actor);
  update public.incidents set final_priority=priority,priority_reason=reason where id=target;
 elsif operation='assign' then
  owner:=(payload->>'owner_id')::uuid; team:=(payload->>'team_id')::uuid;
  perform id from public.profiles where id=owner for share;
  if i.current_status in ('resolved','cancelled') or not exists(select 1 from public.team_members m
   join public.teams t on t.id=m.team_id join public.profiles p on p.id=m.user_id
   join auth.users u on u.id=p.id join public.districts d on d.id=t.district_id
   join public.profile_district_grants g on g.user_id=p.id and g.district_code=d.code
   where m.team_id=team and m.user_id=owner and t.active and t.district_id=i.district_id
   and m.availability='available' and p.status='active' and p.role='field_officer'
   and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)) then
   raise exception 'INELIGIBLE_OWNER' using errcode='22023';
  end if;
  update public.assignments set ended_at=now() where incident_id=target and ended_at is null;
  insert into public.assignments(incident_id,team_id,owner_id,assigned_by,reason) values(target,team,owner,actor,reason);
  update public.incidents set current_status='assigned' where id=target;
 elsif operation='status' then
  next_status:=(payload->>'status')::public.incident_status;
  if next_status is null or not (
   (i.current_status='new' and next_status in ('triaging','cancelled') and manager) or
   (i.current_status='triaging' and next_status='cancelled' and manager) or
   (i.current_status='assigned' and next_status in ('in_progress','cancelled')) or
   (i.current_status='in_progress' and next_status in ('monitoring','resolved','cancelled')) or
   (i.current_status='monitoring' and next_status in ('in_progress','resolved','cancelled')) or
   (i.current_status in ('resolved','cancelled') and next_status='triaging' and manager)
  ) or (next_status='cancelled' and not manager) then raise exception 'INVALID_TRANSITION' using errcode='22023'; end if;
  update public.incidents set current_status=next_status where id=target;
  if next_status in ('resolved','cancelled') then update public.assignments set ended_at=now() where incident_id=target and ended_at is null; end if;
 elsif operation='report' then
  if (payload->>'observed_at')::timestamptz is null or (payload->>'observed_at')::timestamptz>now()+interval '5 minutes' then raise exception 'INVALID_TIME' using errcode='22023'; end if;
  insert into public.reports(incident_id,author_id,body,observed_at) values(target,actor,reason,(payload->>'observed_at')::timestamptz);
  update public.incidents set updated_at=now() where id=target;
 elsif operation='evidence' then
  if not exists(select 1 from storage.objects o where o.bucket_id='incident-evidence' and o.name=payload->>'storage_path'
   and o.owner_id=actor::text and split_part(o.name,'/',1)=i.data_mode::text and split_part(o.name,'/',2)=target::text)
   or (payload->>'captured_at')::timestamptz is null or (payload->>'captured_at')::timestamptz>now()+interval '5 minutes' then raise exception 'INVALID_EVIDENCE' using errcode='22023'; end if;
  insert into public.evidence_files(incident_id,uploaded_by,storage_path,mime_type,size_bytes,description,captured_at)
   values(target,actor,payload->>'storage_path',payload->>'mime_type',(payload->>'size_bytes')::bigint,reason,(payload->>'captured_at')::timestamptz);
  update public.incidents set updated_at=now() where id=target;
 elsif operation='link' then
  if not exists(select 1 from public.hotspot_observations o where o.id=(payload->>'observation_id')::uuid and o.data_mode=i.data_mode and o.district_id=i.district_id) then raise exception 'INVALID_OBSERVATION' using errcode='22023'; end if;
  insert into public.incident_observations(incident_id,observation_id,data_mode,linked_by) values(target,(payload->>'observation_id')::uuid,i.data_mode,actor);
  update public.incidents set updated_at=now() where id=target;
 else raise exception 'INVALID_OPERATION' using errcode='22023';
 end if;
 insert into public.incident_events(incident_id,actor_id,event_type,note,previous_value,new_value)
 values(target,actor,operation,reason,jsonb_build_object('verification',i.verification_status,'priority',i.final_priority,'status',i.current_status,'version',i.row_version),payload) returning id into ev;
 -- Demo notifications stay explicitly demo and never enter operational live counts.
 insert into public.notifications(recipient_id,incident_id,event_id,title,data_mode)
 select distinct a.owner_id,target,ev,'Pembaruan insiden: '||i.reference,i.data_mode from public.assignments a
 where a.incident_id=target and a.ended_at is null and a.owner_id<>actor;
 insert into public.notifications(recipient_id,incident_id,event_id,title,data_mode)
 select distinct g.user_id,target,ev,'Pembaruan insiden: '||i.reference,i.data_mode from public.profile_district_grants g
 join public.districts d on d.code=g.district_code join public.profiles p on p.id=g.user_id
 where d.id=i.district_id and p.role in ('coordinator','admin') and p.status='active' and p.id<>actor on conflict do nothing;
 return target;
end $$;
revoke all on function public.mutate_incident(uuid,bigint,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.mutate_incident(uuid,bigint,text,jsonb) to authenticated;

create function public.create_incident(observation uuid, incident_title text, reason text)
returns uuid language plpgsql security definer set search_path='' as $$
declare o public.hotspot_observations; result uuid;
begin
 perform id from public.profiles where id=auth.uid() for share;
 select * into o from public.hotspot_observations where id=observation;
 if not private.has_active_role(array['coordinator','admin']::public.user_role[]) or not exists(select 1 from public.districts d where d.id=o.district_id and public.can_access_district(d.code)) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if incident_title is null or length(btrim(incident_title)) not between 3 and 200 or reason is null or length(btrim(reason)) not between 10 and 2000 then raise exception 'VALIDATION_ERROR' using errcode='22023'; end if;
 insert into public.incidents(reference,title,description,latitude,longitude,district_id,data_mode,created_by)
 values('FO-'||upper(substr(gen_random_uuid()::text,1,8)),btrim(incident_title),btrim(reason),o.latitude,o.longitude,o.district_id,o.data_mode,auth.uid()) returning id into result;
 insert into public.incident_observations(incident_id,observation_id,data_mode,linked_by) values(result,o.id,o.data_mode,auth.uid());
 insert into public.incident_events(incident_id,actor_id,event_type,note) values(result,auth.uid(),'created',reason);
 return result;
end $$;
revoke all on function public.create_incident(uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.create_incident(uuid,text,text) to authenticated;

-- Expose minimal roster, never auth email or private profile fields.
create function public.staff_roster()
returns table(user_id uuid,display_name text,role public.user_role,district_code text)
language sql stable security definer set search_path='' as $$
 select p.id,p.display_name,p.role,g.district_code from public.profiles p
 join public.profile_district_grants g on g.user_id=p.id join auth.users u on u.id=p.id
 where public.can_access_district(g.district_code) and p.status='active' and p.role in ('field_officer','coordinator','admin')
 and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)
 and private.has_active_role(array['coordinator','admin']::public.user_role[])
$$;
revoke all on function public.staff_roster() from public,anon,authenticated,service_role;
grant execute on function public.staff_roster() to authenticated;

create function public.manage_team(team_name text, district uuid, authority text, member uuid, availability_value text, target_team uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 perform id from public.profiles where id in (auth.uid(),member) order by id for share;
 if not private.has_active_role(array['admin']::public.user_role[]) or not exists(select 1 from public.districts d where d.id=district and public.can_access_district(d.code)) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if not exists(select 1 from public.profiles p join public.profile_district_grants g on g.user_id=p.id join public.districts d on d.code=g.district_code join auth.users u on u.id=p.id where p.id=member and p.status='active' and p.role='field_officer' and d.id=district and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)) then raise exception 'INELIGIBLE_OWNER' using errcode='22023'; end if;
 if target_team is null then
 insert into public.teams(name,district_id,authority_type) values(btrim(team_name),district,btrim(authority)) returning id into result;
 else select id into result from public.teams where id=target_team and district_id=district for update;
 if result is null then raise exception 'INVALID_TEAM' using errcode='22023'; end if;
 end if;
 insert into public.team_members(team_id,user_id,availability) values(result,member,availability_value)
 on conflict(team_id,user_id) do update set availability=excluded.availability,updated_at=now();
 insert into public.access_audit_logs(actor_id,subject_id,reason,before_state,after_state)
 values(auth.uid(),member,'Pengelolaan tim: '||coalesce(team_name,result::text),'{}',jsonb_build_object('team_id',result,'district_id',district,'availability',availability_value));
 return result;
end $$;
revoke all on function public.manage_team(text,uuid,text,uuid,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.manage_team(text,uuid,text,uuid,text,uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('incident-evidence','incident-evidence',false,5000000,array['image/jpeg','image/png','image/webp','application/pdf']);
create policy evidence_upload on storage.objects for insert to authenticated with check(bucket_id='incident-evidence' and exists(select 1 from public.incidents i where i.id::text=split_part(name,'/',2) and i.data_mode::text=split_part(name,'/',1) and private.incident_allowed(i.id,true)));
create policy evidence_download on storage.objects for select to authenticated using(bucket_id='incident-evidence' and exists(select 1 from public.evidence_files e where e.storage_path=name and private.incident_allowed(e.incident_id)));
-- Orphan cleanup only, never deletion of registered evidence.
create policy evidence_orphan_cleanup on storage.objects for delete to authenticated using(bucket_id='incident-evidence' and owner_id=(select auth.uid())::text and not exists(select 1 from public.evidence_files e where e.storage_path=name));

-- Only sanitized feed health is exposed, scoped to active users with a matching mode grant.
create function public.feed_health(requested_mode public.data_mode)
returns table(source text,status public.feed_status,started_at timestamptz,finished_at timestamptz,last_successful_sync_at timestamptz)
language sql stable security definer set search_path='' as $$
 select r.source,r.status,r.started_at,r.finished_at,(select max(s.finished_at) from public.ingest_runs s where s.source=r.source and s.data_mode=requested_mode and s.status='success')
 from public.ingest_runs r where r.data_mode=requested_mode and exists(select 1 from public.districts d where d.data_mode=requested_mode and public.can_access_district(d.code))
 order by r.started_at desc limit 10
$$;
revoke all on function public.feed_health(public.data_mode) from public,anon,authenticated,service_role;
grant execute on function public.feed_health(public.data_mode) to authenticated;
