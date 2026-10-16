-- Follow-up: stable decision supersession, structured manual assessment inputs and reassignment recipients.
alter table public.verification_decisions add column incident_version bigint;
-- Existing decisions retain their original timestamps; deterministic legacy sequence only.
alter table public.verification_decisions disable trigger immutable;
with versions as (select id,row_number() over(partition by incident_id order by decided_at,id) n from public.verification_decisions)
update public.verification_decisions d set incident_version=v.n from versions v where v.id=d.id;
alter table public.verification_decisions enable trigger immutable;
alter table public.verification_decisions alter column incident_version set not null;
create unique index verification_incident_version_idx on public.verification_decisions(incident_id,incident_version);
alter table public.priority_assessments add constraint manual_inputs_valid check(
 severity in ('unknown','low','medium','high') and urgency in ('unknown','low','medium','high') and
 evidence_strength in ('insufficient','partial','strong') and data_freshness in ('unknown','fresh','aging','stale'));

create or replace function public.mutate_incident(target uuid, expected_version bigint, operation text, payload jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare i public.incidents; actor uuid:=auth.uid(); reason text:=btrim(payload->>'reason');
 manager boolean; owner uuid; previous_owner uuid; team uuid; ev uuid; decision public.verification_status; priority public.priority_level;
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
  select id into prev_decision from public.verification_decisions where incident_id=target order by incident_version desc limit 1;
  insert into public.verification_decisions(incident_id,decision,reason,actor_id,supersedes_id,incident_version) values(target,decision,reason,actor,prev_decision,i.row_version+1);
  update public.incidents set verification_status=decision where id=target;
 elsif operation='priority' then
  priority:=(payload->>'priority')::public.priority_level;
  if priority is null then raise exception 'INVALID_PRIORITY' using errcode='22023'; end if;
  insert into public.priority_assessments(incident_id,final_priority,override_reason,actor_id,severity,urgency,evidence_strength,data_freshness)
  values(target,priority,reason,actor,coalesce(payload->>'severity','unknown'),coalesce(payload->>'urgency','unknown'),coalesce(payload->>'evidence_strength','insufficient'),coalesce(payload->>'data_freshness','unknown'));
  update public.incidents set final_priority=priority,priority_reason=reason where id=target;
 elsif operation='assign' then
  select owner_id into previous_owner from public.assignments where incident_id=target and ended_at is null;
  owner:=(payload->>'owner_id')::uuid; team:=(payload->>'team_id')::uuid;
  perform id from public.profiles where id=owner for share;
  perform m.user_id from public.team_members m join public.teams t on t.id=m.team_id where m.user_id=owner and m.team_id=team for share of m,t;
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
 if previous_owner is not null and previous_owner<>actor then
 insert into public.notifications(recipient_id,incident_id,event_id,title,data_mode) values(previous_owner,target,ev,'Pengalihan insiden: '||i.reference,i.data_mode) on conflict do nothing;
 end if;
 insert into public.notifications(recipient_id,incident_id,event_id,title,data_mode)
 select distinct g.user_id,target,ev,'Pembaruan insiden: '||i.reference,i.data_mode from public.profile_district_grants g
 join public.districts d on d.code=g.district_code join public.profiles p on p.id=g.user_id
 where d.id=i.district_id and p.role in ('coordinator','admin') and p.status='active' and p.id<>actor on conflict do nothing;
 return target;
end $$;
