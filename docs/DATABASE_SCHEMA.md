# TransportOS — DATABASE_SCHEMA

Status: PROPOSED. Phase 1–3 tables detailed; later phases listed for planning only. Conventions: `uuid` PKs (`gen_random_uuid()`), `organization_id` on every tenant table, `created_at/updated_at timestamptz`, `deleted_at` where soft delete applies, money as `bigint *_cents`, RLS enabled on all tables.

## Migration order
0001 extensions + helpers → 0002 tenancy/auth → 0003 permissions/roles → 0004 audit + numbering → 0005 customers → 0006 pricing → 0007 quotations → 0008 jobs.

## Phase 1 — Foundation
**organizations**: id, name, slug (unique), registration_no, vat_no, address (jsonb), phone, email, logo_path, currency (default ZAR), timezone (default Africa/Johannesburg), settings (jsonb), status (active|suspended).
**user_profiles**: id (= auth.users.id), full_name, phone, avatar_path.
**organization_members**: id, organization_id, user_id, role_id, status (active|invited|disabled), invited_by. Unique (organization_id, user_id).
**roles**: id, organization_id (null for system templates), name, is_system. Unique (organization_id, name).
**permissions**: key (PK, e.g. `quotations.send`), description.
**role_permissions**: role_id, permission_key. PK both.
**platform_admins**: user_id PK.
**audit_logs**: id, organization_id, actor_id, table_name, row_id, action, old_data, new_data, created_at. Insert-only.
**document_sequences**: organization_id, kind (quotation|job|invoice), year, next_value. PK (organization_id, kind, year).

Helpers: `is_org_member(uuid)`, `has_permission(uuid, text)`, `next_number(uuid, text)`, `set_updated_at()` trigger, `audit_trigger()`.

## Phase 3 — Core business
**customers**: id, organization_id, name, registration_no, vat_no, payment_terms_days, credit_limit_cents, status, notes, deleted_at. Unique (organization_id, lower(name)) where not deleted.
**customer_contacts**: id, organization_id, customer_id, name, email, phone, is_primary.
**customer_addresses**: id, organization_id, customer_id, kind (billing|collection|delivery), line1, line2, suburb, city, province, postal_code, country (default ZA), lat, lng.

**pricing_rule_sets** (company defaults): id, organization_id, name, method (fixed|per_km|per_tonne|per_km_tonne|custom), rate_cents, minimum_charge_cents, fuel_surcharge_pct, is_default.
**rate_cards**: id, organization_id, customer_id (nullable), origin, destination, route_key (nullable), method, rate_cents, valid_from, valid_to. Specificity decides resolution order (see ARCHITECTURE).
**charge_types**: id, organization_id, name (fuel surcharge, loading, waiting, tolls…), default_amount_cents, vat_treatment.

**quotations**: id, organization_id, number (unique per org), customer_id, status (draft|sent|viewed|accepted|rejected|expired|converted), valid_until, collection_address, delivery_address, collection_date, delivery_date, distance_km numeric, cargo_description, cargo_category, weight_kg numeric, dimensions (jsonb), packages, truck_type, handling_notes, pricing_method, pricing_snapshot (jsonb: resolved rate and rule used), subtotal_cents, discount_cents, vat_cents, total_cents, terms (jsonb: payment, conditions, cancellation), notes, job_id (nullable), version.
**quotation_items**: id, organization_id, quotation_id, description, quantity numeric, unit_price_cents, vat_treatment, vat_rate_pct, line_total_cents, sort_order.
**quotation_stops**: id, organization_id, quotation_id, sequence, address, kind.
**quotation_status_history**: id, organization_id, quotation_id, from_status, to_status, changed_by, comment, snapshot (jsonb), created_at.

**jobs**: id, organization_id, reference (unique per org), customer_id, quotation_id (nullable), title, status (enum of the 14 statuses in spec), collection/delivery fields copied from quotation, cargo fields, agreed_price_cents, customer_instructions, internal_notes.
**job_stops**, **job_status_history**, **job_notes** follow the same pattern.

## Later phases (planning only)
- Phase 4: vehicles, trailers, drivers, trips (tstzrange + exclusion constraints), vehicle_assignments, dispatch_records, location_updates, delivery_confirmations, proof_of_delivery.
- Phase 5: maintenance_records, fuel_records, expenses (+ job_id/vehicle_id links), documents (polymorphic link: entity_type, entity_id, storage_path).
- Phase 6: invoices, invoice_items, payments (invoice status derived from payments), accounting_exports.
- Phase 8: subscription_plans, plan_limits, subscriptions, usage_counters.

## Indexes (baseline)
`(organization_id)` on every table; `(organization_id, status)` on quotations, jobs; `(organization_id, customer_id)` on quotations, jobs; unique `(organization_id, number)` on numbered documents; trigram index on customer name for search.

## Open schema items
- Whether VAT-registered status changes mid-year need a history table.
- Whether rate cards need route geometry or just text keys for v1 (proposal: text keys, add geometry later).
