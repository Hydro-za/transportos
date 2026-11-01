import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAccess } from "@/server/auth/session";
import { Badge, Card, EmptyState, Notice, PageHeader, ghostButtonClass, ghostButtonStyle, linkButtonClass, linkButtonStyle } from "@/components/ui";
import { formatZar } from "@/lib/money";
import { formatDate } from "@/lib/forms";
import { INVOICE_TONE } from "@/lib/status";
import { recordPayment, setInvoiceStatus } from "../actions";

const inputCls = "rounded-xl border bg-transparent px-3 py-2 text-sm";
const bd = { borderColor: "var(--border)" } as const;

export default async function InvoicePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { id } = await params;
  const { saved, error } = await searchParams;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const ctx = await requireAccess("invoices.read");
  const { data: inv } = await ctx.supabase.from("invoices").select("*, customers(name), jobs(id, number)").eq("id", id).maybeSingle();
  if (!inv) notFound();
  const [{ data: items }, { data: pays }] = await Promise.all([
    ctx.supabase.from("invoice_items").select("*").eq("invoice_id", id).order("sort_order"),
    ctx.permissions.has("payments.read") ? ctx.supabase.from("payments").select("*").eq("invoice_id", id).order("paid_on") : Promise.resolve({ data: [] as { id: string; amount_cents: number; paid_on: string; method: string; reference: string | null }[] }),
  ]);
  const paid = (pays ?? []).reduce((s, p) => s + Number(p.amount_cents), 0);
  const balance = Number(inv.total_cents) - paid;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });
  const shown = ["sent", "partially_paid"].includes(inv.status) && inv.due_date < today ? "overdue" : inv.status;
  const job = inv.jobs as unknown as { id: string; number: string } | null;

  return (
    <div>
      <PageHeader
        title={inv.number}
        subtitle={`${(inv.customers as unknown as { name: string } | null)?.name ?? ""}${job ? ` · job ${job.number}` : ""}`}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={INVOICE_TONE[shown] ?? "neutral"}>{shown.replace(/_/g, " ")}</Badge>
            <Link href={`/print/invoices/${inv.id}`} target="_blank" className={ghostButtonClass} style={ghostButtonStyle}>Print / PDF</Link>
            <Link href="/invoices" className={ghostButtonClass} style={ghostButtonStyle}>Back</Link>
          </div>
        }
      />
      {error ? <Notice kind="error">{error}</Notice> : null}
      {saved ? <Notice kind="info">Saved.</Notice> : null}

      <div className="grid gap-4">
        <Card title="Lines">
          <table className="w-full text-sm">
            <thead><tr className="text-left" style={{ color: "var(--muted)" }}><th className="py-1">Description</th><th>Qty</th><th>Unit</th><th className="text-right">Total</th></tr></thead>
            <tbody>
              {(items ?? []).map((l) => (
                <tr key={l.id} className="border-t" style={bd}>
                  <td className="py-2">{l.description}{l.vat_treatment !== "standard" ? <span style={{ color: "var(--muted)" }}> ({l.vat_treatment.replace("_", " ")})</span> : null}</td>
                  <td>{Number(l.quantity)}</td>
                  <td>{formatZar(l.unit_price_cents)}</td>
                  <td className="text-right">{formatZar(l.line_total_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatZar(inv.subtotal_cents)}</dd></div>
            {Number(inv.discount_cents) > 0 ? <div className="flex justify-between"><dt>Discount</dt><dd>-{formatZar(inv.discount_cents)}</dd></div> : null}
            <div className="flex justify-between"><dt>VAT</dt><dd>{formatZar(inv.vat_cents)}</dd></div>
            <div className="flex justify-between font-semibold"><dt>Total</dt><dd>{formatZar(inv.total_cents)}</dd></div>
            <div className="flex justify-between"><dt>Paid</dt><dd>{formatZar(paid)}</dd></div>
            <div className="flex justify-between font-semibold"><dt>Balance due</dt><dd>{formatZar(balance)}</dd></div>
          </dl>
          <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>Invoice date {formatDate(inv.invoice_date)} · due {formatDate(inv.due_date)}</p>
        </Card>

        <div className="flex flex-wrap gap-2">
          {inv.status === "draft" && ctx.permissions.has("invoices.send") ? (
            <form action={setInvoiceStatus}><input type="hidden" name="id" value={inv.id} /><input type="hidden" name="to" value="sent" /><button className={linkButtonClass} style={linkButtonStyle}>Mark as sent</button></form>
          ) : null}
          {["draft", "sent"].includes(inv.status) && (pays ?? []).length === 0 && ctx.permissions.has("invoices.write") ? (
            <form action={setInvoiceStatus}><input type="hidden" name="id" value={inv.id} /><input type="hidden" name="to" value="cancelled" /><button className={ghostButtonClass} style={ghostButtonStyle}>Cancel invoice</button></form>
          ) : null}
        </div>

        {ctx.permissions.has("payments.read") ? (
          <Card title="Payments">
            {(pays ?? []).length ? (
              <ul className="divide-y text-sm" style={bd}>
                {(pays ?? []).map((p) => (
                  <li key={p.id} className="flex justify-between py-2"><span>{formatDate(p.paid_on)} · {p.method.toUpperCase()}{p.reference ? ` · ${p.reference}` : ""}</span><span className="font-medium">{formatZar(p.amount_cents)}</span></li>
                ))}
              </ul>
            ) : <EmptyState>No payments yet.</EmptyState>}
            {["sent", "partially_paid", "overdue"].includes(inv.status) && balance > 0 && ctx.permissions.has("payments.write") ? (
              <form action={recordPayment} className="mt-4 flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={inv.id} />
                <label className="text-xs">Amount (R)<input name="amount" required inputMode="decimal" placeholder={(balance / 100).toFixed(2)} className={`${inputCls} block w-32`} style={bd} /></label>
                <label className="text-xs">Date<input name="paid_on" type="date" required defaultValue={today} className={`${inputCls} block`} style={bd} /></label>
                <label className="text-xs">Method<select name="method" className={`${inputCls} block`} style={bd}><option value="eft">EFT</option><option value="cash">Cash</option><option value="card">Card</option><option value="cheque">Cheque</option><option value="other">Other</option></select></label>
                <label className="text-xs">Reference<input name="reference" maxLength={200} className={`${inputCls} block`} style={bd} /></label>
                <button className={linkButtonClass} style={linkButtonStyle}>Record payment</button>
              </form>
            ) : null}
          </Card>
        ) : null}
      </div>
    </div>
  );
}
