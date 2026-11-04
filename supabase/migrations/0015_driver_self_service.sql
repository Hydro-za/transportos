-- Driver self-service: drivers (role Driver, permission driver.access) see only their own trips.

-- Override check only applies when the override reason is set or changed (so status updates by others are not blocked)
create or replace function public.check_trip_override() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.override_reason is not null and length(trim(new.override_reason)) > 0
     and (tg_op = 'INSERT' or new.override_reason is distinct from old.override_reason)
     and not private.has_permission(new.organization_id, 'dispatch.override') then
    raise exception 'You are not allowed to override allocation conflicts' using errcode = '42501';
  end if;
  if new.override_reason is not null and length(trim(new.override_reason)) = 0 then new.override_reason := null; end if;
  return new;
end $$;

create function private.my_driver_id() returns uuid language sql stable security definer set search_path = '' as $$
  select d.id from public.drivers d
  where d.user_id = (select auth.uid()) and d.status = 'active' and private.has_permission(d.organization_id, 'driver.access')
  limit 1
$$;
grant execute on function private.my_driver_id() to authenticated;

create function public.driver_trips()
returns table (trip_id uuid, trip_status text, planned_start timestamptz, planned_end timestamptz, job_id uuid, job_number text, job_title text,
  collection_address text, delivery_address text, cargo_description text, weight_kg numeric, customer_instructions text,
  customer_name text, vehicle_registration text, trailer_registration text, pod_count bigint)
language sql stable security definer set search_path = '' as $$
  select t.id, t.status, t.planned_start, t.planned_end, j.id, j.number, j.title, j.collection_address, j.delivery_address,
    j.cargo_description, j.weight_kg, j.customer_instructions, c.name, v.registration_no, tr.registration_no,
    (select count(*) from public.documents d where d.entity_type = 'job' and d.entity_id = j.id and d.category = 'pod')
  from public.trips t
  join public.jobs j on j.id = t.job_id and j.organization_id = t.organization_id
  join public.customers c on c.id = j.customer_id and c.organization_id = j.organization_id
  left join public.vehicles v on v.id = t.vehicle_id
  left join public.trailers tr on tr.id = t.trailer_id
  where t.driver_id = private.my_driver_id()
    and (t.status in ('dispatched','in_transit') or (t.status = 'completed' and t.updated_at > now() - interval '7 days'))
  order by t.planned_start
$$;

create function public.driver_set_trip_status(p_trip uuid, p_to text) returns void
language plpgsql security definer set search_path = '' as $$
declare t public.trips; me uuid := private.my_driver_id();
begin
  if me is null then raise exception 'Not allowed' using errcode = '42501'; end if;
  select * into t from public.trips where id = p_trip and driver_id = me for update;
  if not found then raise exception 'Trip not found'; end if;
  if not ((t.status = 'dispatched' and p_to = 'in_transit') or (t.status = 'in_transit' and p_to = 'completed')) then
    raise exception 'That status change is not allowed (trip is %)', t.status;
  end if;
  update public.trips set status = p_to where id = t.id;
  update public.jobs set status = case p_to when 'in_transit' then 'in_transit' else 'delivered' end where id = t.job_id and organization_id = t.organization_id;
  insert into public.job_events (organization_id, job_id, kind, note, created_by)
    values (t.organization_id, t.job_id, 'status', 'Driver marked trip ' || p_to, (select auth.uid()));
end $$;

create function public.driver_add_note(p_trip uuid, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare t public.trips; me uuid := private.my_driver_id();
begin
  if me is null then raise exception 'Not allowed' using errcode = '42501'; end if;
  select * into t from public.trips where id = p_trip and driver_id = me;
  if not found then raise exception 'Trip not found'; end if;
  if length(trim(coalesce(p_note,''))) = 0 or length(p_note) > 1000 then raise exception 'Invalid note'; end if;
  insert into public.job_events (organization_id, job_id, kind, note, created_by)
    values (t.organization_id, t.job_id, 'note', 'Driver: ' || trim(p_note), (select auth.uid()));
end $$;

-- Proof of delivery upload by the driver: folder <org>/pod/<job>/ in the documents bucket, only for jobs they are allocated to
create function private.driver_can_pod(path text) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.trips t
    where t.driver_id = private.my_driver_id()
      and t.organization_id = private.storage_org(path)
      and (storage.foldername(path))[2] = 'pod'
      and (storage.foldername(path))[3] = t.job_id::text
  )
$$;
grant execute on function private.driver_can_pod(text) to authenticated;
create policy documents_objects_driver_pod on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and private.driver_can_pod(name));

create function public.driver_register_pod(p_trip uuid, p_path text, p_mime text, p_size bigint, p_title text) returns void
language plpgsql security definer set search_path = '' as $$
declare t public.trips; me uuid := private.my_driver_id();
begin
  if me is null then raise exception 'Not allowed' using errcode = '42501'; end if;
  select * into t from public.trips where id = p_trip and driver_id = me;
  if not found then raise exception 'Trip not found'; end if;
  if p_path not like t.organization_id::text || '/pod/' || t.job_id::text || '/%' then raise exception 'Invalid path'; end if;
  insert into public.documents (organization_id, entity_type, entity_id, category, title, storage_path, mime_type, size_bytes, uploaded_by)
    values (t.organization_id, 'job', t.job_id, 'pod', left(coalesce(nullif(trim(p_title),''), 'Proof of delivery'), 200), p_path, p_mime, p_size, (select auth.uid()));
  insert into public.job_events (organization_id, job_id, kind, note, created_by)
    values (t.organization_id, t.job_id, 'note', 'Driver uploaded proof of delivery', (select auth.uid()));
end $$;

revoke all on function public.driver_trips(), public.driver_set_trip_status(uuid,text), public.driver_add_note(uuid,text), public.driver_register_pod(uuid,text,text,bigint,text) from public, anon;
grant execute on function public.driver_trips(), public.driver_set_trip_status(uuid,text), public.driver_add_note(uuid,text), public.driver_register_pod(uuid,text,text,bigint,text) to authenticated;
