import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAccess } from "@/server/auth/session";
import { Badge, Card, EmptyState, Notice, PageHeader, ghostButtonClass, ghostButtonStyle, linkButtonClass, linkButtonStyle } from "@/components/ui";
import { EntityForm } from "@/components/entity-form";
import { centsToRandsString } from "@/lib/money";
import { createResource, updateResource } from "./resource-actions";
import { RESOURCES, type Row } from "./resources";

function Tabs({ tabs, current }: { tabs?: { href: string; label: string }[]; current: string }) {
  if (!tabs) return null;
  return (
    <div className="mb-4 flex gap-2">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`rounded-xl px-3 py-1.5 text-sm font-medium ${t.href === current ? "text-white" : "border"}`}
          style={t.href === current ? { background: "var(--accent)" } : { borderColor: "var(--border)" }}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}

export async function ResourceListPage({ resource, searchParams }: { resource: string; searchParams: Promise<{ q?: string }> }) {
  const def = RESOURCES[resource];
  if (!def) notFound();
  const ctx = await requireAccess(def.readPerm);
  const { q } = await searchParams;
  const canWrite = ctx.permissions.has(def.writePerm);

  let query = ctx.supabase.from(def.table).select(def.select).order(def.order.column, { ascending: def.order.ascending }).limit(300);
  const term = (q ?? "").trim().replace(/[%,()]/g, " ");
  if (term && def.search?.length) query = query.or(def.search.map((c) => `${c}.ilike.%${term}%`).join(","));
  const { data } = await query;
  const rows: Row[] = def.enrich ? def.enrich((data ?? []) as unknown as Row[]) : ((data ?? []) as unknown as Row[]);
  const extra = def.extra ? await def.extra(ctx) : null;

  return (
    <div>
      <PageHeader
        title={def.title}
        subtitle={def.subtitle}
        action={
          canWrite ? (
            <Link href={`${def.path}/new`} className={linkButtonClass} style={linkButtonStyle}>
              New {def.singular}
            </Link>
          ) : null
        }
      />
      <Tabs tabs={def.tabs} current={def.path} />
      {extra}
      {def.search?.length ? (
        <form className="mb-4 flex gap-2" role="search">
          <input name="q" defaultValue={q ?? ""} placeholder="Search" className="min-w-0 flex-1 rounded-xl border bg-transparent px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }} />
          <button type="submit" className={ghostButtonClass} style={ghostButtonStyle}>Search</button>
        </form>
      ) : null}
      <Card>
        {rows.length > 0 ? (
          <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
            {rows.map((r) => {
              const l = def.line(r);
              return (
                <li key={r.id}>
                  <Link href={`${def.path}/${r.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <span>
                      <span className="font-medium">{l.title}</span>
                      {l.subtitle ? <span className="block" style={{ color: "var(--muted)" }}>{l.subtitle}</span> : null}
                    </span>
                    <span className="flex items-center gap-3">
                      {l.right ? <span className="font-medium">{l.right}</span> : null}
                      {l.badge ? <Badge tone={l.badge.tone}>{l.badge.text}</Badge> : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState>{term ? "Nothing matches your search." : `No ${def.singular}s yet.`}</EmptyState>
        )}
      </Card>
    </div>
  );
}

export async function ResourceNewPage({ resource }: { resource: string }) {
  const def = RESOURCES[resource];
  if (!def) notFound();
  const ctx = await requireAccess(def.writePerm);
  const fields = await def.fields(ctx);
  return (
    <div>
      <PageHeader
        title={`New ${def.singular}`}
        action={
          <Link href={def.path} className={ghostButtonClass} style={ghostButtonStyle}>
            Back
          </Link>
        }
      />
      <Card>
        <EntityForm fields={fields} action={createResource} hidden={{ resource: def.key }} initial={def.defaults as Record<string, string>} submitLabel={`Save ${def.singular}`} />
      </Card>
    </div>
  );
}

export async function ResourceDetailPage({ resource, id, saved }: { resource: string; id: string; saved?: string }) {
  const def = RESOURCES[resource];
  if (!def || !z.string().uuid().safeParse(id).success) notFound();
  const ctx = await requireAccess(def.readPerm);
  const { data } = await ctx.supabase.from(def.table).select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const row = data as Row;
  const fields = await def.fields(ctx);
  const canWrite = ctx.permissions.has(def.writePerm);

  const initial: Record<string, unknown> = { ...row };
  for (const f of fields) if (f.type === "money") initial[f.name] = centsToRandsString(row[`${f.name}_cents`]);

  return (
    <div>
      <PageHeader
        title={def.line(row).title}
        subtitle={def.singular}
        action={
          <Link href={def.path} className={ghostButtonClass} style={ghostButtonStyle}>
            Back
          </Link>
        }
      />
      {saved ? <Notice kind="info">Saved.</Notice> : null}
      <Card title={canWrite ? "Details" : "Details (read only)"}>
        {canWrite ? (
          <EntityForm fields={fields} action={updateResource} hidden={{ resource: def.key, id }} initial={initial as Record<string, string>} submitLabel="Save changes" />
        ) : (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.name}>
                <dt style={{ color: "var(--muted)" }}>{f.label}</dt>
                <dd className="whitespace-pre-wrap">{String(initial[f.name] ?? "") || "-"}</dd>
              </div>
            ))}
          </dl>
        )}
      </Card>
    </div>
  );
}
