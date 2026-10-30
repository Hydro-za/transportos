# TransportOS — CURRENT_STATUS

Last updated: 2026-10-30

## Environment
- Supabase project `transportos` (ref `xetkenscwizknicfobdb`), org tashmak, region eu-west-2 (London, UK — not EU, not SA). Separate from `printing-management`, which has not been touched.
- Vercel: no team (personal account). Not yet used.
- GitHub: not connected yet; no repo.

## Completed
- Architecture and schema design approved by Damian ("Ya good").
- Migrations applied to `transportos` only:
  - 0001 extensions (btree_gist, pg_trgm) + `set_updated_at`
  - 0002 tenancy core: organizations, user_profiles, roles, permissions, role_permissions, organization_members, platform_admins; RLS on all; composite FK so a member's role must belong to the same company; profile auto-created on sign-up
  - 0003 39 permissions, 6 role templates (Owner, Administrator, Dispatcher, Finance, Fleet Manager, Driver), `create_organization()` copies templates and makes the caller Owner
  - 0004 append-only `audit_logs` (triggers on organizations, members, roles), gap-safe `next_number()` (internal, called by triggers on numbered tables later)
  - 0005 RLS helper functions moved to `private` schema (not exposed through the API)

## Tests performed (rolled back, no test data left)
Two test companies/users: each sees only own company, members, roles, audit rows; cross-company update and member insert blocked; audit rows cannot be deleted; `next_number` not callable by users; numbering is per company (Q-2026-0001, 0002; other company starts at 0001); Owner role has 38 permissions.

## Known issues / to do
- Advisor notes: `document_sequences` and `platform_admins` have RLS but no policies (intentional, service role only); `create_organization` is callable by signed-in users (intentional).
- Members with `members.manage` could assign the Owner role; add a guard (only Owners assign Owner, cannot remove last Owner) before launch.
- Add rate limit on company creation.
- Migrations live only in Supabase for now; export them into `supabase/migrations/` once the repo exists.

## Remaining (Phase 1)
1. Connect GitHub, create `transportos` repo.
2. Scaffold Next.js app, deploy to Vercel (cpt1), set env vars.
3. Auth screens: sign-up, sign-in, create company, company switcher.
4. Server guard `requirePermission()` and Zod validation pattern.
5. Cross-tenant test suite in repo.

## Exact next task
Connect GitHub, then scaffold the Next.js app with Supabase auth and the create-company flow.
