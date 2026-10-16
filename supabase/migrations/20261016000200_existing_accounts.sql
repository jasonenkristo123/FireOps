-- Existing Auth identities also start restricted; never infer roles from metadata.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- Append-only applies to TRUNCATE as well as individual row mutation.
create trigger access_audit_no_truncate before truncate on public.access_audit_logs
  for each statement execute function private.reject_audit_mutation();
