import Link from "next/link";
import { requireAccess } from "@/server/auth/session";
import { Badge, Card, EmptyState, PageHeader, ghostButtonClass, ghostButtonStyle, linkButtonClass, linkButtonStyle } from "@/components/ui";
import { formatZar } from "@/lib/money";
import { formatDate } from "@/lib/forms";
import { QUOTE_TONE } from "@/lib/status";

const STATUSES = ["draft", "sent", "accepted", "rejected", "expired", "converted"];

export default async function QuotationsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const ctx = await requireAccess("quotations.read");
  const { q, status } = await searchParams;
  const canWrite = ctx.permissions.has("quotations.write");

  let query = ctx.supabase
    .from("quotations")
    .select("id, number, status, total_cents, valid_until, created_at, customers(name)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status && STATUSES.includes(status)) query = query.eq("status", status);
  const term = (q ?? "").trim().replace(/[%,()]/g, " ");
  if (term) query = query.ilike("number", `%${term}%`);
  const { data: rows } = await query;

  return (
    <div>
      <PageHeader
        title="Quotations"
        subtitle="Price transport work and turn accepted quotes into jobs."
        action={
          canWrite ? (
            <Link href="/quotations/new" className={linkButtonClass} style={linkButtonStyle}>
              New quotation
            </Link>
          ) : null
        }
      />
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <input name="q" defaultValue={q ?? ""} placeholder="Quotation number" className="min-w-0 flex-1 rounded-xl border bg-transparent px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }} />
        <select name="status" defaultValue={status ?? ""} className="rounded-xl border bg-transparent px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button type="submit" className={ghostButtonClass} style={ghostButtonStyle}>Filter</button>
      </form>
      <Card>
        {rows && rows.length > 0 ? (
          <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
            {rows.map((r) => (
              <li key={r.id}>
                <Link href={`/quotations/${r.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <span>
                    <span className="font-medium">{r.number}</span>
                    <span className="block" style={{ color: "var(--muted)" }}>
                      {(r.customers as unknown as { name: string } | null)?.name ?? "Customer"}
                      {r.valid_until ? ` · valid until ${formatDate(r.valid_until)}` : ""}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-medium">{formatZar(r.total_cents)}</span>
                    <Badge tone={QUOTE_TONE[r.status] ?? "neutral"}>{r.status}</Badge>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>{term || status ? "No quotations match." : "No quotations yet."}</EmptyState>
        )}
      </Card>
    </div>
  );
}
