create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  registration_no text not null check (length(trim(registration_no)) >= 2),
  fleet_no text,
  vehicle_type text, make text, model text, year int check (year is null or year between 1950 and 2100),
  vin text, engine_no text,
  capacity_kg numeric(12,2) check (capacity_kg is null or capacity_kg >= 0),
  fuel_type text not null default 'diesel',
  odometer_km numeric(12,1) not null default 0 check (odometer_km >= 0),
  acquisition_date date, purchase_price_cents bigint check (purchase_price_cents is null or purchase_price_cents >= 0),
  status text not null default 'available' check (status in ('available','assigned','on_trip','maintenance','out_of_service')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);
create unique index vehicles_org_reg_uq on public.vehicles (organization_id, upper(registration_no));
select private.apply_standard_policies('vehicles','fleet.read','fleet.write');

create table public.trailers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  registration_no text not null check (length(trim(registration_no)) >= 2),
  trailer_type text,
  capacity_kg numeric(12,2) check (capacity_kg is null or capacity_kg >= 0),
  specifications text, licence_expiry date,
  status text not null default 'available' check (status in ('available','assigned','on_trip','maintenance','out_of_service')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);
create unique index trailers_org_reg_uq on public.trailers (organization_id, upper(registration_no));
select private.apply_standard_policies('trailers','fleet.read','fleet.write');

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null check (length(trim(full_name)) >= 2),
  phone text, email text,
  emergency_contact_name text, emergency_contact_phone text,
  licence_no text, licence_code text, licence_expiry date, pdp_expiry date,
  employment_start date,
  status text not null default 'active' check (status in ('active','on_leave','inactive')),
  user_id uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);
select private.apply_standard_policies('drivers','drivers.read','drivers.write');

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  job_id uuid not null,
  vehicle_id uuid, trailer_id uuid, driver_id uuid,
  planned_start timestamptz not null,
  planned_end timestamptz not null,
  status text not null default 'planned' check (status in ('planned','dispatched','in_transit','completed','cancelled')),
  override_reason text,
  start_odometer_km numeric(12,1), end_odometer_km numeric(12,1),
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (planned_end > planned_start),
  period tstzrange generated always as (tstzrange(planned_start, planned_end)) stored,
  unique (organization_id, id),
  foreign key (organization_id, job_id) references public.jobs (organization_id, id),
  foreign key (organization_id, vehicle_id) references public.vehicles (organization_id, id),
  foreign key (organization_id, trailer_id) references public.trailers (organization_id, id),
  foreign key (organization_id, driver_id) references public.drivers (organization_id, id),
  constraint trips_vehicle_no_overlap exclude using gist (vehicle_id with =, period with &&) where (status <> 'cancelled' and override_reason is null),
  constraint trips_trailer_no_overlap exclude using gist (trailer_id with =, period with &&) where (status <> 'cancelled' and override_reason is null),
  constraint trips_driver_no_overlap exclude using gist (driver_id with =, period with &&) where (status <> 'cancelled' and override_reason is null)
);
create index trips_org_job_idx on public.trips (organization_id, job_id);
select private.apply_standard_policies('trips','dispatch.read','dispatch.manage');

-- An override of a double booking needs the dispatch.override permission
create function public.check_trip_override() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.override_reason is not null and length(trim(new.override_reason)) > 0
     and not private.has_permission(new.organization_id, 'dispatch.override') then
    raise exception 'You are not allowed to override allocation conflicts' using errcode = '42501';
  end if;
  if new.override_reason is not null and length(trim(new.override_reason)) = 0 then new.override_reason := null; end if;
  return new;
end $$;
create trigger trips_override_check before insert or update on public.trips for each row execute function public.check_trip_override();

create trigger audit_vehicles after insert or update or delete on public.vehicles for each row execute function public.audit_trigger();
create trigger audit_trailers after insert or update or delete on public.trailers for each row execute function public.audit_trigger();
create trigger audit_drivers after insert or update or delete on public.drivers for each row execute function public.audit_trigger();
create trigger audit_trips after insert or update or delete on public.trips for each row execute function public.audit_trigger();
