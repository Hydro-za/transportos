create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category text not null check (category in ('fuel','tolls','repairs','tyres','parts','driver','accommodation','loading','insurance','licensing','other')),
  description text not null check (length(trim(description)) >= 2),
  amount_cents bigint not null check (amount_cents > 0),
  expense_date date not null default current_date,
  supplier text, vehicle_id uuid, job_id uuid,
  payment_method text check (payment_method is null or payment_method in ('cash','card','eft','account','other')),
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, vehicle_id) references public.vehicles (organization_id, id),
  foreign key (organization_id, job_id) references public.jobs (organization_id, id)
);
create index expenses_org_date_idx on public.expenses (organization_id, expense_date desc);
select private.apply_standard_policies('expenses','expenses.read','expenses.write');

create table public.fuel_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid not null,
  fuel_date date not null default current_date,
  litres numeric(10,2) not null check (litres > 0),
  total_cents bigint not null check (total_cents > 0),
  station text,
  odometer_km numeric(12,1) not null check (odometer_km >= 0),
  full_tank boolean not null default true,
  job_id uuid,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, vehicle_id) references public.vehicles (organization_id, id),
  foreign key (organization_id, job_id) references public.jobs (organization_id, id)
);
create index fuel_org_vehicle_idx on public.fuel_records (organization_id, vehicle_id, fuel_date desc);
select private.apply_standard_policies('fuel_records','fuel.read','fuel.write');

create table public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid not null,
  kind text not null default 'service' check (kind in ('service','repair','inspection','other')),
  description text not null check (length(trim(description)) >= 2),
  status text not null default 'scheduled' check (status in ('scheduled','in_progress','completed','cancelled')),
  service_date date,
  odometer_km numeric(12,1) check (odometer_km is null or odometer_km >= 0),
  parts_cost_cents bigint not null default 0 check (parts_cost_cents >= 0),
  labour_cost_cents bigint not null default 0 check (labour_cost_cents >= 0),
  supplier text,
  next_service_km numeric(12,1), next_service_date date,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, vehicle_id) references public.vehicles (organization_id, id)
);
create index maintenance_org_vehicle_idx on public.maintenance_records (organization_id, vehicle_id, service_date desc);
select private.apply_standard_policies('maintenance_records','maintenance.read','maintenance.write');

create trigger audit_expenses after insert or update or delete on public.expenses for each row execute function public.audit_trigger();
create trigger audit_fuel after insert or update or delete on public.fuel_records for each row execute function public.audit_trigger();
create trigger audit_maintenance after insert or update or delete on public.maintenance_records for each row execute function public.audit_trigger();
