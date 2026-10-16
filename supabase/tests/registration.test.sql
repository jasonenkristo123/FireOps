begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
-- Synthetic transaction-scoped registrations: never touch real identities.
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
values ('33333333-3333-4333-8333-000000000001','registration-test@example.test',now(),
 '{"display_name":"  Siti Test  ","role":"admin","status":"active","district_codes":["*"]}');
select is((select display_name from public.profiles where id='33333333-3333-4333-8333-000000000001'),'Siti Test','registration copies trimmed display name');
select is((select role::text from public.profiles where id='33333333-3333-4333-8333-000000000001'),'viewer','registration cannot choose privileged role');
select is((select status::text from public.profiles where id='33333333-3333-4333-8333-000000000001'),'active','registration needs no separate approval');
select is((select count(*)::int from public.profile_district_grants where user_id='33333333-3333-4333-8333-000000000001'),0,'registration never grants districts');
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
values ('33333333-3333-4333-8333-000000000002','registration-long@example.test',now(),jsonb_build_object('display_name',repeat('a',101))),
 ('33333333-3333-4333-8333-000000000003','registration-invalid@example.test',now(),'{"display_name":{"role":"admin"}}');
select is((select length(display_name) from public.profiles where id='33333333-3333-4333-8333-000000000002'),100,'direct API metadata is bounded');
select is((select display_name from public.profiles where id='33333333-3333-4333-8333-000000000003'),'','non-string metadata cannot break signup');
insert into auth.users(id,is_anonymous,raw_user_meta_data)
values ('33333333-3333-4333-8333-000000000004',true,'{"role":"admin","status":"active"}');
select is((select role::text||'/'||status::text from public.profiles where id='33333333-3333-4333-8333-000000000004'),'pending/pending','anonymous users remain restricted');
set local role authenticated;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-000000000001',true);
select is((select count(*)::int from public.hotspot_observations),0,'new viewer sees no observations without district');
select is((select count(*)::int from public.incidents),0,'new viewer sees no incidents without district');
select throws_ok($$update public.profiles set role='admin' where id=auth.uid()$$,'42501',null,'new viewer cannot promote self');
select throws_ok($$insert into public.profile_district_grants(user_id,district_code,granted_by) values(auth.uid(),'TEST-A',auth.uid())$$,'42501',null,'new viewer cannot assign jurisdiction');
select throws_ok($$select public.set_account_access('33333333-3333-4333-8333-000000000002','admin','active',array[]::text[],'Signup escalation attempt')$$,'42501',null,'new viewer cannot assign roles');
reset role;
update auth.users set raw_user_meta_data='{"display_name":"Changed metadata","role":"admin","status":"active"}'
where id='33333333-3333-4333-8333-000000000001';
select is((select role::text from public.profiles where id='33333333-3333-4333-8333-000000000001'),'viewer','metadata updates cannot change roles');
select * from finish();
rollback;
