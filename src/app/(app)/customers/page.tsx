import Link from "next/link";
import { requireAccess } from "@/server/auth/session";
import { Badge, Card, EmptyState, PageHeader, ghostButtonClass, ghostButtonStyle, linkButtonClass, linkButtonStyle } from "@/components/ui";
import { formatZar } from "@/lib/money";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const ctx = await requireAccess("customers.read");
  const { q, status } = await searchParams;
  const canWrite = ctx.permissions.has("customers.write");

  let query = ctx.supabase
    .from("customers")
    .select("id, name, contact_name, phone, email, payment_terms_days, credit_limit_cents, status")
    .order("name", { ascending: true })
    .limit(200);
  if (status === "active" || status === "inactive") query = query.eq("status", status);
  const term = (q ?? "").trim().replace(/[%,()]/g, " ");
  if (term) query = query.or(`name.ilike.%${term}%,contact_name.ilike.%${term}%,email.ilike.%${term}%`);
  const { data: customers } = await query;

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Companies you transport for."
        action={
          canWrite ? (
            <Link href="/customers/new" className={linkButtonClass} style={linkButtonStyle}>
              New customer
            </Link>
          ) : null
        }
      />
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name, contact or email"
          className="min-w-0 flex-1 rounded-xl border bg-transparent px-3 py-2 text-sm"
          style={{ borderColor: "var(--border)" }}
        />
        <select name="status" defaultValue={status ?? ""} className="rounded-xl border bg-transparent px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}>
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button type="submit" className={ghostButtonClass} style={ghostButtonStyle}>
          Search
        </button>
      </form>
      <Card>
        {customers && customers.length > 0 ? (
          <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
            {customers.map((c) => (
              <li key={c.id}>
                <Link href={`/customers/${c.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <span>
                    <span className="font-medium">{c.name}</span>
                    <span className="block" style={{ color: "var(--muted)" }}>
                      {[c.contact_name, c.phone, c.email].filter(Boolean).join(" · ") || "No contact details"}
                    </span>
                  </span>
                  <span className="flex items-center gap-3" style={{ color: "var(--muted)" }}>
                    <span>{c.payment_terms_days} days · limit {formatZar(c.credit_limit_cents)}</span>
                    <Badge tone={c.status === "active" ? "good" : "neutral"}>{c.status}</Badge>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>{term || status ? "No customers match your search." : "No customers yet. Add your first customer to get started."}</EmptyState>
        )}
      </Card>
    </div>
  );
}
