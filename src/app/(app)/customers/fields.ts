import type { FieldDef } from "@/lib/forms";

export const CUSTOMER_FIELDS: FieldDef[] = [
  { name: "name", label: "Customer / company name", required: true, wide: true },
  { name: "registration_no", label: "Registration number" },
  { name: "vat_no", label: "VAT number", help: "10 digits starting with 4" },
  { name: "contact_name", label: "Primary contact" },
  { name: "phone", label: "Telephone", type: "tel", placeholder: "e.g. 021 555 0123" },
  { name: "email", label: "Email", type: "email" },
  { name: "payment_terms_days", label: "Payment terms (days)", type: "number", step: "1", required: true },
  { name: "credit_limit", label: "Credit limit (R)", type: "money" },
  { name: "billing_address", label: "Billing address", type: "textarea" },
  { name: "collection_address", label: "Usual collection address", type: "textarea" },
  { name: "delivery_address", label: "Usual delivery address", type: "textarea" },
  {
    name: "status",
    label: "Account status",
    type: "select",
    required: true,
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ],
  },
  { name: "notes", label: "Notes", type: "textarea" },
];

export const CUSTOMER_FIELD_NAMES = CUSTOMER_FIELDS.map((f) => f.name);
