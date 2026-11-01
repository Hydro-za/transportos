import Link from "next/link";
import { getContext } from "@/server/auth/session";
import { formatZar } from "@/lib/money";
import { JOB_LABEL } from "@/lib/status";
import { expiryAlerts } from "@/lib/maintenance";
import { formatDate } from "@/lib/forms";

const ACTIVE_JOB = ["new", "awaiting_allocation", "scheduled", "ready_for_dispatch", "dispatched", "in_transit", "at_collection", "collected", "at_delivery", "delivered", "awaiting_pod", "on_hold"];

function Stat({ label, value, href, tone }: { label: string; value: string | number; href?: string; tone?: "bad" }) {
  const inner = (
    <div className="rounded-2xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <p className="text-xs" style={{ color: "var(--muted)" }}>{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight" style={tone === "bad" ? { color: "#d70015" } : undefined}>{value}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default async function DashboardPage() {
  const ctx = await getContext();
  if (!ctx.organizationId) {
    return (
      <div className="max-w-md">
        <h1 className="text-xl font-semibold">No access yet</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>Your login is not linked to the business. Please contact an owner.</p>
      </div>
    );
  }
  const can = (p: string) => ctx.permissions.has(p);
  const sb = ctx.supabase;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });
  const monthStart = today.slice(0, 8) + "01";

  const [jobs, quotes, invoices, payments, expenses, fuel, vehicles, drivers, trailers] = await Promise.all([
    can("jobs.read") ? sb.from("jobs").select("status").in("status", ACTIVE_JOB) : null,
    can("quotations.read") ? sb.from("quotations").select("id", { count: "exact", head: true }).in("status", ["sent", "viewed"]) : null,
    can("invoices.read") ? sb.from("invoices").select("status, due_date, total_cents").in("status", ["sent", "partially_paid", "overdue"]) : null,
    can("payments.read") ? sb.from("payments").select("amount_cents").gte("paid_on", monthStart) : null,
    can("expenses.read") ? sb.from("expenses").select("amount_cents").gte("expense_date", monthStart) : null,
    can("fuel.read") ? sb.from("fuel_records").select("total_cents").gte("fuel_date", monthStart) : null,
    can("fleet.read") ? sb.from("vehicles").select("status") : null,
    can("drivers.read") ? sb.from("drivers").select("full_name, licence_expiry, pdp_expiry").eq("status", "active") : null,
    can("fleet.read") ? sb.from("trailers").select("registration_no, licence_expiry") : null,
  ]);

  const jobRows = jobs?.data ?? [];
  const byStatus = new Map<string, number>();
  for (const j of jobRows) byStatus.set(j.status, (byStatus.get(j.status) ?? 0) + 1);

  // Outstanding = invoice totals minus payments recorded against them
  let outstanding = 0;
  let overdueCount = 0;
  if (invoices?.data?.length) {
    const { data: pays } = can("payments.read")
      ? await sb.from("payments").select("invoice_id, amount_cents, invoices!inner(status)").in("invoices.status", ["sent", "partially_paid", "overdue"])
      : { data: [] as { amount_cents: number }[] };
    const paidAll = (pays ?? []).reduce((s, p) => s + Number(p.amount_cents), 0);
    outstanding = invoices.data.reduce((s, i) => s + Number(i.total_cents), 0) - paidAll;
    overdueCount = invoices.data.filter((i) => i.due_date < today).length;
  }
  const received = (payments?.data ?? []).reduce((s, p) => s + Number(p.amount_cents), 0);
  const spent = (expenses?.data ?? []).reduce((s, e) => s + Number(e.amount_cents), 0) + (fuel?.data ?? []).reduce((s, f) => s + Number(f.total_cents), 0);
  const fleetRows = vehicles?.data ?? [];

  const alerts = expiryAlerts(
    [
      ...(drivers?.data ?? []).flatMap((d) => [
        { label: `${d.full_name}: driver licence`, date: d.licence_expiry as string | null },
        { label: `${d.full_name}: PDP`, date: d.pdp_expiry as string | null },
      ]),
      ...(trailers?.data ?? []).map((t) => ({ label: `Trailer ${t.registration_no}: licence`, date: t.licence_expiry as string | null })),
    ],
    today,
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{ctx.businessName}</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>Signed in as {ctx.user.email} · Role: {ctx.roleName}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {jobs ? <Stat label="Active jobs" value={jobRows.length} href="/jobs" /> : null}
        {quotes ? <Stat label="Quotations awaiting reply" value={quotes.count ?? 0} href="/quotations" /> : null}
        {invoices ? <Stat label="Outstanding invoices" value={formatZar(outstanding)} href="/invoices" /> : null}
        {invoices ? <Stat label="Overdue invoices" value={overdueCount} href="/invoices?status=overdue" tone={overdueCount ? "bad" : undefined} /> : null}
        {payments ? <Stat label="Received this month" value={formatZar(received)} /> : null}
        {expenses || fuel ? <Stat label="Expenses + fuel this month" value={formatZar(spent)} href="/expenses" /> : null}
        {vehicles ? <Stat label="Vehicles available" value={`${fleetRows.filter((v) => v.status === "available").length} of ${fleetRows.length}`} href="/fleet" /> : null}
        {vehicles ? <Stat label="In maintenance / out of service" value={fleetRows.filter((v) => ["maintenance", "out_of_service"].includes(v.status)).length} href="/fleet" /> : null}
      </div>

      {byStatus.size > 0 ? (
        <section className="mt-6 rounded-2xl border p-4 text-sm" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="mb-2 font-medium">Jobs by status</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-1">
            {[...byStatus.entries()].map(([s, n]) => <li key={s}>{JOB_LABEL[s] ?? s}: <span className="font-medium">{n}</span></li>)}
          </ul>
        </section>
      ) : null}

      {alerts.length > 0 ? (
        <section className="mt-4 rounded-2xl border p-4 text-sm" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="mb-2 font-medium">Expiry alerts</p>
          <ul className="space-y-1">
            {alerts.map((a) => (
              <li key={a.label + a.date} style={{ color: a.expired ? "#d70015" : "#b36b00" }}>{a.label} {a.expired ? "expired" : "expires"} {formatDate(a.date)}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
