import Link from "next/link";
import { requireAccess } from "@/server/auth/session";
import { Badge, Card, EmptyState, PageHeader, ghostButtonClass, ghostButtonStyle, linkButtonClass, linkButtonStyle } from "@/components/ui";
import { formatDate } from "@/lib/forms";
import { JOB_LABEL, JOB_STATUSES, JOB_TONE } from "@/lib/status";

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const ctx = await requireAccess("jobs.read");
  const { q, status } = await searchParams;
  let query = ctx.supabase
    .from("jobs")
    .select("id, number, title, status, delivery_deadline, customers(name)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status && JOB_LABEL[status]) query = query.eq("status", status);
  const term = (q ?? "").trim().replace(/[%,()]/g, " ");
  if (term) query = query.or(`number.ilike.%${term}%,title.ilike.%${term}%`);
  const { data: rows } = await query;

  return (
    <div>
      <PageHeader
        title="Jobs & Loads"
        subtitle="Every job moves from new to completed."
        action={
          ctx.permissions.has("jobs.write") ? (
            <Link href="/jobs/new" className={linkButtonClass} style={linkButtonStyle}>
              New job
            </Link>
          ) : null
        }
      />
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <input name="q" defaultValue={q ?? ""} placeholder="Job number or title" className="min-w-0 flex-1 rounded-xl border bg-transparent px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }} />
        <select name="status" defaultValue={status ?? ""} className="rounded-xl border bg-transparent px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}>
          <option value="">All statuses</option>
          {JOB_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <button type="submit" className={ghostButtonClass} style={ghostButtonStyle}>Filter</button>
      </form>
      <Card>
        {rows && rows.length > 0 ? (
          <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
            {rows.map((r) => (
              <li key={r.id}>
                <Link href={`/jobs/${r.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <span>
                    <span className="font-medium">{r.number}</span> {r.title}
                    <span className="block" style={{ color: "var(--muted)" }}>
                      {(r.customers as unknown as { name: string } | null)?.name}
                      {r.delivery_deadline ? ` · deadline ${formatDate(r.delivery_deadline)}` : ""}
                    </span>
                  </span>
                  <Badge tone={JOB_TONE[r.status] ?? "neutral"}>{JOB_LABEL[r.status] ?? r.status}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>{term || status ? "No jobs match." : "No jobs yet. Accept a quotation or create a job manually."}</EmptyState>
        )}
      </Card>
    </div>
  );
}
