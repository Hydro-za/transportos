"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAccess } from "@/server/auth/session";
import { moneyOrNull, nullIfEmpty, readValues, type FormState } from "@/lib/forms";
import { CUSTOMER_FIELD_NAMES } from "./fields";

const schema = z.object({
  name: z.string().min(2, "Enter the customer name").max(160),
  registration_no: z.string().max(60),
  vat_no: z.string().regex(/^(4\d{9})?$/, "VAT number must be 10 digits starting with 4"),
  contact_name: z.string().max(120),
  phone: z.string().max(40),
  email: z.union([z.literal(""), z.string().email("Enter a valid email").max(254)]),
  payment_terms_days: z.coerce.number().int("Payment terms must be whole days").min(0).max(365),
  billing_address: z.string().max(500),
  collection_address: z.string().max(500),
  delivery_address: z.string().max(500),
  status: z.enum(["active", "inactive"]),
  notes: z.string().max(2000),
});

function toRow(values: Record<string, string>): { row?: Record<string, unknown>; error?: string } {
  const parsed = schema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  const credit = moneyOrNull(values.credit_limit);
  if (credit === undefined) return { error: "Enter the credit limit as an amount, for example 25000.00" };
  const d = parsed.data;
  return {
    row: {
      name: d.name,
      registration_no: nullIfEmpty(d.registration_no),
      vat_no: nullIfEmpty(d.vat_no),
      contact_name: nullIfEmpty(d.contact_name),
      phone: nullIfEmpty(d.phone),
      email: nullIfEmpty(d.email),
      payment_terms_days: d.payment_terms_days,
      credit_limit_cents: credit ?? 0,
      billing_address: nullIfEmpty(d.billing_address),
      collection_address: nullIfEmpty(d.collection_address),
      delivery_address: nullIfEmpty(d.delivery_address),
      status: d.status,
      notes: nullIfEmpty(d.notes),
    },
  };
}

export async function createCustomer(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, organizationId } = await requireAccess("customers.write");
  const values = readValues(fd, CUSTOMER_FIELD_NAMES);
  const { row, error } = toRow(values);
  if (!row) return { error, values };

  const { data, error: dbError } = await supabase
    .from("customers")
    .insert({ ...row, organization_id: organizationId })
    .select("id")
    .single();
  if (dbError || !data) {
    return { error: dbError?.code === "23505" ? "A customer with that name already exists." : "Could not save the customer.", values };
  }
  revalidatePath("/customers");
  redirect(`/customers/${data.id}`);
}

export async function updateCustomer(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, organizationId } = await requireAccess("customers.write");
  const id = z.string().uuid().safeParse(fd.get("id"));
  if (!id.success) return { error: "Invalid customer." };
  const values = readValues(fd, CUSTOMER_FIELD_NAMES);
  const { row, error } = toRow(values);
  if (!row) return { error, values };

  const { error: dbError } = await supabase.from("customers").update(row).eq("id", id.data).eq("organization_id", organizationId);
  if (dbError) {
    return { error: dbError.code === "23505" ? "A customer with that name already exists." : "Could not save the customer.", values };
  }
  revalidatePath("/customers");
  revalidatePath(`/customers/${id.data}`);
  redirect(`/customers/${id.data}?saved=1`);
}
