-- Tables
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  registration_no text,
  vat_no text,
  address jsonb not null default '{}'::jsonb,
  phone text,
  email text,
  logo_path text,
  currency text not null default 'ZAR',
  timezone text not null default 'Africa/Johannesburg',
  settings jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','suspended')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.permissions (
  key text primary key,
  description text not null
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 60),
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);
create unique index roles_org_name_uq on public.roles (organization_id, lower(name)) where organization_id is not null;
create unique index roles_template_name_uq on public.roles (lower(name)) where organization_id is null;

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  primary key (role_id, permission_key)
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null,
  status text not null default 'active' check (status in ('active','invited','disabled')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id),
  foreign key (role_id, organization_id) references public.roles (id, organization_id)
);
create index organization_members_user_idx on public.organization_members (user_id) where status = 'active';

create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- updated_at triggers
create trigger organizations_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger user_profiles_updated_at before update on public.user_profiles for each row execute function public.set_updated_at();
create trigger roles_updated_at before update on public.roles for each row execute function public.set_updated_at();
create trigger organization_members_updated_at before update on public.organization_members for each row execute function public.set_updated_at();

-- Helper functions (security definer, pinned search_path)
-- NOTE: created in public here and moved to the private schema in 0005.
create function public.is_org_member(org uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members m
    join public.organizations o on o.id = m.organization_id
    where m.organization_id = org
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and o.status = 'active'
  );
$$;

create function public.has_permission(org uuid, perm text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members m
    join public.organizations o on o.id = m.organization_id
    join public.role_permissions rp on rp.role_id = m.role_id
    where m.organization_id = org
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and o.status = 'active'
      and rp.permission_key = perm
  );
$$;

create function public.is_platform_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.platform_admins where user_id = (select auth.uid()));
$$;

create function public.shares_org_with(other uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members a
    join public.organization_members b on b.organization_id = a.organization_id
    where a.user_id = (select auth.uid()) and a.status = 'active'
      and b.user_id = other and b.status = 'active'
  );
$$;

revoke all on function public.is_org_member(uuid), public.has_permission(uuid, text), public.is_platform_admin(), public.shares_org_with(uuid) from public, anon;
grant execute on function public.is_org_member(uuid), public.has_permission(uuid, text), public.is_platform_admin(), public.shares_org_with(uuid) to authenticated;

-- Auto-create profile on sign-up
create function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.user_profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.organizations enable row level security;
alter table public.user_profiles enable row level security;
alter table public.permissions enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.organization_members enable row level security;
alter table public.platform_admins enable row level security;

create policy organizations_select on public.organizations for select to authenticated
  using (public.is_org_member(id));
create policy organizations_update on public.organizations for update to authenticated
  using (public.has_permission(id, 'settings.update'))
  with check (public.has_permission(id, 'settings.update'));

create policy user_profiles_select on public.user_profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_org_with(id));
create policy user_profiles_update on public.user_profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy permissions_select on public.permissions for select to authenticated using (true);

create policy roles_select on public.roles for select to authenticated
  using (organization_id is null or public.is_org_member(organization_id));
create policy roles_insert on public.roles for insert to authenticated
  with check (organization_id is not null and is_system = false and public.has_permission(organization_id, 'roles.manage'));
create policy roles_update on public.roles for update to authenticated
  using (organization_id is not null and is_system = false and public.has_permission(organization_id, 'roles.manage'))
  with check (organization_id is not null and is_system = false and public.has_permission(organization_id, 'roles.manage'));
create policy roles_delete on public.roles for delete to authenticated
  using (organization_id is not null and is_system = false and public.has_permission(organization_id, 'roles.manage'));

create policy role_permissions_select on public.role_permissions for select to authenticated
  using (exists (select 1 from public.roles r where r.id = role_id and (r.organization_id is null or public.is_org_member(r.organization_id))));
create policy role_permissions_write on public.role_permissions for all to authenticated
  using (exists (select 1 from public.roles r where r.id = role_id and r.organization_id is not null and r.is_system = false and public.has_permission(r.organization_id, 'roles.manage')))
  with check (exists (select 1 from public.roles r where r.id = role_id and r.organization_id is not null and r.is_system = false and public.has_permission(r.organization_id, 'roles.manage')));

create policy members_select on public.organization_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_org_member(organization_id));
create policy members_insert on public.organization_members for insert to authenticated
  with check (public.has_permission(organization_id, 'members.manage'));
create policy members_update on public.organization_members for update to authenticated
  using (public.has_permission(organization_id, 'members.manage'))
  with check (public.has_permission(organization_id, 'members.manage'));
create policy members_delete on public.organization_members for delete to authenticated
  using (public.has_permission(organization_id, 'members.manage'));
-- platform_admins: RLS on, no policies (service role only)
