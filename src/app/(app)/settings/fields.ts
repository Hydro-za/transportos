import type { FieldDef } from "@/lib/forms";

export const SETTINGS_FIELDS: FieldDef[] = [
  { name: "name", label: "Business name", required: true, wide: true },
  { name: "registration_no", label: "Registration number" },
  { name: "vat_no", label: "VAT number", help: "10 digits starting with 4" },
  { name: "phone", label: "Telephone", type: "tel" },
  { name: "email", label: "Email", type: "email" },
  { name: "address", label: "Address (shown on quotations and invoices)", type: "textarea" },
  { name: "vat_rate_pct", label: "Default VAT rate (%)", type: "number", step: "0.01", required: true, help: "South African standard rate is 15%" },
  { name: "quotation_validity_days", label: "Quotation validity (days)", type: "number", step: "1", required: true },
  { name: "payment_terms", label: "Default payment terms", type: "textarea" },
  { name: "conditions", label: "Default transport conditions", type: "textarea" },
  { name: "bank_details", label: "Banking details (shown on invoices)", type: "textarea" },
];
export const SETTINGS_FIELD_NAMES = SETTINGS_FIELDS.map((f) => f.name);
