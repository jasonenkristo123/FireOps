-- Private scheduler only. No incident permissions are granted.
create index ingest_runs_recent_idx on public.ingest_runs(data_mode,source,started_at desc);
create unique index ingest_runs_one_running_idx on public.ingest_runs(source,data_mode) where status='running';
create function public.begin_ingestion(feed_source text, window_start timestamptz, window_end timestamptz)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended('fireops-ingestion-'||feed_source,0));
 update public.ingest_runs set status='failed',finished_at=now(),error_summary='Worker timeout' where source=feed_source and data_mode='live' and status='running' and started_at<now()-interval '10 minutes';
 if exists(select 1 from public.ingest_runs where source=feed_source and data_mode='live' and (status='running' or started_at>now()-interval '5 minutes')) then raise exception 'INGESTION_BUSY' using errcode='55000'; end if;
 insert into public.ingest_runs(source,data_mode,source_window_start,source_window_end) values(feed_source,'live',window_start,window_end) returning id into result;
 return result;
end $$;
revoke all on function public.begin_ingestion(text,timestamptz,timestamptz) from public,anon,authenticated,service_role;
grant execute on function public.begin_ingestion(text,timestamptz,timestamptz) to service_role;

create function public.finish_ingestion(run_id uuid, observations jsonb, failure text default null)
returns void language plpgsql security definer set search_path='' as $$
declare r public.ingest_runs; row_data jsonb; district uuid; matches integer; inserted integer:=0; updated integer:=0; seen integer; existing boolean;
begin
 select * into r from public.ingest_runs where id=run_id and data_mode='live' and status='running' for update;
 if not found then raise exception 'INVALID_RUN' using errcode='22023'; end if;
 if failure is not null then
 update public.ingest_runs set status='failed',finished_at=now(),error_summary=left(failure,2000) where id=run_id; return;
 end if;
 if observations is null or jsonb_typeof(observations)<>'array' or jsonb_array_length(observations)>10000 then raise exception 'INVALID_BATCH' using errcode='22023'; end if;
 seen:=jsonb_array_length(observations);
 for row_data in select value from jsonb_array_elements(observations) loop
 select count(*),(array_agg(d.id))[1] into matches,district from public.districts d
 where d.data_mode='live' and d.approved_at is not null and extensions.st_covers(d.geometry,extensions.st_setsrid(extensions.st_makepoint((row_data->>'longitude')::double precision,(row_data->>'latitude')::double precision),4326));
 if matches<>1 then district:=null; end if;
 select exists(select 1 from public.hotspot_observations where data_mode='live' and observation_key=row_data->>'observation_key') into existing;
 insert into public.hotspot_observations(observation_key,source,satellite,instrument,latitude,longitude,detected_at,confidence_raw,confidence_kind,frp,brightness,raw_payload,district_id,data_mode,ingest_run_id)
 values(row_data->>'observation_key',r.source,row_data->>'satellite',row_data->>'instrument',(row_data->>'latitude')::double precision,(row_data->>'longitude')::double precision,(row_data->>'detected_at')::timestamptz,row_data->>'confidence_raw',row_data->>'confidence_kind',(row_data->>'frp')::double precision,(row_data->>'brightness')::double precision,row_data->'raw_payload',district,'live',run_id)
 on conflict(data_mode,observation_key) do update set confidence_raw=excluded.confidence_raw,confidence_kind=excluded.confidence_kind,frp=excluded.frp,brightness=excluded.brightness,raw_payload=excluded.raw_payload,last_seen_at=now(),ingest_run_id=excluded.ingest_run_id,district_id=excluded.district_id;
 if existing then updated:=updated+1; else inserted:=inserted+1; end if;
 end loop;
 update public.ingest_runs set status='success',finished_at=now(),rows_seen=seen,rows_inserted=inserted,rows_updated=updated where id=run_id;
end $$;
revoke all on function public.finish_ingestion(uuid,jsonb,text) from public,anon,authenticated,service_role;
grant execute on function public.finish_ingestion(uuid,jsonb,text) to service_role;
