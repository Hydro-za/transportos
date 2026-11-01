import { notFound } from "next/navigation";
import { z } from "zod";
import { getBusinessSettings, requireAccess } from "@/server/auth/session";
import { formatZar } from "@/lib/money";
import { formatDate } from "@/lib/forms";
import { PrintButton } from "./print-button";

export default async function PrintQuotation({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAccess("quotations.read");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const { data: q } = await ctx.supabase.from("quotations").select("*, customers(name, vat_no, billing_address, email, phone)").eq("id", id).maybeSingle();
  if (!q) notFound();
  const { data: items } = await ctx.supabase.from("quotation_items").select("*").eq("quotation_id", id).order("sort_order");
  const biz = await getBusinessSettings(ctx);
  const c = q.customers as unknown as { name: string; vat_no: string | null; billing_address: string | null; email: string | null; phone: string | null } | null;

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
          <p className="text-xl font-semibold">QUOTATION</p>
          <p>{q.number}</p>
          <p>Date: {formatDate(q.created_at)}</p>
          {q.valid_until ? <p>Valid until: {formatDate(q.valid_until)}</p> : null}
        </div>
      </header>

      <section className="mt-4 grid grid-cols-2 gap-6">
        <div>
          <p className="font-semibold">Quoted to</p>
          <p>{c?.name}</p>
          <p className="whitespace-pre-line">{c?.billing_address}</p>
          {c?.vat_no ? <p>VAT: {c.vat_no}</p> : null}
        </div>
        <div>
          <p className="font-semibold">Transport</p>
          <p>From: {q.collection_address || "-"}</p>
          <p>To: {q.delivery_address || "-"}</p>
          {q.distance_km ? <p>Distance: {q.distance_km} km</p> : null}
          {q.collection_date ? <p>Collection: {formatDate(q.collection_date)}</p> : null}
          {q.delivery_date ? <p>Delivery: {formatDate(q.delivery_date)}</p> : null}
        </div>
      </section>

      {q.cargo_description || q.weight_kg ? (
        <section className="mt-4">
          <p className="font-semibold">Cargo</p>
          <p>{[q.cargo_description, q.weight_kg ? `${q.weight_kg} kg` : null, q.packages ? `${q.packages} packages` : null, q.truck_type].filter(Boolean).join(" · ")}</p>
          {q.handling_notes ? <p>Handling: {q.handling_notes}</p> : null}
        </section>
      ) : null}

      <table className="mt-6 w-full">
        <thead>
          <tr className="border-b text-left"><th className="py-2">Description</th><th className="py-2 text-right">Amount (excl. VAT)</th></tr>
        </thead>
        <tbody>
          {(items ?? []).map((i) => (
            <tr key={i.id} className="border-b"><td className="py-2 pr-3">{i.description}</td><td className="py-2 text-right">{formatZar(i.line_total_cents)}</td></tr>
          ))}
        </tbody>
      </table>
      <dl className="ml-auto mt-4 max-w-xs space-y-1">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatZar(q.subtotal_cents)}</dd></div>
        {q.discount_cents > 0 ? <div className="flex justify-between"><dt>Discount</dt><dd>-{formatZar(q.discount_cents)}</dd></div> : null}
        <div className="flex justify-between"><dt>VAT</dt><dd>{formatZar(q.vat_cents)}</dd></div>
        <div className="flex justify-between border-t pt-1 text-base font-semibold"><dt>Total (ZAR)</dt><dd>{formatZar(q.total_cents)}</dd></div>
      </dl>

      {q.payment_terms ? <section className="mt-6"><p className="font-semibold">Payment terms</p><p className="whitespace-pre-line">{q.payment_terms}</p></section> : null}
      {q.conditions ? <section className="mt-4"><p className="font-semibold">Conditions</p><p className="whitespace-pre-line">{q.conditions}</p></section> : null}
      {q.notes ? <section className="mt-4"><p className="font-semibold">Notes</p><p className="whitespace-pre-line">{q.notes}</p></section> : null}
    </div>
  );
}
