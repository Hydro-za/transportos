import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAccess } from "@/server/auth/session";
import { Card, PageHeader, Notice, ghostButtonClass, ghostButtonStyle } from "@/components/ui";
import { EntityForm } from "@/components/entity-form";
import { centsToRandsString } from "@/lib/money";
import { CUSTOMER_FIELDS } from "../fields";
import { updateCustomer } from "../actions";

export default async function CustomerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const ctx = await requireAccess("customers.read");
  const { id } = await params;
  const { saved } = await searchParams;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const { data: c } = await ctx.supabase.from("customers").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();
  const canWrite = ctx.permissions.has("customers.write");

  return (
    <div>
      <PageHeader
        title={c.name}
        subtitle="Customer profile"
        action={
          <Link href="/customers" className={ghostButtonClass} style={ghostButtonStyle}>
            Back
          </Link>
        }
      />
      {saved ? <Notice kind="info">Customer saved.</Notice> : null}
      <Card title={canWrite ? "Details" : "Details (read only)"}>
        {canWrite ? (
          <EntityForm
            fields={CUSTOMER_FIELDS}
            action={updateCustomer}
            hidden={{ id: c.id }}
            initial={{ ...c, credit_limit: centsToRandsString(c.credit_limit_cents) }}
            submitLabel="Save changes"
          />
        ) : (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {CUSTOMER_FIELDS.map((f) => (
              <div key={f.name}>
                <dt style={{ color: "var(--muted)" }}>{f.label}</dt>
                <dd className="whitespace-pre-wrap">{String((f.name === "credit_limit" ? centsToRandsString(c.credit_limit_cents) : (c as Record<string, unknown>)[f.name]) ?? "") || "-"}</dd>
              </div>
            ))}
          </dl>
        )}
      </Card>
    </div>
  );
}
