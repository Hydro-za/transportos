create table public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete cascade,
  actor_id uuid,
  table_name text not null,
  row_id uuid,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_org_created_idx on public.audit_logs (organization_id, created_at desc);
create index audit_logs_row_idx on public.audit_logs (table_name, row_id);

alter table public.audit_logs enable row level security;
create policy audit_logs_select on public.audit_logs for select to authenticated
  using (organization_id is not null and public.has_permission(organization_id, 'audit.read'));
revoke insert, update, delete, truncate on public.audit_logs from anon, authenticated;

create function public.audit_logs_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_logs is append-only';
end;
$$;
create trigger audit_logs_no_update before update or delete on public.audit_logs
  for each row execute function public.audit_logs_immutable();

create function public.audit_trigger()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  j jsonb := to_jsonb(coalesce(new, old));
  org uuid;
begin
  if tg_table_name = 'organizations' then
    org := (j->>'id')::uuid;
  else
    org := (j->>'organization_id')::uuid;
  end if;

  insert into public.audit_logs (organization_id, actor_id, table_name, row_id, action, old_data, new_data)
  values (
    org,
    (select auth.uid()),
    tg_table_name,
    nullif(j->>'id','')::uuid,
    tg_op,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;
revoke all on function public.audit_trigger() from public, anon, authenticated;

create trigger audit_organizations after insert or update or delete on public.organizations
  for each row execute function public.audit_trigger();
create trigger audit_organization_members after insert or update or delete on public.organization_members
  for each row execute function public.audit_trigger();
create trigger audit_roles after insert or update or delete on public.roles
  for each row execute function public.audit_trigger();

-- Gap-safe per-company document numbering (internal; called by triggers on numbered tables)
create table public.document_sequences (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null check (kind in ('quotation','job','invoice')),
  year int not null,
  next_value int not null default 1,
  primary key (organization_id, kind, year)
);
alter table public.document_sequences enable row level security;
revoke all on public.document_sequences from anon, authenticated;

create function public.next_number(org uuid, p_kind text)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  tz text;
  yr int;
  n int;
  prefix text;
begin
  select timezone into tz from public.organizations where id = org;
  if tz is null then raise exception 'Unknown organization'; end if;
  yr := extract(year from (now() at time zone tz))::int;
  prefix := case p_kind when 'quotation' then 'Q' when 'job' then 'J' when 'invoice' then 'INV' else null end;
  if prefix is null then raise exception 'Unknown document kind %', p_kind; end if;

  insert into public.document_sequences (organization_id, kind, year, next_value)
  values (org, p_kind, yr, 2)
  on conflict (organization_id, kind, year)
  do update set next_value = public.document_sequences.next_value + 1
  returning next_value - 1 into n;

  return prefix || '-' || yr::text || '-' || lpad(n::text, 4, '0');
end;
$$;
revoke all on function public.next_number(uuid, text) from public, anon, authenticated;
