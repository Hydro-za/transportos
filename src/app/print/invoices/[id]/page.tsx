import { notFound } from "next/navigation";
import { z } from "zod";
import { getBusinessSettings, requireAccess } from "@/server/auth/session";
import { formatZar } from "@/lib/money";
import { formatDate } from "@/lib/forms";
import { PrintButton } from "../../quotations/[id]/print-button";

export default async function PrintInvoice({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAccess("invoices.read");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const { data: inv } = await ctx.supabase.from("invoices").select("*, customers(name, vat_no, billing_address), jobs(number)").eq("id", id).maybeSingle();
  if (!inv) notFound();
  const { data: items } = await ctx.supabase.from("invoice_items").select("*").eq("invoice_id", id).order("sort_order");
  const biz = await getBusinessSettings(ctx);
  const c = inv.customers as unknown as { name: string; vat_no: string | null; billing_address: string | null } | null;
  const job = inv.jobs as unknown as { number: string } | null;
  let paid = 0;
  if (ctx.permissions.has("payments.read")) {
    const { data: pays } = await ctx.supabase.from("payments").select("amount_cents").eq("invoice_id", id);
    paid = (pays ?? []).reduce((s, p) => s + Number(p.amount_cents), 0);
  }
  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-sm text-black" style={{ minHeight: "100vh" }}>
      <div className="mb-6 flex justify-end"><PrintButton /></div>
      <header className="flex justify-between gap-6 border-b pb-4">
        <div>
          <h1 className="text-2xl font-semibold">{biz.name}</h1>
          <p className="whitespace-pre-line">{biz.address}</p>
          <p>{[biz.phone, biz.email].filter(Boolean).join(" · ")}</p>
          <p>{[biz.registration_no && `Reg: ${biz.registration_no}`, biz.vat_no && `VAT: ${biz.vat_no}`].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold">TAX INVOICE</p>
          <p>{inv.number}</p>
          <p>Date: {formatDate(inv.invoice_date)}</p>
          <p>Due: {formatDate(inv.due_date)}</p>
          {job ? <p>Job: {job.number}</p> : null}
        </div>
      </header>
      <section className="mt-4">
        <p className="font-semibold">Billed to</p>
        <p>{c?.name}</p>
        <p className="whitespace-pre-line">{c?.billing_address}</p>
        {c?.vat_no ? <p>VAT: {c.vat_no}</p> : null}
      </section>
      <table className="mt-6 w-full">
        <thead><tr className="border-b text-left"><th className="py-2">Description</th><th className="py-2 text-right">Amount (excl. VAT)</th></tr></thead>
        <tbody>
          {(items ?? []).map((i) => (
            <tr key={i.id} className="border-b"><td className="py-2 pr-3">{i.description}</td><td className="py-2 text-right">{formatZar(i.line_total_cents)}</td></tr>
          ))}
        </tbody>
      </table>
      <dl className="ml-auto mt-4 max-w-xs space-y-1">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatZar(inv.subtotal_cents)}</dd></div>
        {inv.discount_cents > 0 ? <div className="flex justify-between"><dt>Discount</dt><dd>-{formatZar(inv.discount_cents)}</dd></div> : null}
        <div className="flex justify-between"><dt>VAT</dt><dd>{formatZar(inv.vat_cents)}</dd></div>
        <div className="flex justify-between border-t pt-1 text-base font-semibold"><dt>Total (ZAR)</dt><dd>{formatZar(inv.total_cents)}</dd></div>
        {paid > 0 ? <div className="flex justify-between"><dt>Paid</dt><dd>{formatZar(paid)}</dd></div> : null}
        {paid > 0 ? <div className="flex justify-between font-semibold"><dt>Balance due</dt><dd>{formatZar(Number(inv.total_cents) - paid)}</dd></div> : null}
      </dl>
      {biz.bankDetails ? <section className="mt-6"><p className="font-semibold">Banking details</p><p className="whitespace-pre-line">{biz.bankDetails}</p></section> : null}
      {inv.notes ? <section className="mt-4"><p className="font-semibold">Payment terms</p><p className="whitespace-pre-line">{inv.notes}</p></section> : null}
    </div>
  );
}
