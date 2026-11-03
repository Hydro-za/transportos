-- Documents (including proof of delivery) with private storage
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null default 'general' check (entity_type in ('general','job','vehicle','trailer','driver','customer','invoice')),
  entity_id uuid,
  category text not null default 'other' check (category in ('pod','licence','insurance','registration','roadworthy','contract','invoice','photo','other')),
  title text not null check (length(trim(title)) between 1 and 200),
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  expiry_date date,
  notes text,
  uploaded_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((entity_type = 'general') = (entity_id is null)),
  check (storage_path like organization_id::text || '/%')
);
create index documents_entity_idx on public.documents (organization_id, entity_type, entity_id);
create index documents_expiry_idx on public.documents (organization_id, expiry_date) where expiry_date is not null;
select private.apply_standard_policies('documents','documents.read','documents.write');
create trigger audit_documents after insert or update or delete on public.documents for each row execute function public.audit_trigger();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 10485760, array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create function private.storage_org(path text) returns uuid language sql immutable set search_path = '' as $$
  select case when (storage.foldername(path))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then ((storage.foldername(path))[1])::uuid else null end
$$;
grant execute on function private.storage_org(text) to authenticated;

create policy documents_objects_select on storage.objects for select to authenticated
  using (bucket_id = 'documents' and private.has_permission(private.storage_org(name), 'documents.read'));
create policy documents_objects_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and private.has_permission(private.storage_org(name), 'documents.write'));
create policy documents_objects_delete on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and private.has_permission(private.storage_org(name), 'documents.write'));
