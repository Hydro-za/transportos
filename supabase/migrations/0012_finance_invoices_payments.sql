create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  number text not null,
  customer_id uuid not null,
  job_id uuid,
  status text not null default 'draft' check (status in ('draft','sent','partially_paid','paid','overdue','cancelled')),
  invoice_date date not null default current_date,
  due_date date not null,
  subtotal_cents bigint not null default 0,
  discount_cents bigint not null default 0 check (discount_cents >= 0),
  vat_cents bigint not null default 0,
  total_cents bigint not null default 0 check (total_cents >= 0),
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, number),
  unique (organization_id, id),
  foreign key (organization_id, customer_id) references public.customers (organization_id, id),
  foreign key (organization_id, job_id) references public.jobs (organization_id, id)
);
create index invoices_org_status_idx on public.invoices (organization_id, status);
create index invoices_org_customer_idx on public.invoices (organization_id, customer_id);
create trigger invoices_number before insert on public.invoices for each row execute function public.set_document_number('invoice');
select private.apply_standard_policies('invoices','invoices.read','invoices.write');

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  invoice_id uuid not null,
  description text not null,
  quantity numeric(12,3) not null check (quantity >= 0),
  unit_price_cents bigint not null check (unit_price_cents >= 0),
  vat_treatment text not null default 'standard' check (vat_treatment in ('standard','zero_rated','exempt')),
  vat_rate_pct numeric(5,2) not null default 15 check (vat_rate_pct between 0 and 100),
  line_total_cents bigint not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, invoice_id) references public.invoices (organization_id, id) on delete cascade
);
create index invoice_items_idx on public.invoice_items (organization_id, invoice_id);
select private.apply_standard_policies('invoice_items','invoices.read','invoices.write');

-- Payments are append-only: no edits or deletes by users
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  invoice_id uuid not null,
  amount_cents bigint not null check (amount_cents > 0),
  paid_on date not null default current_date,
  method text not null default 'eft' check (method in ('eft','cash','card','cheque','other')),
  reference text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  foreign key (organization_id, invoice_id) references public.invoices (organization_id, id)
);
create index payments_invoice_idx on public.payments (organization_id, invoice_id);
alter table public.payments enable row level security;
create policy payments_select on public.payments for select to authenticated using (private.has_permission(organization_id, 'payments.read'));
create policy payments_insert on public.payments for insert to authenticated with check (private.has_permission(organization_id, 'payments.write'));

-- An invoice only becomes paid / partially paid through recorded payments
create function public.apply_payment() returns trigger language plpgsql security definer set search_path = '' as $$
declare inv public.invoices; paid bigint;
begin
  select * into inv from public.invoices where id = new.invoice_id and organization_id = new.organization_id for update;
  if not found then raise exception 'Invoice not found'; end if;
  if inv.status not in ('sent','partially_paid','overdue') then
    raise exception 'Payments can only be recorded against sent invoices (status is %)', inv.status;
  end if;
  select coalesce(sum(amount_cents),0) into paid from public.payments where invoice_id = new.invoice_id;
  if paid > inv.total_cents then raise exception 'Payment exceeds the outstanding balance'; end if;
  update public.invoices set status = case when paid >= inv.total_cents then 'paid' else 'partially_paid' end where id = inv.id;
  return new;
end $$;
revoke all on function public.apply_payment() from public, anon, authenticated;
create trigger payments_apply after insert on public.payments for each row execute function public.apply_payment();

create trigger audit_invoices after insert or update or delete on public.invoices for each row execute function public.audit_trigger();
create trigger audit_payments after insert or update or delete on public.payments for each row execute function public.audit_trigger();
