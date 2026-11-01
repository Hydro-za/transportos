import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAccess } from "@/server/auth/session";
import { Badge, Card, Notice, PageHeader, ghostButtonClass, ghostButtonStyle } from "@/components/ui";
import { EntityForm } from "@/components/entity-form";
import { centsToRandsString, formatZar } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/forms";
import { QUOTATION_FIELDS } from "../fields";
import { convertToJob, duplicateQuotation, setQuotationStatus, updateQuotation } from "../actions";
import { QUOTE_TONE } from "../page";

function ActionButton({ id, to, label, action }: { id: string; to?: string; label: string; action: (fd: FormData) => Promise<void> }) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      {to ? <input type="hidden" name="to" value={to} /> : null}
      <button type="submit" className={ghostButtonClass} style={ghostButtonStyle}>
        {label}
      </button>
    </form>
  );
}

export default async function QuotationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const ctx = await requireAccess("quotations.read");
  const { id } = await params;
  const { saved, error } = await searchParams;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const { data: q } = await ctx.supabase.from("quotations").select("*, customers(name, email, phone)").eq("id", id).maybeSingle();
  if (!q) notFound();
  const { data: items } = await ctx.supabase.from("quotation_items").select("*").eq("quotation_id", id).order("sort_order");
  const { data: history } = await ctx.supabase.from("quotation_status_history").select("*").eq("quotation_id", id).order("created_at");
  const customer = q.customers as unknown as { name: string; email: string | null; phone: string | null } | null;

  const can = (p: string) => ctx.permissions.has(p);
  const inputs = (q.pricing_inputs ?? {}) as Record<string, string>;

  return (
    <div>
      <PageHeader
        title={q.number}
        subtitle={`${customer?.name ?? "Customer"} · version ${q.version}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={QUOTE_TONE[q.status] ?? "neutral"}>{q.status}</Badge>
            <Link href={`/print/quotations/${q.id}`} target="_blank" className={ghostButtonClass} style={ghostButtonStyle}>
              Print / PDF
            </Link>
            <Link href="/quotations" className={ghostButtonClass} style={ghostButtonStyle}>
              Back
            </Link>
          </div>
        }
      />
      {error ? <Notice kind="error">{error}</Notice> : null}
      {saved ? <Notice kind="info">Quotation saved.</Notice> : null}

      <div className="mb-6 flex flex-wrap gap-2">
        {q.status === "draft" && can("quotations.send") ? <ActionButton id={q.id} to="sent" label="Mark as sent" action={setQuotationStatus} /> : null}
        {(q.status === "sent" || q.status === "viewed") && can("quotations.write") ? (
          <>
            <ActionButton id={q.id} to="accepted" label="Customer accepted" action={setQuotationStatus} />
            <ActionButton id={q.id} to="rejected" label="Customer rejected" action={setQuotationStatus} />
            <ActionButton id={q.id} to="expired" label="Mark expired" action={setQuotationStatus} />
          </>
        ) : null}
        {q.status === "accepted" && can("quotations.convert") ? <ActionButton id={q.id} label="Convert to job" action={convertToJob} /> : null}
        {q.job_id ? (
          <Link href={`/jobs/${q.job_id}`} className={ghostButtonClass} style={ghostButtonStyle}>
            Open job
          </Link>
        ) : null}
        {can("quotations.write") ? <ActionButton id={q.id} label="Duplicate" action={duplicateQuotation} /> : null}
      </div>

      <Card title="Charges">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={{ color: "var(--muted)" }}>
              <th className="pb-2 font-medium">Description</th>
              <th className="pb-2 text-right font-medium">Amount (excl. VAT)</th>
            </tr>
          </thead>
          <tbody>
            {(items ?? []).map((i) => (
              <tr key={i.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                <td className="py-2 pr-3">{i.description}</td>
                <td className="py-2 text-right">{formatZar(i.line_total_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatZar(q.subtotal_cents)}</dd></div>
          {q.discount_cents > 0 ? <div className="flex justify-between"><dt>Discount</dt><dd>-{formatZar(q.discount_cents)}</dd></div> : null}
          <div className="flex justify-between"><dt>VAT</dt><dd>{formatZar(q.vat_cents)}</dd></div>
          <div className="flex justify-between border-t pt-1 text-base font-semibold" style={{ borderColor: "var(--border)" }}><dt>Total</dt><dd>{formatZar(q.total_cents)}</dd></div>
        </dl>
      </Card>

      <Card title={q.status === "draft" && can("quotations.write") ? "Edit quotation" : "Quotation details"}>
        {q.status === "draft" && can("quotations.write") ? (
          <EntityForm
            fields={QUOTATION_FIELDS}
            action={updateQuotation}
            hidden={{ id: q.id }}
            submitLabel="Save changes"
            initial={{ ...inputs, valid_until: q.valid_until, rate: centsToRandsString(q.rate_cents) }}
          />
        ) : (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {[
              ["Collection", q.collection_address], ["Delivery", q.delivery_address],
              ["Collection date", formatDate(q.collection_date)], ["Delivery date", formatDate(q.delivery_date)],
              ["Distance", q.distance_km ? `${q.distance_km} km` : ""], ["Truck type", q.truck_type],
              ["Cargo", q.cargo_description], ["Weight", q.weight_kg ? `${q.weight_kg} kg` : ""],
              ["Valid until", formatDate(q.valid_until)], ["Payment terms", q.payment_terms],
              ["Conditions", q.conditions], ["Notes", q.notes],
            ].map(([k, v]) => (
              <div key={k as string}>
                <dt style={{ color: "var(--muted)" }}>{k}</dt>
                <dd className="whitespace-pre-wrap">{(v as string) || "-"}</dd>
              </div>
            ))}
          </dl>
        )}
      </Card>

      <Card title="History">
        <ul className="space-y-1 text-sm">
          {(history ?? []).map((h) => (
            <li key={h.id} style={{ color: "var(--muted)" }}>
              {formatDateTime(h.created_at)}: {h.from_status ? `${h.from_status} → ` : "created as "}
              {h.to_status}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
