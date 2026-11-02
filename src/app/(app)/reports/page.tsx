import Link from "next/link";
import { requireAccess } from "@/server/auth/session";
import { Card, EmptyState, PageHeader, ghostButtonClass, ghostButtonStyle } from "@/components/ui";
import { formatZar } from "@/lib/money";
import { jobProfit } from "@/lib/profit";

const isDate = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const ctx = await requireAccess("reports.financial");
  const sp = await searchParams;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });
  const from = isDate(sp.from) ? sp.from! : today.slice(0, 8) + "01";
  const to = isDate(sp.to) ? sp.to! : today;

  const { data: jobs } = await ctx.supabase.from("jobs").select("id, number, title, customers(name)").gte("created_at", from + "T00:00:00+02:00").lte("created_at", to + "T23:59:59+02:00").neq("status", "cancelled").order("created_at", { ascending: false }).limit(500);
  const ids = (jobs ?? []).map((j) => j.id);
  const [inv, exp] = ids.length
    ? await Promise.all([
        ctx.supabase.from("invoices").select("job_id, subtotal_cents, discount_cents, status").in("job_id", ids),
        ctx.supabase.from("expenses").select("job_id, amount_cents").in("job_id", ids),
      ])
    : [{ data: [] }, { data: [] }];
  const rows = jobProfit((jobs ?? []).map((j) => ({ id: j.id, number: j.number, title: j.title, customer: (j.customers as unknown as { name: string } | null)?.name ?? "" })), inv.data ?? [], exp.data ?? []);
  const tot = rows.reduce((a, r) => ({ rev: a.rev + r.invoicedCents, cost: a.cost + r.costCents }), { rev: 0, cost: 0 });

  const inputCls = "rounded-xl border bg-transparent px-3 py-2 text-sm";
  return (
    <div>
      <PageHeader title="Reports" subtitle="Job profitability: invoiced (excl. VAT) minus expenses linked to the job. Fuel is not yet allocated to jobs." />
      <form className="mb-4 flex flex-wrap items-end gap-2">
        <label className="text-xs">From<input type="date" name="from" defaultValue={from} className={`${inputCls} block`} style={{ borderColor: "var(--border)" }} /></label>
        <label className="text-xs">To<input type="date" name="to" defaultValue={to} className={`${inputCls} block`} style={{ borderColor: "var(--border)" }} /></label>
        <button className={ghostButtonClass} style={ghostButtonStyle}>Apply</button>
        <a href={`/reports/export?from=${from}&to=${to}`} className={ghostButtonClass} style={ghostButtonStyle}>Download CSV</a>
      </form>
      <Card>
        {rows.length ? (
          <table className="w-full text-sm">
            <thead><tr className="text-left" style={{ color: "var(--muted)" }}><th className="py-1">Job</th><th className="text-right">Invoiced</th><th className="text-right">Costs</th><th className="text-right">Profit</th><th className="text-right">Margin</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="py-2"><Link href={`/jobs/${r.id}`} className="font-medium">{r.number}</Link> <span style={{ color: "var(--muted)" }}>{r.customer} · {r.title}</span></td>
                  <td className="text-right">{formatZar(r.invoicedCents)}</td>
                  <td className="text-right">{formatZar(r.costCents)}</td>
                  <td className="text-right font-medium" style={r.profitCents < 0 ? { color: "#d70015" } : undefined}>{formatZar(r.profitCents)}</td>
                  <td className="text-right">{r.marginPct === null ? "-" : `${r.marginPct.toFixed(1)}%`}</td>
                </tr>
              ))}
              <tr className="border-t font-semibold" style={{ borderColor: "var(--border)" }}><td className="py-2">Total</td><td className="text-right">{formatZar(tot.rev)}</td><td className="text-right">{formatZar(tot.cost)}</td><td className="text-right">{formatZar(tot.rev - tot.cost)}</td><td /></tr>
            </tbody>
          </table>
        ) : <EmptyState>No jobs in this period.</EmptyState>}
      </Card>
    </div>
  );
}
