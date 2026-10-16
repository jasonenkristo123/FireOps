-- Owner decision: direct email/password registration, viewer by default.
-- Disable Confirm Email in Supabase Auth separately. With that setting disabled,
-- Auth auto-confirms new email accounts; existing identity/RLS checks remain valid.
-- Do not promote legacy accounts, suspended accounts, or grant any district here.
alter table public.profiles alter column role set default 'viewer';
alter table public.profiles alter column status set default 'active';

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, role, status)
  values (
    new.id,
    case when jsonb_typeof(new.raw_user_meta_data->'display_name') = 'string'
      then left(btrim(new.raw_user_meta_data->>'display_name'), 100)
      else '' end,
    case when coalesce(new.is_anonymous, false) then 'pending'::public.user_role else 'viewer'::public.user_role end,
    case when coalesce(new.is_anonymous, false) then 'pending'::public.account_status else 'active'::public.account_status end
  );
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated, service_role;
