insert into public.permissions (key, description) values
 ('settings.read','View company settings'),
 ('settings.update','Edit company settings'),
 ('members.read','View staff and members'),
 ('members.manage','Invite, edit and remove members'),
 ('roles.manage','Create and edit roles and permissions'),
 ('audit.read','View audit logs'),
 ('customers.read','View customers'),
 ('customers.write','Create and edit customers'),
 ('customers.delete','Archive customers'),
 ('quotations.read','View quotations'),
 ('quotations.write','Create and edit quotations'),
 ('quotations.send','Send quotations to customers'),
 ('quotations.convert','Convert quotations to jobs'),
 ('jobs.read','View jobs'),
 ('jobs.write','Create and edit jobs'),
 ('jobs.complete','Complete jobs'),
 ('dispatch.read','View dispatch centre'),
 ('dispatch.manage','Allocate trucks, trailers and drivers'),
 ('dispatch.override','Override allocation conflicts'),
 ('fleet.read','View vehicles and trailers'),
 ('fleet.write','Create and edit vehicles and trailers'),
 ('drivers.read','View drivers and staff'),
 ('drivers.write','Create and edit drivers and staff'),
 ('maintenance.read','View maintenance'),
 ('maintenance.write','Record maintenance'),
 ('fuel.read','View fuel records'),
 ('fuel.write','Record fuel'),
 ('expenses.read','View expenses'),
 ('expenses.write','Record expenses'),
 ('invoices.read','View invoices'),
 ('invoices.write','Create and edit invoices'),
 ('invoices.send','Send invoices'),
 ('payments.read','View payments'),
 ('payments.write','Record payments'),
 ('documents.read','View documents'),
 ('documents.write','Upload and manage documents'),
 ('reports.read','View operational reports'),
 ('reports.financial','View financial reports and profitability'),
 ('driver.access','Driver interface: own assigned jobs, status updates, proof of delivery');

-- System role templates (organization_id null)
insert into public.roles (organization_id, name, is_system) values
 (null,'Owner',true),(null,'Administrator',false),(null,'Dispatcher',false),
 (null,'Finance',false),(null,'Fleet Manager',false),(null,'Driver',false);

-- Owner: everything except driver.access
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r cross join public.permissions p
where r.organization_id is null and r.name = 'Owner' and p.key <> 'driver.access';

insert into public.role_permissions (role_id, permission_key)
select r.id, k from public.roles r,
 unnest(array['settings.read','members.read','audit.read','customers.read','customers.write','quotations.read','quotations.write','quotations.send','quotations.convert','jobs.read','jobs.write','jobs.complete','dispatch.read','dispatch.manage','fleet.read','fleet.write','drivers.read','drivers.write','maintenance.read','maintenance.write','fuel.read','fuel.write','expenses.read','documents.read','documents.write','reports.read']) k
where r.organization_id is null and r.name = 'Administrator';

insert into public.role_permissions (role_id, permission_key)
select r.id, k from public.roles r,
 unnest(array['customers.read','quotations.read','jobs.read','jobs.write','dispatch.read','dispatch.manage','dispatch.override','fleet.read','drivers.read','documents.read','documents.write']) k
where r.organization_id is null and r.name = 'Dispatcher';

insert into public.role_permissions (role_id, permission_key)
select r.id, k from public.roles r,
 unnest(array['customers.read','quotations.read','quotations.write','quotations.send','quotations.convert','jobs.read','invoices.read','invoices.write','invoices.send','payments.read','payments.write','expenses.read','expenses.write','documents.read','documents.write','reports.read','reports.financial']) k
where r.organization_id is null and r.name = 'Finance';

insert into public.role_permissions (role_id, permission_key)
select r.id, k from public.roles r,
 unnest(array['fleet.read','fleet.write','drivers.read','maintenance.read','maintenance.write','fuel.read','fuel.write','expenses.read','expenses.write','documents.read','documents.write','jobs.read']) k
where r.organization_id is null and r.name = 'Fleet Manager';

insert into public.role_permissions (role_id, permission_key)
select r.id, 'driver.access' from public.roles r where r.organization_id is null and r.name = 'Driver';

-- Create a company: org + roles copied from templates + creator as Owner
create function public.create_organization(p_name text, p_slug text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  org_id uuid;
  owner_role uuid;
  t record;
  new_role uuid;
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  insert into public.organizations (name, slug, created_by)
  values (trim(p_name), lower(trim(p_slug)), uid)
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
  values (org_id, uid, owner_role, 'active');

  return org_id;
end;
$$;
revoke all on function public.create_organization(text, text) from public, anon;
grant execute on function public.create_organization(text, text) to authenticated;
