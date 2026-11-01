"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAccess, getBusinessSettings } from "@/server/auth/session";
import { moneyOrNull } from "@/lib/forms";
import { computeTotals, lineTotalCents, type VatTreatment } from "@/lib/money";

const uuid = z.string().uuid();
const back = (id: string, q: string) => redirect(`/invoices/${id}${q}`);

function dueDays(terms: string): number {
  const m = terms.match(/(\d{1,3})\s*days/i);
  return m ? Number(m[1]) : 30;
}

export async function createInvoiceFromJob(fd: FormData): Promise<void> {
  const jobId = uuid.safeParse(fd.get("job_id"));
  if (!jobId.success) redirect("/jobs");
  const ctx = await requireAccess("invoices.write");
  const { data: job } = await ctx.supabase.from("jobs").select("id, number, title, customer_id, quotation_id, agreed_price_cents, status").eq("id", jobId.data).maybeSingle();
  if (!job) redirect("/jobs");
  if (job.status === "cancelled") redirect(`/jobs/${job.id}?error=${encodeURIComponent("Cancelled jobs cannot be invoiced.")}`);
  const settings = await getBusinessSettings(ctx);

  type Line = { description: string; quantity: number; unit_price_cents: number; vat_treatment: VatTreatment; vat_rate_pct: number; line_total_cents: number };
  let lines: Line[] = [];
  let discount = 0;
  if (job.quotation_id) {
    const { data: items } = await ctx.supabase.from("quotation_items").select("description, quantity, unit_price_cents, vat_treatment, vat_rate_pct, line_total_cents").eq("quotation_id", job.quotation_id).order("sort_order");
    lines = (items ?? []).map((i) => ({ ...i, quantity: Number(i.quantity), vat_rate_pct: Number(i.vat_rate_pct), vat_treatment: i.vat_treatment as VatTreatment }));
    const { data: q } = await ctx.supabase.from("quotations").select("discount_cents").eq("id", job.quotation_id).maybeSingle();
    discount = Number(q?.discount_cents ?? 0);
  }
  if (lines.length === 0) {
    if (!job.agreed_price_cents) redirect(`/jobs/${job.id}?error=${encodeURIComponent("Set an agreed price on the job before invoicing.")}`);
    // The agreed price is treated as the amount excluding VAT.
    lines = [{ description: `${job.number} ${job.title}`, quantity: 1, unit_price_cents: Number(job.agreed_price_cents), vat_treatment: "standard", vat_rate_pct: settings.vatRatePct, line_total_cents: lineTotalCents(1, Number(job.agreed_price_cents)) }];
  }
  const totals = computeTotals(lines.map((l) => ({ lineTotalCents: l.line_total_cents, vatTreatment: l.vat_treatment, vatRatePct: l.vat_rate_pct })), discount);

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });
  const due = new Date(today + "T00:00:00Z");
  due.setUTCDate(due.getUTCDate() + dueDays(settings.paymentTerms));

  const { data: inv, error } = await ctx.supabase
    .from("invoices")
    .insert({
      organization_id: ctx.organizationId,
      customer_id: job.customer_id,
      job_id: job.id,
      invoice_date: today,
      due_date: due.toISOString().slice(0, 10),
      subtotal_cents: totals.subtotalCents,
      discount_cents: totals.discountCents,
      vat_cents: totals.vatCents,
      total_cents: totals.totalCents,
      notes: settings.paymentTerms || null,
    })
    .select("id")
    .single();
  if (error || !inv) redirect(`/jobs/${job.id}?error=${encodeURIComponent("Could not create the invoice.")}`);

  const { error: itemErr } = await ctx.supabase.from("invoice_items").insert(lines.map((l, i) => ({ ...l, organization_id: ctx.organizationId, invoice_id: inv.id, sort_order: i })));
  if (itemErr) {
    await ctx.supabase.from("invoices").update({ status: "cancelled", notes: "Creation failed: items not saved." }).eq("id", inv.id);
    redirect(`/jobs/${job.id}?error=${encodeURIComponent("Could not save the invoice lines. Please try again.")}`);
  }
  revalidatePath("/invoices");
  redirect(`/invoices/${inv.id}`);
}

export async function setInvoiceStatus(fd: FormData): Promise<void> {
  const id = uuid.safeParse(fd.get("id"));
  const to = z.enum(["sent", "cancelled"]).safeParse(fd.get("to"));
  if (!id.success || !to.success) redirect("/invoices");
  const ctx = await requireAccess(to.data === "sent" ? "invoices.send" : "invoices.write");
  const { data: inv } = await ctx.supabase.from("invoices").select("id, status").eq("id", id.data).maybeSingle();
  if (!inv) redirect("/invoices");
  if (to.data === "sent" && inv.status !== "draft") back(inv.id, `?error=${encodeURIComponent("Only draft invoices can be sent.")}`);
  if (to.data === "cancelled") {
    if (!["draft", "sent"].includes(inv.status)) back(inv.id, `?error=${encodeURIComponent("This invoice can no longer be cancelled.")}`);
    const { count } = await ctx.supabase.from("payments").select("id", { count: "exact", head: true }).eq("invoice_id", inv.id);
    if ((count ?? 0) > 0) back(inv.id, `?error=${encodeURIComponent("An invoice with payments cannot be cancelled.")}`);
  }
  const { error } = await ctx.supabase.from("invoices").update({ status: to.data }).eq("id", inv.id).eq("status", inv.status);
  if (error) back(inv.id, `?error=${encodeURIComponent("Could not update the invoice.")}`);
  revalidatePath("/invoices");
  back(inv.id, "?saved=1");
}

const paySchema = z.object({
  id: uuid,
  paid_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date"),
  method: z.enum(["eft", "cash", "card", "cheque", "other"]),
  reference: z.string().max(200),
});

export async function recordPayment(fd: FormData): Promise<void> {
  const p = paySchema.safeParse({ id: fd.get("id"), paid_on: fd.get("paid_on"), method: fd.get("method"), reference: String(fd.get("reference") ?? "").trim() });
  if (!p.success) redirect("/invoices");
  const ctx = await requireAccess("payments.write");
  const amount = moneyOrNull(String(fd.get("amount") ?? ""));
  if (!amount || amount <= 0) back(p.data.id, `?error=${encodeURIComponent("Enter a payment amount greater than zero.")}`);
  const { error } = await ctx.supabase.from("payments").insert({
    organization_id: ctx.organizationId,
    invoice_id: p.data.id,
    amount_cents: amount,
    paid_on: p.data.paid_on,
    method: p.data.method,
    reference: p.data.reference || null,
  });
  if (error) {
    const msg = /exceeds/i.test(error.message) ? "That payment is more than the outstanding balance." : /sent invoices/i.test(error.message) ? "Send the invoice before recording payments." : "Could not record the payment.";
    back(p.data.id, `?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath("/invoices");
  back(p.data.id, "?saved=1");
}
