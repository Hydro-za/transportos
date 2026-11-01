import type { FieldDef } from "@/lib/forms";

export const JOB_FIELDS: FieldDef[] = [
  { name: "title", label: "Job title", required: true, wide: true },
  { name: "collection_address", label: "Collection location", type: "textarea" },
  { name: "delivery_address", label: "Delivery location", type: "textarea" },
  { name: "collection_date", label: "Collection date", type: "date" },
  { name: "delivery_deadline", label: "Delivery deadline", type: "date" },
  { name: "cargo_description", label: "Cargo details", type: "textarea", wide: true },
  { name: "weight_kg", label: "Weight (kg)", type: "number", step: "0.01" },
  { name: "packages", label: "Pallets / packages", type: "number", step: "1" },
  { name: "agreed_price", label: "Agreed transport price (R, excl. VAT as quoted)", type: "money" },
  { name: "customer_instructions", label: "Customer instructions", type: "textarea" },
  { name: "internal_notes", label: "Internal notes", type: "textarea" },
];
export const JOB_FIELD_NAMES = JOB_FIELDS.map((f) => f.name);
