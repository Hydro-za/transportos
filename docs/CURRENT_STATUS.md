# TransportOS — CURRENT_STATUS

Last updated: 2026-10-31

## Environment
- Supabase project `transportos` (ref `xetkenscwizknicfobdb`), org tashmak, region eu-west-2 (London, UK — not EU, not SA). Separate from `printing-management`, which has not been touched.
- Vercel: project `transportos` in team trade-vision2 (shared with tashmak-system and tradevision-ai; do not touch those). Region cpt1 via vercel.json. First build on feature/foundation: READY (commit 93728c9).
- GitHub: Hydro-za/transportos (private). Work on branch feature/foundation; main is still empty.
- Sandbox cannot reach npm: packages are installed and built by Vercel only, so typecheck/build errors surface there.

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

## Business model (decided 2026-10-31)
TransportOS is sold to companies. No public sign-up. Platform admin (Damian, `/platform`) creates the company and the owner login (email + one-time temporary password); owner must change password on first sign-in. Migrations 0006 (`provision_organization`, service role only) and 0007 (self-service `create_organization` revoked). Old `create_organization` still exists but is not callable by users; drop later.

## Known issues / to do
- ACTION (Damian): in Supabase dashboard (project transportos) Authentication > Sign In / Providers, turn OFF "Allow new users to sign up". Until then anyone can create a login (they cannot create or join a company).
- Advisor notes: `document_sequences` and `platform_admins` have RLS but no policies (intentional, service role only); `create_organization` is callable by signed-in users (intentional).
- Members with `members.manage` could assign the Owner role; add a guard (only Owners assign Owner, cannot remove last Owner) before launch.
- Add rate limit on company creation.
- Vercel has Supabase-integration env vars (SUPABASE_URL, keys, POSTGRES_*) of unknown source project; verify they point at `transportos` (ref xetkenscwizknicfobdb) and not another project before using them.
- Production target currently deploys feature/foundation because main is empty; set production branch to main after first merge.

## Remaining (Phase 1)
1. Company switcher for users in more than one company; invite staff to a company (owner-created logins).
4. Server guard `requirePermission()` and Zod validation pattern.
5. Cross-tenant test suite in repo.

## Exact next task
Test the platform flow end to end (create company, owner first login, password change), then customers module.
