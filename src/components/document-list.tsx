import { deleteDocument } from "@/app/(app)/documents/actions";
import { CATEGORIES } from "@/lib/documents";
import { formatDate } from "@/lib/forms";
import { EmptyState, ghostButtonClass, ghostButtonStyle } from "@/components/ui";

export type DocRow = { id: string; title: string; category: string; size_bytes: number; expiry_date: string | null; created_at: string; entity_type?: string };

export function DocumentList({ docs, returnTo, canDelete, today }: { docs: DocRow[]; returnTo: string; canDelete: boolean; today: string }) {
  if (!docs.length) return <EmptyState>No documents yet.</EmptyState>;
  const label = (c: string) => CATEGORIES.find((x) => x.value === c)?.label ?? c;
  return (
    <ul className="divide-y text-sm" style={{ borderColor: "var(--border)" }}>
      {docs.map((d) => {
        const expired = d.expiry_date && d.expiry_date < today;
        return (
          <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <span>
              <a href={`/documents/${d.id}/download`} className="font-medium underline">{d.title}</a>
              <span className="block" style={{ color: "var(--muted)" }}>
                {label(d.category)}{d.entity_type && d.entity_type !== "general" ? ` · ${d.entity_type}` : ""} · {(d.size_bytes / 1024).toFixed(0)} KB · {formatDate(d.created_at)}
                {d.expiry_date ? <span style={expired ? { color: "#d70015" } : undefined}> · {expired ? "expired" : "expires"} {formatDate(d.expiry_date)}</span> : null}
              </span>
            </span>
            {canDelete ? (
              <form action={deleteDocument}><input type="hidden" name="id" value={d.id} /><input type="hidden" name="return_to" value={returnTo} /><button className={ghostButtonClass} style={ghostButtonStyle}>Delete</button></form>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
