"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getBusinessSettings, requireAccess } from "@/server/auth/session";
import { moneyOrNull, nullIfEmpty, numberOrNull, readValues, type FormState } from "@/lib/forms";
import { buildQuote, type QuoteInputs, type QuoteLine } from "@/lib/quotation";
import { QUOTATION_FIELD_NAMES } from "./fields";

const dateText = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")]);

const schema = z.object({
  collection_address: z.string().max(500),
  delivery_address: z.string().max(500),
  collection_date: dateText,
  delivery_date: dateText,
  valid_until: dateText,
  distance_km: z.string(),
  truck_type: z.string().max(80),
  cargo_description: z.string().max(1000),
  cargo_category: z.string().max(80),
  weight_kg: z.string(),
  packages: z.string(),
  handling_notes: z.string().max(1000),
  pricing_method: z.enum(["fixed", "per_km", "per_tonne", "per_km_tonne", "custom"]),
  fuel_surcharge_pct: z.string(),
  other_description: z.string().max(120),
  vat_treatment: z.enum(["standard", "zero_rated", "exempt"]),
  payment_terms: z.string().max(1000),
  conditions: z.string().max(4000),
  notes: z.string().max(2000),
});

const MONEY_FIELDS = ["rate", "loading_fee", "offloading_fee", "waiting_fee", "additional_stops_fee", "tolls", "other_charges", "discount"] as const;

type Built = { row: Record<string, unknown>; lines: QuoteLine[] } | { error: string };

async function build(values: Record<string, string>, vatRatePct: number): Promise<Built> {
  const p = schema.safeParse(values);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Check the form and try again." };
  const m: Record<string, number> = {};
  for (const f of MONEY_FIELDS) {
    const c = moneyOrNull(values[f]);
    if (c === undefined) return { error: "Enter amounts like 1250.00 (rand and cents)." };
    m[f] = c ?? 0;
  }
  const distance = numberOrNull(p.data.distance_km);
  const weight = numberOrNull(p.data.weight_kg);
  const packages = numberOrNull(p.data.packages);
  const fuelPct = numberOrNull(p.data.fuel_surcharge_pct) ?? 0;
  if ((distance ?? 0) < 0 || (weight ?? 0) < 0 || (packages ?? 0) < 0 || fuelPct < 0 || fuelPct > 100) {
    return { error: "Distance, weight, packages and surcharge cannot be negative (surcharge max 100%)." };
  }

  const inputs: QuoteInputs = {
    pricingMethod: p.data.pricing_method,
    rateCents: m.rate,
    distanceKm: distance,
    weightKg: weight,
    collection: p.data.collection_address.split("\n")[0] ?? "",
    delivery: p.data.delivery_address.split("\n")[0] ?? "",
    fuelSurchargePct: fuelPct,
    loadingCents: m.loading_fee,
    offloadingCents: m.offloading_fee,
    waitingCents: m.waiting_fee,
    additionalStopsCents: m.additional_stops_fee,
    tollsCents: m.tolls,
    otherCents: m.other_charges,
    otherDescription: p.data.other_description,
    discountCents: m.discount,
    vatTreatment: p.data.vat_treatment,
    vatRatePct,
  };
  const q = buildQuote(inputs);
  if ("error" in q) return { error: q.error };

  return {
    lines: q.lines,
    row: {
      collection_address: nullIfEmpty(p.data.collection_address),
      delivery_address: nullIfEmpty(p.data.delivery_address),
      collection_date: nullIfEmpty(p.data.collection_date),
      delivery_date: nullIfEmpty(p.data.delivery_date),
      valid_until: nullIfEmpty(p.data.valid_until),
      distance_km: distance,
      truck_type: nullIfEmpty(p.data.truck_type),
      cargo_description: nullIfEmpty(p.data.cargo_description),
      cargo_category: nullIfEmpty(p.data.cargo_category),
      weight_kg: weight,
      packages: packages === null ? null : Math.round(packages),
      handling_notes: nullIfEmpty(p.data.handling_notes),
      pricing_method: p.data.pricing_method,
      rate_cents: m.rate,
      subtotal_cents: q.totals.subtotalCents,
      discount_cents: q.totals.discountCents,
      vat_cents: q.totals.vatCents,
      total_cents: q.totals.totalCents,
      payment_terms: nullIfEmpty(p.data.payment_terms),
      conditions: nullIfEmpty(p.data.conditions),
      notes: nullIfEmpty(p.data.notes),
      pricing_inputs: values,
    },
  };
}

export async function createQuotation(_prev: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireAccess("quotations.write");
  const customerId = z.string().uuid().safeParse(fd.get("customer_id"));
  const values = readValues(fd, QUOTATION_FIELD_NAMES);
  if (!customerId.success) return { error: "Choose a customer first.", values };

  const settings = await getBusinessSettings(ctx);
  const built = await build(values, settings.vatRatePct);
  if ("error" in built) return { error: built.error, values };

  const { data: q, error } = await ctx.supabase
    .from("quotations")
    .insert({ ...built.row, organization_id: ctx.organizationId, customer_id: customerId.data, status: "draft" })
    .select("id")
    .single();
  if (error || !q) return { error: "Could not save the quotation.", values };

  const { error: itemsError } = await ctx.supabase
    .from("quotation_items")
    .insert(built.lines.map((l) => ({ ...l, organization_id: ctx.organizationId, quotation_id: q.id })));
  if (itemsError) {
    await ctx.supabase.from("quotations").delete().eq("id", q.id);
    return { error: "Could not save the quotation lines. Nothing was saved.", values };
  }
  revalidatePath("/quotations");
  redirect(`/quotations/${q.id}`);
}

export async function updateQuotation(_prev: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireAccess("quotations.write");
  const id = z.string().uuid().safeParse(fd.get("id"));
  if (!id.success) return { error: "Invalid quotation." };
  const values = readValues(fd, QUOTATION_FIELD_NAMES);

  const { data: existing } = await ctx.supabase.from("quotations").select("id, status").eq("id", id.data).maybeSingle();
  if (!existing) return { error: "Quotation not found.", values };
  if (existing.status !== "draft") return { error: "Only draft quotations can be edited. Duplicate it to make changes.", values };

  const settings = await getBusinessSettings(ctx);
  const built = await build(values, settings.vatRatePct);
  if ("error" in built) return { error: built.error, values };

  const { data: oldItems } = await ctx.supabase.from("quotation_items").select("*").eq("quotation_id", id.data);
  const { error } = await ctx.supabase.from("quotations").update(built.row).eq("id", id.data);
  if (error) return { error: "Could not save the quotation.", values };

  await ctx.supabase.from("quotation_items").delete().eq("quotation_id", id.data);
  const { error: itemsError } = await ctx.supabase
    .from("quotation_items")
    .insert(built.lines.map((l) => ({ ...l, organization_id: ctx.organizationId, quotation_id: id.data })));
  if (itemsError) {
    if (oldItems?.length) await ctx.supabase.from("quotation_items").insert(oldItems);
    return { error: "Could not save the quotation lines. The previous version was kept.", values };
  }
  revalidatePath(`/quotations/${id.data}`);
  redirect(`/quotations/${id.data}?saved=1`);
}

const TRANSITIONS: Record<string, { to: string[]; permission: string }> = {
  draft: { to: ["sent"], permission: "quotations.send" },
  sent: { to: ["accepted", "rejected", "expired"], permission: "quotations.write" },
  viewed: { to: ["accepted", "rejected", "expired"], permission: "quotations.write" },
};

export async function setQuotationStatus(fd: FormData) {
  const ctx = await requireAccess("quotations.read");
  const id = z.string().uuid().safeParse(fd.get("id"));
  const to = z.enum(["sent", "accepted", "rejected", "expired"]).safeParse(fd.get("to"));
  if (!id.success || !to.success) redirect("/quotations");

  const { data: q } = await ctx.supabase.from("quotations").select("id, status").eq("id", id.data).maybeSingle();
  if (!q) redirect("/quotations");
  const rule = TRANSITIONS[q.status];
  if (!rule || !rule.to.includes(to.data) || !ctx.permissions.has(rule.permission)) {
    redirect(`/quotations/${id.data}?error=${encodeURIComponent("That status change is not allowed.")}`);
  }
  const { error } = await ctx.supabase.from("quotations").update({ status: to.data }).eq("id", id.data);
  if (error) redirect(`/quotations/${id.data}?error=${encodeURIComponent("Could not change the status.")}`);
  revalidatePath(`/quotations/${id.data}`);
  redirect(`/quotations/${id.data}`);
}

export async function convertToJob(fd: FormData) {
  const ctx = await requireAccess("quotations.convert");
  const id = z.string().uuid().safeParse(fd.get("id"));
  if (!id.success) redirect("/quotations");
  const { data, error } = await ctx.supabase.rpc("convert_quotation_to_job", { p_quotation: id.data });
  if (error || !data) redirect(`/quotations/${id.data}?error=${encodeURIComponent(error?.message ?? "Could not convert the quotation.")}`);
  revalidatePath("/quotations");
  redirect(`/jobs/${data}`);
}

export async function duplicateQuotation(fd: FormData) {
  const ctx = await requireAccess("quotations.write");
  const id = z.string().uuid().safeParse(fd.get("id"));
  if (!id.success) redirect("/quotations");

  const { data: q } = await ctx.supabase.from("quotations").select("*").eq("id", id.data).maybeSingle();
  if (!q) redirect("/quotations");
  const { data: items } = await ctx.supabase.from("quotation_items").select("*").eq("quotation_id", id.data);

  const settings = await getBusinessSettings(ctx);
  const valid = new Date(Date.now() + settings.quotationValidityDays * 86400000).toISOString().slice(0, 10);
  const copy: Record<string, unknown> = { ...q };
  for (const k of ["id", "number", "created_at", "updated_at", "job_id", "created_by"]) delete copy[k];
  const { data: created, error } = await ctx.supabase
    .from("quotations")
    .insert({ ...copy, status: "draft", version: 1, valid_until: valid })
    .select("id")
    .single();
  if (error || !created) redirect(`/quotations/${id.data}?error=${encodeURIComponent("Could not duplicate the quotation.")}`);
  if (items?.length) {
    await ctx.supabase
      .from("quotation_items")
      .insert(items.map((i) => ({ ...i, id: undefined, quotation_id: created.id, created_at: undefined, updated_at: undefined })));
  }
  redirect(`/quotations/${created.id}`);
}
