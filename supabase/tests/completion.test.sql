begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
-- Transaction-scoped synthetic geometry/accounts only; no NASA or official boundaries.
insert into public.districts(code,province_code,name,geometry,source,license,boundary_version,data_mode)
values('COMPLETE-A','TEST','DEMO completion square A',extensions.st_geomfromtext('MULTIPOLYGON(((0 0,2 0,2 2,0 2,0 0)))',4326),'Synthetic completion fixture','Synthetic test only','test-v1','demo'),
('COMPLETE-B','TEST','DEMO completion square B',extensions.st_geomfromtext('MULTIPOLYGON(((2 0,4 0,4 2,2 2,2 0)))',4326),'Synthetic completion fixture','Synthetic test only','test-v1','demo');
insert into auth.users(id,email,email_confirmed_at)
select ('33333333-3333-4333-8333-'||lpad(n::text,12,'0'))::uuid,'completion-'||n||'@example.test',case when n=9 then null else now() end from generate_series(1,9) n;
update public.profiles set role=case right(id::text,1) when '2' then 'field_officer'::public.user_role when '3' then 'viewer'::public.user_role when '4' then 'admin'::public.user_role when '5' then 'pending'::public.user_role else 'coordinator'::public.user_role end,
status=case right(id::text,1) when '5' then 'pending'::public.account_status when '7' then 'suspended'::public.account_status else 'active'::public.account_status end
where id::text like '33333333-%';
update auth.users set is_anonymous=true where id='33333333-3333-4333-8333-000000000008';
insert into public.profile_district_grants(user_id,district_code,granted_by)
select id,case right(id::text,1) when '6' then 'COMPLETE-B' else 'COMPLETE-A' end,'33333333-3333-4333-8333-000000000004' from public.profiles where id::text like '33333333-%';
insert into public.teams(id,name,district_id,authority_type)
select 'eeeeeeee-eeee-4eee-8eee-000000000008','Synthetic completion team',id,'Synthetic completion mandate' from public.districts where code='COMPLETE-A';
insert into public.team_members(team_id,user_id,availability) values('eeeeeeee-eeee-4eee-8eee-000000000008','33333333-3333-4333-8333-000000000002','available');
select set_config('test.payload',jsonb_build_object('title','Synthetic report-only incident','body','Synthetic field report; not a real fire or NASA observation',
 'district_id',(select id from public.districts where code='COMPLETE-A'),'latitude',1.01,'longitude',1.01,'data_mode','demo','source_label','Synthetic radio report','observed_at',now())::text,true);
set local role anon;
select throws_ok($$select public.create_report_incident(current_setting('test.payload')::jsonb)$$,'42501',null,'anon cannot open human report case');
select throws_ok($$select public.district_features('demo')$$,'42501',null,'anon cannot read geometry projection');
select throws_ok($$select public.operations_summary('demo')$$,'42501',null,'anon cannot read summary');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-000000000005',true);
select throws_ok($$select public.create_report_incident(current_setting('test.payload')::jsonb)$$,'42501',null,'pending cannot open report case');
select is(jsonb_array_length(public.district_features('demo')->'features'),0,'pending receives no geometry');
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-000000000003',true);
select throws_ok($$select public.create_report_incident(current_setting('test.payload')::jsonb)$$,'42501',null,'viewer cannot open report case');
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-000000000002',true);
select throws_ok($$select public.create_report_incident(current_setting('test.payload')::jsonb)$$,'42501',null,'field officer cannot bypass coordinator creation authority');
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-000000000006',true);
select throws_ok($$select public.create_report_incident(current_setting('test.payload')::jsonb)$$,'42501',null,'out-of-area coordinator denied report creation');
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-000000000007',true);
select throws_ok($$select public.create_report_incident(current_setting('test.payload')::jsonb)$$,'42501',null,'suspended coordinator denied');
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-000000000008',true);
select throws_ok($$select public.create_report_incident(current_setting('test.payload')::jsonb)$$,'42501',null,'anonymous identity denied even with database role');
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-000000000009',true);
select throws_ok($$select public.create_report_incident(current_setting('test.payload')::jsonb)$$,'42501',null,'unconfirmed identity denied');
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-000000000001',true);
select throws_ok($$select public.create_report_incident(current_setting('test.payload')::jsonb||'{"data_mode":"live"}')$$,'22023',null,'demo geography cannot create live incident');
select throws_ok($$select public.create_report_incident(current_setting('test.payload')::jsonb||'{"latitude":20}')$$,'23514',null,'point outside district rejected');
select throws_ok($$select public.create_report_incident(current_setting('test.payload')::jsonb||'{"latitude":91}')$$,'23514',null,'invalid WGS84 latitude rejected');
select throws_ok($$select public.create_report_incident(current_setting('test.payload')::jsonb||'{"source_label":""}')$$,'22023',null,'source attribution mandatory');
select throws_ok($$select public.create_report_incident(current_setting('test.payload')::jsonb||jsonb_build_object('observed_at',now()+interval '1 day'))$$,'22023',null,'future report time denied');
select lives_ok($$select public.create_report_incident(current_setting('test.payload')::jsonb||'{"verification_status":"confirmed","final_priority":"critical","created_by":"33333333-3333-4333-8333-000000000004"}')$$,'coordinator opens case; injected decision and identity are ignored');
select set_config('test.incident',(select id::text from public.incidents where title='Synthetic report-only incident'),true);
select is((select verification_status::text from public.incidents where id=current_setting('test.incident')::uuid),'needs_more_information','report creation never confirms');
select is((select final_priority::text from public.incidents where id=current_setting('test.incident')::uuid),'unassessed','creation remains unassessed');
select is((select created_by::text from public.incidents where id=current_setting('test.incident')::uuid),'33333333-3333-4333-8333-000000000001','actor comes from authenticated identity');
select is((select count(*)::int from public.reports where incident_id=current_setting('test.incident')::uuid),1,'report saved atomically with case');
select is((select count(*)::int from public.incident_observations where incident_id=current_setting('test.incident')::uuid),0,'human report does not fabricate satellite provenance');
select is((select count(*)::int from public.incident_events where incident_id=current_setting('test.incident')::uuid),1,'creation has immutable event');
select is((select open_incidents from public.operations_summary('demo',null,'COMPLETE-A')),1::bigint,'summary counts scoped open case');
select is((select unassigned_active from public.operations_summary('demo',null,'COMPLETE-A')),1::bigint,'unassigned queue count correct');
select is((select open_incidents from public.operations_summary('live',null,'COMPLETE-A')),0::bigint,'summary modes remain isolated');
select is((select open_incidents from public.operations_summary('demo',null,'COMPLETE-B')),0::bigint,'summary respects geography');
select is((select open_incidents from public.operations_summary('demo',null,'COMPLETE-A','VIIRS_SNPP_NRT')),0::bigint,'human-only case is not counted as NASA-linked');
select is(jsonb_array_length(public.district_features('demo')->'features'),1,'geometry includes only granted district');
select is(public.district_features('demo')->'features'->0->'properties'->>'source','Synthetic completion fixture','geometry preserves provenance');
select is(jsonb_array_length(public.district_features('live')->'features'),0,'geometry separates live and demo');
select is((select count(*)::int from public.eligible_assignees(current_setting('test.incident')::uuid)),1,'coordinator sees paired eligible team member');
select ok((select distance_to_team_km is null from public.eligible_assignees(current_setting('test.incident')::uuid)),'missing base remains unknown, not zero');
select throws_ok($$select public.update_team_details('eeeeeeee-eeee-4eee-8eee-000000000008',1,'{}')$$,'42501',null,'coordinator cannot edit admin team metadata');
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-000000000004',true);
select set_config('test.team_payload',jsonb_build_object('name','Synthetic renamed team','authority_type','Synthetic reviewed mandate','active',true,
 'base_latitude',1,'base_longitude',1,'base_source','Synthetic test base coordinates','base_recorded_at',now(),'reason','Synthetic audited team edit reason')::text,true);
select lives_ok($$select public.update_team_details('eeeeeeee-eeee-4eee-8eee-000000000008',1,current_setting('test.team_payload')::jsonb)$$,'admin records documented base');
select throws_ok($$select public.update_team_details('eeeeeeee-eeee-4eee-8eee-000000000008',1,current_setting('test.team_payload')::jsonb)$$,'40001',null,'stale team edit denied');
select ok((select distance_to_team_km between 1 and 2 from public.eligible_assignees(current_setting('test.incident')::uuid)),'PostGIS computes kilometer distance from documented base');
select is((select base_source from public.eligible_assignees(current_setting('test.incident')::uuid)),'Synthetic test base coordinates','distance retains source');
select is((select count(*)::int from public.access_audit_logs where actor_id='33333333-3333-4333-8333-000000000004'),1,'team edit appended audit');
select throws_ok($$select public.update_team_details('eeeeeeee-eeee-4eee-8eee-000000000008',2,current_setting('test.team_payload')::jsonb||'{"base_latitude":null}')$$,'23514',null,'partial base denied atomically');
select throws_ok($$select public.update_team_details('eeeeeeee-eeee-4eee-8eee-000000000008',2,current_setting('test.team_payload')::jsonb||jsonb_build_object('base_recorded_at',now()+interval '1 day'))$$,'22023',null,'future base attribution denied');
select lives_ok($$select public.update_team_details('eeeeeeee-eeee-4eee-8eee-000000000008',2,current_setting('test.team_payload')::jsonb||'{"active":false}')$$,'admin can deactivate team');
select is((select count(*)::int from public.eligible_assignees(current_setting('test.incident')::uuid)),0,'inactive team omitted from assignment picker');
select throws_ok($$select public.mutate_incident(current_setting('test.incident')::uuid,1,'assign','{"team_id":"eeeeeeee-eeee-4eee-8eee-000000000008","owner_id":"33333333-3333-4333-8333-000000000002","reason":"Synthetic inactive team assignment denial"}')$$,'22023',null,'database refuses inactive team assignment');
select lives_ok($$select public.update_team_details('eeeeeeee-eeee-4eee-8eee-000000000008',3,current_setting('test.team_payload')::jsonb)$$,'admin can reactivate team');
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-000000000003',true);
select is((select count(*)::int from public.eligible_assignees(current_setting('test.incident')::uuid)),0,'viewer cannot inspect privileged candidate roster');
select is((select count(*)::int from public.ingestion_status('demo')),0,'viewer cannot inspect job metrics');
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-000000000002',true);
select is((select count(*)::int from public.eligible_assignees(current_setting('test.incident')::uuid)),0,'field officer cannot inspect privileged roster');
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-000000000006',true);
select is((select count(*)::int from public.eligible_assignees(current_setting('test.incident')::uuid)),0,'out-of-area candidate lookup denied');
select throws_ok($$select public.update_team_details('eeeeeeee-eeee-4eee-8eee-000000000008',4,current_setting('test.team_payload')::jsonb)$$,'42501',null,'out-of-area team edit denied');
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-000000000001',true);
select lives_ok($$select public.mutate_incident(current_setting('test.incident')::uuid,1,'assign','{"team_id":"eeeeeeee-eeee-4eee-8eee-000000000008","owner_id":"33333333-3333-4333-8333-000000000002","reason":"Synthetic authorized report case assignment"}')$$,'report-only case supports standard assignment workflow');
select is((select active_assignments from public.operations_summary('demo',null,'COMPLETE-A')),1::bigint,'assigned summary projection updates');
select is((select unassigned_active from public.operations_summary('demo',null,'COMPLETE-A')),0::bigint,'case leaves unassigned queue');
reset role;
set local role service_role;
select throws_ok($$select public.create_report_incident(current_setting('test.payload')::jsonb)$$,'42501',null,'automation cannot create report-based human incident');
select throws_ok($$select public.eligible_assignees(current_setting('test.incident')::uuid)$$,'42501',null,'automation cannot access human candidate RPC');
select throws_ok($$select public.update_team_details('eeeeeeee-eeee-4eee-8eee-000000000008',4,current_setting('test.team_payload')::jsonb)$$,'42501',null,'automation cannot edit human team metadata');
reset role;
select * from finish();
rollback;
