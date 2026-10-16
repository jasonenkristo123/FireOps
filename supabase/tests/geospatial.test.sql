begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
-- All records are synthetic and rolled back, including simulated live rows used only for isolation tests.
\ir fixtures/test-districts.psql
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
select ('11111111-1111-4111-8111-'||lpad(i::text,12,'0'))::uuid,
 'geo-rls-'||i||'@example.test',now(),'{"role":"admin"}'::jsonb from generate_series(1,9) i;
update public.profiles set role='pending',status='pending' where id='11111111-1111-4111-8111-000000000001';
update public.profiles set role=case right(id::text,1)
 when '2' then 'viewer'::public.user_role when '3' then 'field_officer'::public.user_role
 when '4' then 'coordinator'::public.user_role when '5' then 'admin'::public.user_role
 else 'viewer'::public.user_role end,status='active' where id::text like '11111111-%' and right(id::text,1)<>'1';
update public.profiles set status='suspended' where id='11111111-1111-4111-8111-000000000006';
update auth.users set email_confirmed_at=null where id='11111111-1111-4111-8111-000000000007';
update auth.users set is_anonymous=true where id='11111111-1111-4111-8111-000000000008';
insert into public.districts(code,province_code,name,geometry,source,license,boundary_version,data_mode,approved_by,approved_at)
select 'TEST-LIVE-'||suffix,'TEST','Synthetic live-isolation fixture '||suffix,geometry,
 'Synthetic test transaction; NOT operational data','Synthetic test data only','test-v1','live',
 '11111111-1111-4111-8111-000000000005',now()
from (values('A','TEST-A'),('B','TEST-B')) v(suffix,demo_code) join public.districts d on d.code=v.demo_code;
insert into public.profile_district_grants(user_id,district_code,granted_by)
select p.id,c.code,'11111111-1111-4111-8111-000000000005' from public.profiles p
 cross join (values('TEST-A'),('TEST-LIVE-A')) c(code)
 where p.id::text like '11111111-%' and right(p.id::text,1)<>'9';
insert into public.ingest_runs(id,source,data_mode,source_window_start,source_window_end)
values('cccccccc-cccc-4ccc-8ccc-000000000001','TEST_SENSOR','demo','2026-01-01T00:00Z','2026-01-02T00:00Z');
insert into public.hotspot_observations(id,observation_key,source,satellite,instrument,latitude,longitude,detected_at,raw_payload,district_id,data_mode)
select ('aaaaaaaa-aaaa-4aaa-8aaa-'||lpad(n::text,12,'0'))::uuid,
 'test:'||key,'TEST_SENSOR','TEST_SAT','TEST_INSTRUMENT',0.5,lon,'2026-01-01T00:00Z',
 '{"provenance":"synthetic test transaction only"}'::jsonb,d.id,mode::public.data_mode
from (values(1,'shared',1.5,'TEST-A','demo'),(2,'b',3.5,'TEST-B','demo'),
 (3,'shared',1.5,'TEST-LIVE-A','live'),(4,'b',3.5,'TEST-LIVE-B','live')) v(n,key,lon,code,mode)
 join public.districts d on d.code=v.code;
insert into public.hotspot_observations(id,observation_key,source,satellite,instrument,latitude,longitude,detected_at,raw_payload,data_mode)
values('aaaaaaaa-aaaa-4aaa-8aaa-000000000005','test:unmatched','TEST_SENSOR','TEST_SAT','TEST_INSTRUMENT',10,10,'2026-01-01T00:00Z','{}','demo');
insert into public.incidents(id,reference,title,latitude,longitude,district_id,data_mode,created_by)
select ('bbbbbbbb-bbbb-4bbb-8bbb-'||lpad(n::text,12,'0'))::uuid,'TEST-'||n,'SYNTHETIC test incident',0.5,lon,d.id,mode::public.data_mode,
 '11111111-1111-4111-8111-000000000004'
from (values(1,1.5,'TEST-A','demo'),(2,3.5,'TEST-B','demo'),(3,1.5,'TEST-LIVE-A','live'),(4,3.5,'TEST-LIVE-B','live')) v(n,lon,code,mode)
join public.districts d on d.code=v.code;
insert into public.incident_observations(incident_id,observation_id,data_mode,linked_by)
select ('bbbbbbbb-bbbb-4bbb-8bbb-'||lpad(i::text,12,'0'))::uuid,
 ('aaaaaaaa-aaaa-4aaa-8aaa-'||lpad(o::text,12,'0'))::uuid,mode::public.data_mode,'11111111-1111-4111-8111-000000000004'
from (values(1,1,'demo'),(1,2,'demo'),(2,2,'demo'),(3,3,'live')) v(i,o,mode);
select is((select n.nspname::text from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='postgis'),'extensions','PostGIS isolated in extensions');
select is((select count(*)::int from pg_tables where schemaname='public' and tablename in ('districts','ingest_runs','hotspot_observations','incidents','incident_observations') and rowsecurity),5,'all new tables enable RLS');
select hasnt_column('public','hotspot_observations','verification_status','observations are distinct from verification');
select is((select count(*)::int from public.hotspot_observations where observation_key='test:shared'),2,'observation identity isolated by mode');
select is((select count(*)::int from public.hotspot_observations where id::text like 'aaaaaaaa-%' and confidence_raw is null and confidence_kind is null),5,'unknown confidence stays null');
select is((select extensions.st_x(geom::extensions.geometry) from public.hotspot_observations where id='aaaaaaaa-aaaa-4aaa-8aaa-000000000001'),1.5::double precision,'point x is longitude');
select is((select extensions.st_y(geom::extensions.geometry) from public.hotspot_observations where id='aaaaaaaa-aaaa-4aaa-8aaa-000000000001'),0.5::double precision,'point y is latitude');
set local role anon;
select throws_ok('select * from public.districts','42501',null,'anon cannot read districts');
select throws_ok('select * from public.ingest_runs','42501',null,'anon cannot read ingest_runs');
select throws_ok('select * from public.hotspot_observations','42501',null,'anon cannot read hotspot_observations');
select throws_ok('select * from public.incidents','42501',null,'anon cannot read incidents');
select throws_ok('select * from public.incident_observations','42501',null,'anon cannot read incident_observations');
select throws_ok($$select * from public.districts_for_point(0.5,1.5,'demo')$$,'42501',null,'anon cannot call geospatial lookup');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-000000000001',true);
select is((select count(*)::int from public.districts where code in ('TEST-A','TEST-B','TEST-LIVE-A','TEST-LIVE-B')),0,'pending: scoped districts');
select is((select count(*)::int from public.hotspot_observations where id::text like 'aaaaaaaa-%'),0,'pending: scoped hotspot_observations');
select is((select count(*)::int from public.incidents where id::text like 'bbbbbbbb-%'),0,'pending: scoped incidents');
select is((select count(*)::int from public.incident_observations where incident_id::text like 'bbbbbbbb-%'),0,'pending: scoped incident_observations');
select is((select count(*)::int from public.hotspot_observations where id::text like 'aaaaaaaa-%' and data_mode='demo'),0,'pending: demo filter');
select is((select count(*)::int from public.hotspot_observations where id::text like 'aaaaaaaa-%' and data_mode='live'),0,'pending: live filter');
select is((select count(*)::int from public.districts_for_point(0.5,3.5,'demo')),0,'pending: out-of-area point lookup denied');
select throws_ok('delete from public.districts','42501',null,'pending: cannot delete districts');
select throws_ok('delete from public.ingest_runs','42501',null,'pending: cannot delete ingest_runs');
select throws_ok('delete from public.hotspot_observations','42501',null,'pending: cannot delete hotspot_observations');
select throws_ok('delete from public.incidents','42501',null,'pending: cannot delete incidents');
select throws_ok('delete from public.incident_observations','42501',null,'pending: cannot delete incident_observations');
select throws_ok($$update public.incidents set verification_status='confirmed'$$,'42501',null,'pending: cannot directly verify');
select throws_ok('select * from public.ingest_runs','42501',null,'pending: no unscoped sync history');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-000000000002',true);
select is((select count(*)::int from public.districts where code in ('TEST-A','TEST-B','TEST-LIVE-A','TEST-LIVE-B')),2,'viewer: scoped districts');
select is((select count(*)::int from public.hotspot_observations where id::text like 'aaaaaaaa-%'),2,'viewer: scoped hotspot_observations');
select is((select count(*)::int from public.incidents where id::text like 'bbbbbbbb-%'),2,'viewer: scoped incidents');
select is((select count(*)::int from public.incident_observations where incident_id::text like 'bbbbbbbb-%'),2,'viewer: scoped incident_observations');
select is((select count(*)::int from public.hotspot_observations where id::text like 'aaaaaaaa-%' and data_mode='demo'),1,'viewer: demo filter');
select is((select count(*)::int from public.hotspot_observations where id::text like 'aaaaaaaa-%' and data_mode='live'),1,'viewer: live filter');
select is((select count(*)::int from public.districts_for_point(0.5,3.5,'demo')),0,'viewer: out-of-area point lookup denied');
select throws_ok('delete from public.districts','42501',null,'viewer: cannot delete districts');
select throws_ok('delete from public.ingest_runs','42501',null,'viewer: cannot delete ingest_runs');
select throws_ok('delete from public.hotspot_observations','42501',null,'viewer: cannot delete hotspot_observations');
select throws_ok('delete from public.incidents','42501',null,'viewer: cannot delete incidents');
select throws_ok('delete from public.incident_observations','42501',null,'viewer: cannot delete incident_observations');
select throws_ok($$update public.incidents set verification_status='confirmed'$$,'42501',null,'viewer: cannot directly verify');
select throws_ok('select * from public.ingest_runs','42501',null,'viewer: no unscoped sync history');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-000000000003',true);
select is((select count(*)::int from public.districts where code in ('TEST-A','TEST-B','TEST-LIVE-A','TEST-LIVE-B')),2,'field_officer: scoped districts');
select is((select count(*)::int from public.hotspot_observations where id::text like 'aaaaaaaa-%'),2,'field_officer: scoped hotspot_observations');
select is((select count(*)::int from public.incidents where id::text like 'bbbbbbbb-%'),2,'field_officer: scoped incidents');
select is((select count(*)::int from public.incident_observations where incident_id::text like 'bbbbbbbb-%'),2,'field_officer: scoped incident_observations');
select is((select count(*)::int from public.hotspot_observations where id::text like 'aaaaaaaa-%' and data_mode='demo'),1,'field_officer: demo filter');
select is((select count(*)::int from public.hotspot_observations where id::text like 'aaaaaaaa-%' and data_mode='live'),1,'field_officer: live filter');
select is((select count(*)::int from public.districts_for_point(0.5,3.5,'demo')),0,'field_officer: out-of-area point lookup denied');
select throws_ok('delete from public.districts','42501',null,'field_officer: cannot delete districts');
select throws_ok('delete from public.ingest_runs','42501',null,'field_officer: cannot delete ingest_runs');
select throws_ok('delete from public.hotspot_observations','42501',null,'field_officer: cannot delete hotspot_observations');
select throws_ok('delete from public.incidents','42501',null,'field_officer: cannot delete incidents');
select throws_ok('delete from public.incident_observations','42501',null,'field_officer: cannot delete incident_observations');
select throws_ok($$update public.incidents set verification_status='confirmed'$$,'42501',null,'field_officer: cannot directly verify');
select throws_ok('select * from public.ingest_runs','42501',null,'field_officer: no unscoped sync history');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-000000000004',true);
select is((select count(*)::int from public.districts where code in ('TEST-A','TEST-B','TEST-LIVE-A','TEST-LIVE-B')),2,'coordinator: scoped districts');
select is((select count(*)::int from public.hotspot_observations where id::text like 'aaaaaaaa-%'),2,'coordinator: scoped hotspot_observations');
select is((select count(*)::int from public.incidents where id::text like 'bbbbbbbb-%'),2,'coordinator: scoped incidents');
select is((select count(*)::int from public.incident_observations where incident_id::text like 'bbbbbbbb-%'),2,'coordinator: scoped incident_observations');
select is((select count(*)::int from public.hotspot_observations where id::text like 'aaaaaaaa-%' and data_mode='demo'),1,'coordinator: demo filter');
select is((select count(*)::int from public.hotspot_observations where id::text like 'aaaaaaaa-%' and data_mode='live'),1,'coordinator: live filter');
select is((select count(*)::int from public.districts_for_point(0.5,3.5,'demo')),0,'coordinator: out-of-area point lookup denied');
select throws_ok('delete from public.districts','42501',null,'coordinator: cannot delete districts');
select throws_ok('delete from public.ingest_runs','42501',null,'coordinator: cannot delete ingest_runs');
select throws_ok('delete from public.hotspot_observations','42501',null,'coordinator: cannot delete hotspot_observations');
select throws_ok('delete from public.incidents','42501',null,'coordinator: cannot delete incidents');
select throws_ok('delete from public.incident_observations','42501',null,'coordinator: cannot delete incident_observations');
select throws_ok($$update public.incidents set verification_status='confirmed'$$,'42501',null,'coordinator: cannot directly verify');
select throws_ok('select * from public.ingest_runs','42501',null,'coordinator: no unscoped sync history');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-000000000005',true);
select is((select count(*)::int from public.districts where code in ('TEST-A','TEST-B','TEST-LIVE-A','TEST-LIVE-B')),2,'admin: scoped districts');
select is((select count(*)::int from public.hotspot_observations where id::text like 'aaaaaaaa-%'),2,'admin: scoped hotspot_observations');
select is((select count(*)::int from public.incidents where id::text like 'bbbbbbbb-%'),2,'admin: scoped incidents');
select is((select count(*)::int from public.incident_observations where incident_id::text like 'bbbbbbbb-%'),2,'admin: scoped incident_observations');
select is((select count(*)::int from public.hotspot_observations where id::text like 'aaaaaaaa-%' and data_mode='demo'),1,'admin: demo filter');
select is((select count(*)::int from public.hotspot_observations where id::text like 'aaaaaaaa-%' and data_mode='live'),1,'admin: live filter');
select is((select count(*)::int from public.districts_for_point(0.5,3.5,'demo')),0,'admin: out-of-area point lookup denied');
select throws_ok('delete from public.districts','42501',null,'admin: cannot delete districts');
select throws_ok('delete from public.ingest_runs','42501',null,'admin: cannot delete ingest_runs');
select throws_ok('delete from public.hotspot_observations','42501',null,'admin: cannot delete hotspot_observations');
select throws_ok('delete from public.incidents','42501',null,'admin: cannot delete incidents');
select throws_ok('delete from public.incident_observations','42501',null,'admin: cannot delete incident_observations');
select throws_ok($$update public.incidents set verification_status='confirmed'$$,'42501',null,'admin: cannot directly verify');
select throws_ok('select * from public.ingest_runs','42501',null,'admin: no unscoped sync history');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-000000000006',true);
select is((select count(*)::int from public.districts where code in ('TEST-A','TEST-B','TEST-LIVE-A','TEST-LIVE-B')),0,'suspended: scoped districts');
select is((select count(*)::int from public.hotspot_observations where id::text like 'aaaaaaaa-%'),0,'suspended: scoped hotspot_observations');
select is((select count(*)::int from public.incidents where id::text like 'bbbbbbbb-%'),0,'suspended: scoped incidents');
select is((select count(*)::int from public.incident_observations where incident_id::text like 'bbbbbbbb-%'),0,'suspended: scoped incident_observations');
select is((select count(*)::int from public.hotspot_observations where id::text like 'aaaaaaaa-%' and data_mode='demo'),0,'suspended: demo filter');
select is((select count(*)::int from public.hotspot_observations where id::text like 'aaaaaaaa-%' and data_mode='live'),0,'suspended: live filter');
select is((select count(*)::int from public.districts_for_point(0.5,3.5,'demo')),0,'suspended: out-of-area point lookup denied');
select throws_ok('delete from public.districts','42501',null,'suspended: cannot delete districts');
select throws_ok('delete from public.ingest_runs','42501',null,'suspended: cannot delete ingest_runs');
select throws_ok('delete from public.hotspot_observations','42501',null,'suspended: cannot delete hotspot_observations');
select throws_ok('delete from public.incidents','42501',null,'suspended: cannot delete incidents');
select throws_ok('delete from public.incident_observations','42501',null,'suspended: cannot delete incident_observations');
select throws_ok($$update public.incidents set verification_status='confirmed'$$,'42501',null,'suspended: cannot directly verify');
select throws_ok('select * from public.ingest_runs','42501',null,'suspended: no unscoped sync history');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-000000000007',true);
select is((select count(*)::int from public.districts where code in ('TEST-A','TEST-B','TEST-LIVE-A','TEST-LIVE-B')),0,'unconfirmed: scoped districts');
select is((select count(*)::int from public.hotspot_observations where id::text like 'aaaaaaaa-%'),0,'unconfirmed: scoped hotspot_observations');
select is((select count(*)::int from public.incidents where id::text like 'bbbbbbbb-%'),0,'unconfirmed: scoped incidents');
select is((select count(*)::int from public.incident_observations where incident_id::text like 'bbbbbbbb-%'),0,'unconfirmed: scoped incident_observations');
select is((select count(*)::int from public.hotspot_observations where id::text like 'aaaaaaaa-%' and data_mode='demo'),0,'unconfirmed: demo filter');
select is((select count(*)::int from public.hotspot_observations where id::text like 'aaaaaaaa-%' and data_mode='live'),0,'unconfirmed: live filter');
select is((select count(*)::int from public.districts_for_point(0.5,3.5,'demo')),0,'unconfirmed: out-of-area point lookup denied');
select throws_ok('delete from public.districts','42501',null,'unconfirmed: cannot delete districts');
select throws_ok('delete from public.ingest_runs','42501',null,'unconfirmed: cannot delete ingest_runs');
select throws_ok('delete from public.hotspot_observations','42501',null,'unconfirmed: cannot delete hotspot_observations');
select throws_ok('delete from public.incidents','42501',null,'unconfirmed: cannot delete incidents');
select throws_ok('delete from public.incident_observations','42501',null,'unconfirmed: cannot delete incident_observations');
select throws_ok($$update public.incidents set verification_status='confirmed'$$,'42501',null,'unconfirmed: cannot directly verify');
select throws_ok('select * from public.ingest_runs','42501',null,'unconfirmed: no unscoped sync history');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-000000000008',true);
select is((select count(*)::int from public.districts where code in ('TEST-A','TEST-B','TEST-LIVE-A','TEST-LIVE-B')),0,'anonymous: scoped districts');
select is((select count(*)::int from public.hotspot_observations where id::text like 'aaaaaaaa-%'),0,'anonymous: scoped hotspot_observations');
select is((select count(*)::int from public.incidents where id::text like 'bbbbbbbb-%'),0,'anonymous: scoped incidents');
select is((select count(*)::int from public.incident_observations where incident_id::text like 'bbbbbbbb-%'),0,'anonymous: scoped incident_observations');
select is((select count(*)::int from public.hotspot_observations where id::text like 'aaaaaaaa-%' and data_mode='demo'),0,'anonymous: demo filter');
select is((select count(*)::int from public.hotspot_observations where id::text like 'aaaaaaaa-%' and data_mode='live'),0,'anonymous: live filter');
select is((select count(*)::int from public.districts_for_point(0.5,3.5,'demo')),0,'anonymous: out-of-area point lookup denied');
select throws_ok('delete from public.districts','42501',null,'anonymous: cannot delete districts');
select throws_ok('delete from public.ingest_runs','42501',null,'anonymous: cannot delete ingest_runs');
select throws_ok('delete from public.hotspot_observations','42501',null,'anonymous: cannot delete hotspot_observations');
select throws_ok('delete from public.incidents','42501',null,'anonymous: cannot delete incidents');
select throws_ok('delete from public.incident_observations','42501',null,'anonymous: cannot delete incident_observations');
select throws_ok($$update public.incidents set verification_status='confirmed'$$,'42501',null,'anonymous: cannot directly verify');
select throws_ok('select * from public.ingest_runs','42501',null,'anonymous: no unscoped sync history');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-000000000009',true);
select is((select count(*)::int from public.districts where code in ('TEST-A','TEST-B','TEST-LIVE-A','TEST-LIVE-B')),0,'no_scope: scoped districts');
select is((select count(*)::int from public.hotspot_observations where id::text like 'aaaaaaaa-%'),0,'no_scope: scoped hotspot_observations');
select is((select count(*)::int from public.incidents where id::text like 'bbbbbbbb-%'),0,'no_scope: scoped incidents');
select is((select count(*)::int from public.incident_observations where incident_id::text like 'bbbbbbbb-%'),0,'no_scope: scoped incident_observations');
select is((select count(*)::int from public.hotspot_observations where id::text like 'aaaaaaaa-%' and data_mode='demo'),0,'no_scope: demo filter');
select is((select count(*)::int from public.hotspot_observations where id::text like 'aaaaaaaa-%' and data_mode='live'),0,'no_scope: live filter');
select is((select count(*)::int from public.districts_for_point(0.5,3.5,'demo')),0,'no_scope: out-of-area point lookup denied');
select throws_ok('delete from public.districts','42501',null,'no_scope: cannot delete districts');
select throws_ok('delete from public.ingest_runs','42501',null,'no_scope: cannot delete ingest_runs');
select throws_ok('delete from public.hotspot_observations','42501',null,'no_scope: cannot delete hotspot_observations');
select throws_ok('delete from public.incidents','42501',null,'no_scope: cannot delete incidents');
select throws_ok('delete from public.incident_observations','42501',null,'no_scope: cannot delete incident_observations');
select throws_ok($$update public.incidents set verification_status='confirmed'$$,'42501',null,'no_scope: cannot directly verify');
select throws_ok('select * from public.ingest_runs','42501',null,'no_scope: no unscoped sync history');
reset role;
set local role service_role;
select is((select count(*)::int from public.districts_for_point(0.5,1.5,'demo')),1,'inside square resolves one district');
select is((select count(*)::int from public.districts_for_point(0.5,2,'demo')),2,'shared border returns both matches, never arbitrary first');
select is((select count(*)::int from public.districts_for_point(20,20,'demo')),0,'unmatched point has no fabricated district');
select throws_ok($$select * from public.districts_for_point(91,1,'demo')$$,'22023',null,'invalid latitude rejected');
select throws_ok($$select * from public.districts_for_point(1,181,'demo')$$,'22023',null,'invalid longitude rejected');
select throws_ok($$select * from public.districts_for_point('NaN',1,'demo')$$,'22023',null,'NaN rejected');
select throws_ok($$select * from public.districts_for_point(null,1,'demo')$$,'22023',null,'null coordinates rejected');
select throws_ok($$select * from public.districts_for_point(1,1,null)$$,'22023',null,'mode must be explicit');
select throws_ok('select * from public.incidents','42501',null,'ingestion cannot read incidents');
select throws_ok($$insert into public.incidents(title) values('Automatic fire')$$,'42501',null,'ingestion cannot create incidents');
select throws_ok($$update public.incidents set verification_status='confirmed'$$,'42501',null,'ingestion cannot confirm fires');
select throws_ok($$insert into public.incident_observations(incident_id) values(gen_random_uuid())$$,'42501',null,'ingestion cannot link incidents');
select lives_ok($$insert into public.ingest_runs(source,data_mode,source_window_start,source_window_end) values('TEST_JOB','demo',now(),now())$$,'trusted job can record sync start');
select lives_ok($$insert into public.hotspot_observations(observation_key,source,satellite,instrument,latitude,longitude,detected_at,raw_payload,data_mode) values('test:service','TEST_JOB','TEST_SAT','TEST_INSTRUMENT',20,20,now(),'{}','demo')$$,'trusted job may store unresolved observation without inventing geography');
select throws_ok($$insert into public.hotspot_observations(observation_key,source,satellite,instrument,latitude,longitude,detected_at,raw_payload,data_mode) values('test:bad-lat','TEST_JOB','TEST_SAT','TEST_INSTRUMENT',91,1,now(),'{}','demo')$$,'23514',null,'observation latitude constraint');
select throws_ok($$insert into public.hotspot_observations(observation_key,source,satellite,instrument,latitude,longitude,detected_at,raw_payload,data_mode) values('test:bad-lon','TEST_JOB','TEST_SAT','TEST_INSTRUMENT',1,181,now(),'{}','demo')$$,'23514',null,'observation longitude constraint');
select throws_ok($$insert into public.hotspot_observations(observation_key,source,satellite,instrument,latitude,longitude,detected_at,raw_payload,data_mode) values('test:shared','TEST_SENSOR','TEST_SAT','TEST_INSTRUMENT',1,1,now(),'{}','demo')$$,'23505',null,'same-mode dedupe enforced');
select throws_ok($$insert into public.hotspot_observations(observation_key,source,satellite,instrument,latitude,longitude,detected_at,raw_payload,data_mode,district_id) select 'test:wrong-point','TEST_SENSOR','TEST_SAT','TEST_INSTRUMENT',20,20,now(),'{}','demo',id from public.districts where code='TEST-A'$$,'23514',null,'district must cover observation point');
select throws_ok($$insert into public.hotspot_observations(observation_key,source,satellite,instrument,latitude,longitude,detected_at,raw_payload,data_mode,district_id) select 'test:wrong-mode','TEST_SENSOR','TEST_SAT','TEST_INSTRUMENT',1,1,now(),'{}','live',id from public.districts where code='TEST-A'$$,'23514',null,'observation district mode must match');
select throws_ok($$insert into public.hotspot_observations(observation_key,source,satellite,instrument,latitude,longitude,detected_at,raw_payload,data_mode,ingest_run_id) values('test:wrong-source','OTHER_SENSOR','TEST_SAT','TEST_INSTRUMENT',1,1,now(),'{}','demo','cccccccc-cccc-4ccc-8ccc-000000000001')$$,'23503',null,'run source must match observation provenance');
select throws_ok($$insert into public.ingest_runs(source,data_mode,status,source_window_start,source_window_end) values('TEST_JOB','demo','success',now(),now())$$,'23514',null,'success requires completion time');
reset role;
select throws_ok($$insert into public.profile_district_grants(user_id,district_code,granted_by) values('11111111-1111-4111-8111-000000000002','NOT-A-CATALOGUE-CODE','11111111-1111-4111-8111-000000000005')$$,'23503',null,'new grants require catalogue membership');
select throws_ok($$insert into public.incident_observations(incident_id,observation_id,data_mode,linked_by) values('bbbbbbbb-bbbb-4bbb-8bbb-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-000000000003','demo','11111111-1111-4111-8111-000000000004')$$,'23503',null,'demo incident cannot link live observation');
select throws_ok($$insert into public.incident_observations(incident_id,observation_id,data_mode,linked_by) values('bbbbbbbb-bbbb-4bbb-8bbb-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-000000000001','demo','11111111-1111-4111-8111-000000000004')$$,'23505',null,'duplicate observation link rejected');
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-000000000004',true);
select throws_ok($$update public.incidents set verification_status='confirmed' where id='bbbbbbbb-bbbb-4bbb-8bbb-000000000001'$$,'42501',null,'verification projection writable only through audited RPC');
select throws_ok($$update public.incidents set final_priority='high' where id='bbbbbbbb-bbbb-4bbb-8bbb-000000000001'$$,'42501',null,'manual priority writable only through audited RPC');
select throws_ok($$update public.incidents set current_status='assigned' where id='bbbbbbbb-bbbb-4bbb-8bbb-000000000001'$$,'42501',null,'assignment writable only through controlled workflow');
reset role;
update public.incidents set description='Synthetic revision' where id='bbbbbbbb-bbbb-4bbb-8bbb-000000000001';
select is((select row_version from public.incidents where id='bbbbbbbb-bbbb-4bbb-8bbb-000000000001'),2::bigint,'revision increments without trusting supplied row version');
select is((select verification_status::text from public.incidents where id='bbbbbbbb-bbbb-4bbb-8bbb-000000000001'),'needs_more_information','linking observations never verifies incident');
select throws_ok($$insert into public.districts(code,province_code,name,geometry,source,license,boundary_version,data_mode) values('TEST-UNAPPROVED','TEST','Synthetic test',extensions.st_geomfromtext('MULTIPOLYGON(((0 0,1 0,1 1,0 1,0 0)))',4326),'Synthetic fixture','test only','v1','live')$$,'23514',null,'live boundary requires recorded human approval');
select throws_ok($$insert into public.districts(code,province_code,name,geometry,source,license,boundary_version,data_mode) values('TEST-INVALID','TEST','Synthetic invalid polygon',extensions.st_geomfromtext('MULTIPOLYGON(((0 0,2 2,2 0,0 2,0 0)))',4326),'Synthetic fixture','test only','v1','demo')$$,'23514',null,'invalid boundary rejected');
-- Simulate a string grant carried forward from Phase 1 without manufacturing geography.
alter table public.profile_district_grants drop constraint profile_district_grants_district_fkey;
insert into public.profile_district_grants(user_id,district_code,granted_by)
values('11111111-1111-4111-8111-000000000002','TEST-LEGACY-UNMATCHED','11111111-1111-4111-8111-000000000005');
alter table public.profile_district_grants add constraint profile_district_grants_district_fkey
  foreign key(district_code) references public.districts(code) on delete restrict not valid;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-000000000002',true);
select is(public.can_access_district('TEST-LEGACY-UNMATCHED'),false,'legacy unmatched grant fails closed');
reset role;
select * from finish();
rollback;
