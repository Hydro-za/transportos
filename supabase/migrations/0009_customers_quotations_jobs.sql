-- Helper: standard RLS + updated_at for a tenant table
create function private.apply_standard_policies(tbl text, read_perm text, write_perm text)
returns void language plpgsql set search_path = '' as $$
begin
  execute format('alter table public.%I enable row level security', tbl);
  execute format('create policy %I on public.%I for select to authenticated using (private.has_permission(organization_id, %L))', tbl||'_select', tbl, read_perm);
  execute format('create policy %I on public.%I for insert to authenticated with check (private.has_permission(organization_id, %L))', tbl||'_insert', tbl, write_perm);
  execute format('create policy %I on public.%I for update to authenticated using (private.has_permission(organization_id, %L)) with check (private.has_permission(organization_id, %L))', tbl||'_update', tbl, write_perm, write_perm);
  execute format('create policy %I on public.%I for delete to authenticated using (private.has_permission(organization_id, %L))', tbl||'_delete', tbl, write_perm);
  execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', tbl||'_updated_at', tbl);
end $$;
revoke all on function private.apply_standard_policies(text,text,text) from public, anon, authenticated;

-- Document numbering trigger (security definer so users never call next_number directly)
create function public.set_document_number() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.number is null or new.number = '' then
    new.number := public.next_number(new.organization_id, tg_argv[0]);
  end if;
  return new;
end $$;
revoke all on function public.set_document_number() from public, anon, authenticated;

-- CUSTOMERS
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 160),
  registration_no text, vat_no text, contact_name text, email text, phone text,
  billing_address text, collection_address text, delivery_address text,
  payment_terms_days int not null default 30 check (payment_terms_days between 0 and 365),
  credit_limit_cents bigint not null default 0 check (credit_limit_cents >= 0),
  status text not null default 'active' check (status in ('active','inactive')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);
create unique index customers_org_name_uq on public.customers (organization_id, lower(name));
create index customers_trgm_idx on public.customers using gin (name extensions.gin_trgm_ops);
select private.apply_standard_policies('customers','customers.read','customers.write');

-- QUOTATIONS
create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  number text not null,
  customer_id uuid not null,
  status text not null default 'draft' check (status in ('draft','sent','viewed','accepted','rejected','expired','converted')),
  valid_until date,
  collection_address text, delivery_address text,
  collection_date date, delivery_date date,
  distance_km numeric(10,1) check (distance_km is null or distance_km >= 0),
  cargo_description text, cargo_category text,
  weight_kg numeric(12,2) check (weight_kg is null or weight_kg >= 0),
  packages int check (packages is null or packages >= 0),
  truck_type text, handling_notes text,
  pricing_method text not null default 'fixed' check (pricing_method in ('fixed','per_km','per_tonne','per_km_tonne','custom')),
  rate_cents bigint not null default 0 check (rate_cents >= 0),
  subtotal_cents bigint not null default 0,
  discount_cents bigint not null default 0 check (discount_cents >= 0),
  vat_cents bigint not null default 0,
  total_cents bigint not null default 0,
  payment_terms text, conditions text, notes text,
  job_id uuid,
  version int not null default 1,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, number),
  unique (organization_id, id),
  foreign key (organization_id, customer_id) references public.customers (organization_id, id)
);
create index quotations_org_status_idx on public.quotations (organization_id, status);
create index quotations_org_customer_idx on public.quotations (organization_id, customer_id);
create trigger quotations_number before insert on public.quotations for each row execute function public.set_document_number('quotation');
select private.apply_standard_policies('quotations','quotations.read','quotations.write');

create table public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  quotation_id uuid not null,
  description text not null,
  quantity numeric(12,3) not null check (quantity >= 0),
  unit_price_cents bigint not null check (unit_price_cents >= 0),
  vat_treatment text not null default 'standard' check (vat_treatment in ('standard','zero_rated','exempt')),
  vat_rate_pct numeric(5,2) not null default 15 check (vat_rate_pct between 0 and 100),
  line_total_cents bigint not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, quotation_id) references public.quotations (organization_id, id) on delete cascade
);
create index quotation_items_q_idx on public.quotation_items (organization_id, quotation_id);
select private.apply_standard_policies('quotation_items','quotations.read','quotations.write');

create table public.quotation_status_history (
  id bigint generated always as identity primary key,
  organization_id uuid not null,
  quotation_id uuid not null,
  from_status text, to_status text not null,
  changed_by uuid, comment text,
  created_at timestamptz not null default now(),
  foreign key (organization_id, quotation_id) references public.quotations (organization_id, id) on delete cascade
);
create index quotation_status_history_idx on public.quotation_status_history (organization_id, quotation_id, created_at);
alter table public.quotation_status_history enable row level security;
create policy quotation_status_history_select on public.quotation_status_history for select to authenticated using (private.has_permission(organization_id, 'quotations.read'));

create function public.log_quotation_status() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.quotation_status_history (organization_id, quotation_id, from_status, to_status, changed_by) values (new.organization_id, new.id, null, new.status, (select auth.uid()));
  elsif new.status is distinct from old.status then
    insert into public.quotation_status_history (organization_id, quotation_id, from_status, to_status, changed_by) values (new.organization_id, new.id, old.status, new.status, (select auth.uid()));
  end if;
  return new;
end $$;
revoke all on function public.log_quotation_status() from public, anon, authenticated;
create trigger quotations_status_log after insert or update on public.quotations for each row execute function public.log_quotation_status();

-- JOBS
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  number text not null,
  customer_id uuid not null,
  quotation_id uuid,
  title text not null check (length(trim(title)) >= 2),
  status text not null default 'new' check (status in ('new','awaiting_allocation','scheduled','ready_for_dispatch','dispatched','in_transit','at_collection','collected','at_delivery','delivered','awaiting_pod','completed','cancelled','on_hold')),
  collection_address text, delivery_address text,
  collection_date date, delivery_deadline date,
  cargo_description text,
  weight_kg numeric(12,2) check (weight_kg is null or weight_kg >= 0),
  packages int check (packages is null or packages >= 0),
  agreed_price_cents bigint not null default 0 check (agreed_price_cents >= 0),
  customer_instructions text, internal_notes text,
  completed_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, number),
  unique (organization_id, id),
  foreign key (organization_id, customer_id) references public.customers (organization_id, id),
  foreign key (organization_id, quotation_id) references public.quotations (organization_id, id)
);
create index jobs_org_status_idx on public.jobs (organization_id, status);
create index jobs_org_customer_idx on public.jobs (organization_id, customer_id);
create trigger jobs_number before insert on public.jobs for each row execute function public.set_document_number('job');
select private.apply_standard_policies('jobs','jobs.read','jobs.write');

create table public.job_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null,
  job_id uuid not null,
  kind text not null default 'note' check (kind in ('note','status','delay','location','allocation','system')),
  note text not null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  foreign key (organization_id, job_id) references public.jobs (organization_id, id) on delete cascade
);
create index job_events_idx on public.job_events (organization_id, job_id, created_at);
alter table public.job_events enable row level security;
create policy job_events_select on public.job_events for select to authenticated using (private.has_permission(organization_id, 'jobs.read'));
create policy job_events_insert on public.job_events for insert to authenticated with check (private.has_permission(organization_id, 'jobs.write'));

create function public.log_job_status() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.job_events (organization_id, job_id, kind, note, created_by) values (new.organization_id, new.id, 'status', 'Job created as ' || new.status, (select auth.uid()));
  elsif new.status is distinct from old.status then
    insert into public.job_events (organization_id, job_id, kind, note, created_by) values (new.organization_id, new.id, 'status', old.status || ' -> ' || new.status, (select auth.uid()));
  end if;
  return new;
end $$;
revoke all on function public.log_job_status() from public, anon, authenticated;
create trigger jobs_status_log after insert or update on public.jobs for each row execute function public.log_job_status();

-- Convert an accepted quotation into a job, atomically
create function public.convert_quotation_to_job(p_quotation uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare q public.quotations; c public.customers; j uuid;
begin
  select * into q from public.quotations where id = p_quotation for update;
  if not found then raise exception 'Quotation not found'; end if;
  if not private.has_permission(q.organization_id, 'quotations.convert') then raise exception 'Not allowed' using errcode = '42501'; end if;
  if q.status <> 'accepted' then raise exception 'Only accepted quotations can be converted'; end if;
  if q.job_id is not null then raise exception 'Quotation already converted'; end if;
  select * into c from public.customers where id = q.customer_id;
  insert into public.jobs (organization_id, customer_id, quotation_id, title, status, collection_address, delivery_address, collection_date, delivery_deadline, cargo_description, weight_kg, packages, agreed_price_cents, customer_instructions)
  values (q.organization_id, q.customer_id, q.id, c.name || ' - ' || coalesce(q.collection_address,'?') || ' to ' || coalesce(q.delivery_address,'?'), 'new', q.collection_address, q.delivery_address, q.collection_date, q.delivery_date, q.cargo_description, q.weight_kg, q.packages, q.total_cents, q.handling_notes)
  returning id into j;
  update public.quotations set job_id = j, status = 'converted', version = version + 1 where id = q.id;
  return j;
end $$;
revoke all on function public.convert_quotation_to_job(uuid) from public, anon;
grant execute on function public.convert_quotation_to_job(uuid) to authenticated;

-- Audit trail
create trigger audit_customers after insert or update or delete on public.customers for each row execute function public.audit_trigger();
create trigger audit_quotations after insert or update or delete on public.quotations for each row execute function public.audit_trigger();
create trigger audit_jobs after insert or update or delete on public.jobs for each row execute function public.audit_trigger();
