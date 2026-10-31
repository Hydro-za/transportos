-- Companies are provisioned by the platform operator only (service role). No self-service creation.
create function public.provision_organization(p_name text, p_slug text, p_owner uuid)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  org_id uuid;
  owner_role uuid;
  t record;
  new_role uuid;
begin
  if not exists (select 1 from auth.users where id = p_owner) then
    raise exception 'Owner user does not exist';
  end if;

  insert into public.organizations (name, slug, created_by)
  values (trim(p_name), lower(trim(p_slug)), p_owner)
  returning id into org_id;

  for t in select id, name, is_system from public.roles where organization_id is null loop
    insert into public.roles (organization_id, name, is_system)
    values (org_id, t.name, t.is_system)
    returning id into new_role;

    insert into public.role_permissions (role_id, permission_key)
    select new_role, permission_key from public.role_permissions where role_id = t.id;

    if t.name = 'Owner' then owner_role := new_role; end if;
  end loop;

  insert into public.organization_members (organization_id, user_id, role_id, status)
  values (org_id, p_owner, owner_role, 'active');

  return org_id;
end;
$$;
revoke all on function public.provision_organization(text, text, uuid) from public, anon, authenticated;
grant execute on function public.provision_organization(text, text, uuid) to service_role;
