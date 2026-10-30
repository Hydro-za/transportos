create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter function public.is_org_member(uuid) set schema private;
alter function public.has_permission(uuid, text) set schema private;
alter function public.is_platform_admin() set schema private;
alter function public.shares_org_with(uuid) set schema private;

alter default privileges in schema private revoke execute on functions from public, anon;
