# Direct registration with a viewer role

Date: 2026-10-16. Status: approved by project owner in this session.

The owner requested name, email and password registration without an email
confirmation step, then selected “Viewer by default; I change roles later.”
This supersedes the pending-registration default in ADR 0001 and §3.1 of the
original specification. It does not change human incident verification.

New non-anonymous Auth identities receive an active viewer profile. The signup
trigger copies only a trimmed, bounded string display name from user metadata;
roles, status and districts never come from that metadata. Anonymous identities
remain pending. Existing roles and suspensions are preserved by migration 007.
No existing account is silently activated or made an administrator.

Supabase Auth must have Confirm Email disabled. Supabase then implicitly
confirms new email accounts and returns a session at signup. Existing database
identity checks remain in place; the app does not use an admin key to bypass
Auth configuration or confirm accounts. Password recovery continues to use an
email link and the callback route.

An active account can enter the application shell and edit its name without
district grants. Its dashboard shows a welcome message until an administrator
assigns an area. Operational reads and writes still require district grants,
with database RLS and RPC checks. Role/access changes remain audited admin
operations. First-admin bootstrap remains an explicit operator task.

Hosted Auth settings and incremental migration deployment are owner operations;
this change does not authorize automatic remote database/configuration writes.

Provider behavior: https://supabase.com/docs/guides/auth/general-configuration
