# TransportOS — ARCHITECTURE

Status: PROPOSED (awaiting approval). Greenfield build.

## 1. Stack (approved)
Next.js (App Router) + React + TypeScript + Tailwind + Lucide. Supabase (Postgres, Auth, Storage, RLS). Vercel hosting, GitHub source control. Web app only; driver interface is a mobile-first PWA inside the same app.

## 2. Decisions locked
| Topic | Decision |
|---|---|
| Supabase region | EU (closest supported to SA). Dedicated new project, separate from existing ones. Verify region list before creating. Document DB, storage and backup locations in `docs/DATA_RESIDENCY.md` (POPIA). No "hosted in SA" claims. |
| Vercel region | Functions in `cpt1` (set in `vercel.json`). Note: DB round trips go to EU, so keep queries few per request. |
| Pricing | Rate cards: per customer, per route, or both, with company default rules as fallback. Resolution order: quotation manual override > customer+route > customer > route > company default. Stored as data, never hardcoded. |
| VAT | Default 15% standard, per-line options: standard, zero-rated, exempt. Rate and treatment are snapshotted onto each quotation/invoice line at issue time. Configurable per company. |
| WhatsApp | Click-to-share `wa.me` link with pre-filled text and signed PDF link. WhatsApp Business API deferred. |
| Driver app | Responsive PWA (installable, no native app). Offline queue deferred until Phase 4 review. |
| Money | `bigint` cents (ZAR) in every money column, named `*_cents`. Quantities and rates that need fractions use `numeric`. Round half-up per line; totals are sums of rounded lines. All calculation in one shared module `src/lib/money`, unit tested. |

## 3. Multi-tenancy
- Every company-owned table has `organization_id uuid not null` referencing `organizations(id)`.
- Membership lives in `organization_members(user_id, organization_id, role_id, status)`.
- RLS on every table, default deny. Policies use two `security definer`, `stable` helper functions with `search_path` pinned:
  - `is_org_member(org_id)`
  - `has_permission(org_id, 'jobs.update')`
- Policy pattern: `using (has_permission(organization_id, 'x.read'))`, `with check (has_permission(organization_id, 'x.write'))`.
- Composite foreign keys `(organization_id, id)` on child tables so a child can never point at another tenant's parent.
- Server code uses the user's JWT client, so RLS always applies. The service-role key lives only in `server-only` modules (platform admin, webhooks, jobs), never in client bundles or `NEXT_PUBLIC_*`.
- Platform admin: separate `platform_admins` table, checked in the backend. Never a role inside a tenant.

## 4. Roles and permissions
Permissions are rows (`resource.action`, e.g. `quotations.send`). Roles are per organization, seeded from system templates (Owner, Administrator, Dispatcher, Finance, Fleet Manager, Driver) and editable. Driver role is further restricted to rows linked to their own driver record (assigned jobs only) and has no finance permissions. Backend checks via `has_permission` in RLS plus a server-side `requirePermission()` guard for actions.

## 5. App structure
```
src/
  app/(auth)/ (app)/ (driver)/ (platform)/   route groups
  components/ui/                              glass design system
  features/<module>/ {actions,queries,schemas,components}
  server/db/                                  repositories (only place that calls Supabase)
  server/auth/                                session, requirePermission
  lib/money, lib/vat, lib/pricing, lib/numbering
supabase/migrations/                          ordered SQL, one concern each
```
Repository layer wraps all queries so a later move to plain Postgres is contained. Validation with Zod on every action. No business logic in components.

## 6. Cross-cutting rules
- **Numbering:** `document_sequences(organization_id, kind, year, next_value)`; `next_number()` locks the row, so numbers are gap-safe and unique per company.
- **Allocation conflicts:** `trips` has a `tstzrange` period; Postgres exclusion constraints (`btree_gist`) stop overlapping trips per vehicle, trailer and driver. Authorised overrides set `override_id`, which is excluded from the constraint and written to the audit log.
- **Audit:** append-only `audit_logs` fed by triggers on important tables (who, when, table, row, old/new). No update or delete policy.
- **Status history:** dedicated history tables for quotations and jobs, written in the same transaction as the status change.
- **Deletion:** soft delete (`deleted_at`) for business records; hard delete only for drafts. Financial documents are cancelled, never deleted.
- **Storage:** private buckets, path `{organization_id}/{entity}/{entity_id}/{file}`, storage policies match the first path segment to membership, access via short-lived signed URLs.
- **Tracking:** manual status and location updates only. `location_updates` table with a `source` column so GPS can plug in later. No "live" labels without a real source.
- **Estimates vs actuals:** reports label every figure `actual` or `estimated`.
- **Entitlements:** one `getEntitlements(org)` function reads plan limits from tables; nothing hardcoded.

## 7. Environments
Dev and production are separate Supabase projects and separate Vercel environment variable sets. Preview deployments use the dev project. Migrations applied via the Supabase migration workflow, reviewed in PRs. No secrets in git.

## 8. Known risks
1. DB in EU adds latency from `cpt1` functions: batch queries, avoid chatty pages.
2. RLS performance: index every `organization_id` and wrap helper calls so they evaluate once per query.
3. PDF generation on Vercel functions: use a lightweight server-side renderer, test cold starts and size limits.
4. POPIA: need a processing-location note, privacy policy and data-export/deletion path before real customers.
5. Free tiers: Supabase free projects pause after inactivity and have storage/backups limits; fine for development, not for paying customers.
