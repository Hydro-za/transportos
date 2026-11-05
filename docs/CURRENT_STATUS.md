# Transport Manager — CURRENT_STATUS

Last updated: 2026-11-05

## Environment
- Supabase project `transportos` (ref `xetkenscwizknicfobdb`, eu-west-2 London). Separate from `printing-management` (untouched).
- Vercel project `transportos` in team trade-vision2, region cpt1. Shared team projects tashmak-system and tradevision-ai are untouched.
- GitHub `Hydro-za/transportos`, branch `feature/foundation` (main still empty). Latest Vercel build READY.
- Sandbox cannot reach npm; Vercel builds/typechecks. Pure logic tested with `npm test` (15 passing).

## Business model
One business, one installation, no public sign-up. Owners create Owner/Dispatcher logins at /team (temporary password, forced change on first sign-in). RLS on every table via organization_id and permissions.

## Built
- Auth, forced password change, Team, Settings (business details, VAT %, terms, bank details)
- Customers; Quotations (pricing methods, VAT, discount, printable PDF, accept, convert to job)
- Jobs & loads (status, timeline), Dispatch with allocation (trucks/trailers/drivers; DB-enforced double-booking protection, override needs dispatch.override)
- Fleet, trailers, drivers (licence/PDP expiry alerts), maintenance (service alerts), fuel (L/100 km, cost/km), expenses
- Invoices created from a job (copies quotation lines or agreed price), send, cancel, append-only payments (partial/full, overpay blocked), printable tax invoice, overdue shown by due date
- Dashboard: active jobs, quotes awaiting, outstanding/overdue invoices, month receipts and spend, fleet availability, expiry alerts
- Documents: private storage (4 MB per file because of Vercel request limits), expiry dates, signed one-minute download links; proof of delivery on each job
- Driver mobile view (/driver): drivers with a Driver login (created at /team and linked to a driver record) see only their own dispatched trips, start/deliver, message the office, upload proof of delivery. Enforced in the database (migration 0015) and tested
- Reports: job profitability by date range with CSV download (needs reports.financial)

## Not built yet
- Signature capture for proof of delivery; expiry notifications by email/push (alerts show on dashboard and lists only)
- Installable PWA wrapper for the driver view; live GPS tracking views; direct-to-storage uploads for files over 4 MB
- Rate cards / pricing rules in Settings; WhatsApp share link
- Customer page tabs (quotations/jobs/invoices); invoice line editing (cancel and recreate for now)
- Fuel is not allocated to jobs in profitability yet
- Audit log viewer; role/permission editor UI

## Not yet click-tested in a browser
Fleet/driver/maintenance/fuel/expenses, invoices/payments, dashboard, reports, documents, driver view. Builds pass; database logic was tested earlier (quote → job → trips → invoice → payments).

## To do / actions for Damian
- Supabase dashboard (project transportos) → Authentication → turn OFF "Allow new users to sign up".
- Change the temporary password on first sign-in (it was shown in chat).
- Cleanup migration later: drop platform_admins, provision_organization, create_organization.
- Dispatcher template includes dispatch.override; remove if dispatchers should not override conflicts.
- Guard so only Owners assign the Owner role; set production branch to main after merge.
