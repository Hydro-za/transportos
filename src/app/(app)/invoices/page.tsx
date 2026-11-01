import Link from "next/link";
import { requireAccess } from "@/server/auth/session";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { formatZar } from "@/lib/money";
import { formatDate } from "@/lib/forms";
import { INVOICE_TONE } from "@/lib/status";

const STATUS = ["all", "draft", "sent", "partially_paid", "paid", "overdue", "cancelled"];
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const ctx = await requireAccess("invoices.read");
  const { status } = await searchParams;
  const { data } = await ctx.supabase
    .from("invoices")
    .select("id, number, status, invoice_date, due_date, total_cents, customers(name)")
    .order("created_at", { ascending: false })
    .limit(300);
  const t = today();
  const all = (data ?? []).map((i) => ({ ...i, shown: ["sent", "partially_paid"].includes(i.status) && i.due_date < t ? "overdue" : i.status }));
  const rows = status && status !== "all" ? all.filter((i) => i.shown === status) : all;
  return (
    <div>
      <PageHeader title="Invoices" subtitle="Create invoices from a job's page. Payments are recorded on each invoice." />
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS.map((s) => {
          const on = (status ?? "all") === s;
          return (
            <Link key={s} href={s === "all" ? "/invoices" : `/invoices?status=${s}`} className={`rounded-xl px-3 py-1.5 text-sm font-medium ${on ? "text-white" : "border"}`} style={on ? { background: "var(--accent)" } : { borderColor: "var(--border)" }}>
              {s.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())}
            </Link>
          );
        })}
      </div>
      <Card>
        {rows.length ? (
          <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
            {rows.map((i) => (
              <li key={i.id}>
                <Link href={`/invoices/${i.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <span>
                    <span className="font-medium">{i.number}</span>
                    <span className="block" style={{ color: "var(--muted)" }}>
                      {(i.customers as unknown as { name: string } | null)?.name} · due {formatDate(i.due_date)}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-medium">{formatZar(i.total_cents)}</span>
                    <Badge tone={INVOICE_TONE[i.shown] ?? "neutral"}>{i.shown.replace(/_/g, " ")}</Badge>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>No invoices here yet.</EmptyState>
        )}
      </Card>
    </div>
  );
}
