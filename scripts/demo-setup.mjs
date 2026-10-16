import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { localConfig } from "./local-config.mjs";

// Explicit local fixture utility. Never reads .env.local or connects to hosted Supabase.
const config = localConfig();
const password = z.string().min(16).parse(process.env.FIREOPS_DEMO_PASSWORD);
const auth = createClient(
  config.API_URL,
  config.SECRET_KEY || config.SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
function sql(input) {
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      "supabase_db_fireops",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    { input, stdio: ["pipe", "pipe", "pipe"] },
  );
}
const roles = ["admin", "coordinator", "field_officer", "viewer"];
const ids = {};
const existing = await auth.auth.admin.listUsers({ perPage: 1000 });
if (existing.error) throw new Error("Local Auth unavailable");
for (const role of roles) {
  const email = `demo-${role}@example.test`;
  const previous = existing.data.users.find((u) => u.email === email);
  const result = previous
    ? await auth.auth.admin.updateUserById(previous.id, {
        password,
        email_confirm: true,
      })
    : await auth.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
  if (result.error || !result.data.user)
    throw new Error("Demo account provisioning failed");
  ids[role] = z.uuid().parse(result.data.user.id);
}
sql(`begin;
insert into public.districts(code,province_code,name,geometry,source,license,boundary_version,data_mode)
values('DEMO-WK','DEMO','SIMULASI / area latihan Kalimantan Barat',extensions.st_geomfromtext('MULTIPOLYGON(((109 -2,112 -2,112 2,109 2,109 -2)))',4326),'Synthetic training rectangle; NOT an administrative boundary','Synthetic demonstration fixture, CC0','demo-v1','demo') on conflict(code) do nothing;
${roles.map((role) => `update public.profiles set role='${role}',status='active',display_name='SIMULASI ${role}' where id='${ids[role]}';insert into public.profile_district_grants(user_id,district_code,granted_by) values('${ids[role]}','DEMO-WK','${ids.admin}') on conflict do nothing;insert into public.access_audit_logs(actor_id,subject_id,reason,before_state,after_state) values('${ids.admin}','${ids[role]}','Explicit local synthetic demo setup; never production bootstrap','{}','{"fixture":"local-demo-v1"}');`).join("\n")}
insert into public.teams(id,name,district_id,authority_type) select 'f0000000-0000-4000-8000-000000000001','SIMULASI Tim Latihan',id,'Mandat simulasi lokal; bukan tim operasional' from public.districts where code='DEMO-WK' on conflict do nothing;
insert into public.team_members(team_id,user_id,availability) values('f0000000-0000-4000-8000-000000000001','${ids.field_officer}','available') on conflict(team_id,user_id) do update set availability='available',updated_at=now();
insert into public.hotspot_observations(observation_key,source,satellite,instrument,latitude,longitude,detected_at,raw_payload,district_id,data_mode)
select 'local-demo-v1:'||n,'DEMO_SIMULATION','SIMULATED','SIMULATED',-0.9+n*0.3,109.4+n*0.35,now()-n*interval '2 hours','{"provenance":"Synthetic local training scenario; not NASA observations"}',d.id,'demo' from generate_series(1,6) n cross join public.districts d where d.code='DEMO-WK' on conflict(data_mode,observation_key) do update set detected_at=excluded.detected_at,last_seen_at=now();
commit;`);
console.log(
  "Local DEMO fixtures ready. Use the password supplied in FIREOPS_DEMO_PASSWORD.",
);
for (const role of roles)
  console.log(
    `demo-${role}@example.test (${role}; synthetic local account only)`,
  );
