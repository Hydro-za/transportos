import { NextResponse } from "next/server";
import { getContext } from "@/server/auth/session";
import { jobProfit } from "@/lib/profit";

const isDate = (v: string | null) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
const csv = (v: string | number) => `"${String(v).replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"`;

export async function GET(req: Request) {
  const ctx = await getContext();
  if (!ctx.organizationId || !ctx.permissions.has("reports.financial")) return new NextResponse("Forbidden", { status: 403 });
  const u = new URL(req.url);
  const from = u.searchParams.get("from");
  const to = u.searchParams.get("to");
  if (!isDate(from) || !isDate(to)) return new NextResponse("Bad dates", { status: 400 });
  const { data: jobs } = await ctx.supabase.from("jobs").select("id, number, title, customers(name)").gte("created_at", from + "T00:00:00+02:00").lte("created_at", to + "T23:59:59+02:00").neq("status", "cancelled").limit(2000);
  const ids = (jobs ?? []).map((j) => j.id);
  const [inv, exp] = ids.length
    ? await Promise.all([ctx.supabase.from("invoices").select("job_id, subtotal_cents, discount_cents, status").in("job_id", ids), ctx.supabase.from("expenses").select("job_id, amount_cents").in("job_id", ids)])
    : [{ data: [] }, { data: [] }];
  const rows = jobProfit((jobs ?? []).map((j) => ({ id: j.id, number: j.number, title: j.title, customer: (j.customers as unknown as { name: string } | null)?.name ?? "" })), inv.data ?? [], exp.data ?? []);
  const r2 = (c: number) => (c / 100).toFixed(2);
  const body = ["Job,Customer,Title,Invoiced (excl VAT),Costs,Profit,Margin %", ...rows.map((r) => [r.number, r.customer, r.title, r2(r.invoicedCents), r2(r.costCents), r2(r.profitCents), r.marginPct === null ? "" : r.marginPct.toFixed(1)].map(csv).join(","))].join("\n");
  return new NextResponse(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="job-profitability-${from}-to-${to}.csv"` } });
}
