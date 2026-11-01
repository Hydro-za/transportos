"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAccess } from "@/server/auth/session";
import { nullIfEmpty, readValues, type FormState } from "@/lib/forms";
import { SETTINGS_FIELD_NAMES } from "./fields";

const schema = z.object({
  name: z.string().min(2, "Enter the business name").max(120),
  registration_no: z.string().max(60),
  vat_no: z.string().regex(/^(4\d{9})?$/, "VAT number must be 10 digits starting with 4"),
  phone: z.string().max(40),
  email: z.union([z.literal(""), z.string().email("Enter a valid email").max(254)]),
  address: z.string().max(500),
  vat_rate_pct: z.coerce.number().min(0, "VAT rate must be between 0 and 100").max(100, "VAT rate must be between 0 and 100"),
  quotation_validity_days: z.coerce.number().int("Validity must be whole days").min(1).max(365),
  payment_terms: z.string().max(1000),
  conditions: z.string().max(4000),
  bank_details: z.string().max(1000),
});

export async function saveSettings(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, organizationId } = await requireAccess("settings.update");
  const values = readValues(fd, SETTINGS_FIELD_NAMES);
  const parsed = schema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form.", values };
  const d = parsed.data;

  const { error } = await supabase
    .from("organizations")
    .update({
      name: d.name,
      registration_no: nullIfEmpty(d.registration_no),
      vat_no: nullIfEmpty(d.vat_no),
      phone: nullIfEmpty(d.phone),
      email: nullIfEmpty(d.email),
      address: { text: d.address },
      settings: {
        vat_rate_pct: d.vat_rate_pct,
        quotation_validity_days: d.quotation_validity_days,
        payment_terms: d.payment_terms,
        conditions: d.conditions,
        bank_details: d.bank_details,
      },
    })
    .eq("id", organizationId);
  if (error) return { error: "Could not save the settings.", values };
  revalidatePath("/", "layout");
  redirect("/settings?saved=1");
}
