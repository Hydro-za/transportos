import type { FieldDef } from "@/lib/forms";

const VAT_OPTIONS = [
  { value: "standard", label: "Standard rated" },
  { value: "zero_rated", label: "Zero rated (e.g. exports)" },
  { value: "exempt", label: "Exempt" },
];

export const QUOTATION_FIELDS: FieldDef[] = [
  { name: "collection_address", label: "Collection location", type: "textarea" },
  { name: "delivery_address", label: "Delivery location", type: "textarea" },
  { name: "collection_date", label: "Collection date", type: "date" },
  { name: "delivery_date", label: "Required delivery date", type: "date" },
  { name: "distance_km", label: "Distance (km)", type: "number", step: "0.1" },
  { name: "truck_type", label: "Required truck type", placeholder: "e.g. Superlink, Tautliner" },
  { name: "cargo_description", label: "Cargo description", type: "textarea", wide: true },
  { name: "cargo_category", label: "Cargo category" },
  { name: "weight_kg", label: "Cargo weight (kg)", type: "number", step: "0.01" },
  { name: "packages", label: "Pallets / packages", type: "number", step: "1" },
  { name: "handling_notes", label: "Handling instructions", type: "textarea" },
  {
    name: "pricing_method",
    label: "Pricing method",
    type: "select",
    required: true,
    options: [
      { value: "fixed", label: "Fixed transport price" },
      { value: "per_km", label: "Price per kilometre" },
      { value: "per_tonne", label: "Price per tonne" },
      { value: "per_km_tonne", label: "Price per kilometre per tonne" },
      { value: "custom", label: "Custom price" },
    ],
  },
  { name: "rate", label: "Rate / price (R)", type: "money", required: true, help: "R per km, per tonne or per km per tonne, or the full amount for fixed / custom." },
  { name: "fuel_surcharge_pct", label: "Fuel surcharge (% of transport)", type: "number", step: "0.01" },
  { name: "loading_fee", label: "Loading fee (R)", type: "money" },
  { name: "offloading_fee", label: "Offloading fee (R)", type: "money" },
  { name: "waiting_fee", label: "Waiting time (R)", type: "money" },
  { name: "additional_stops_fee", label: "Additional stops (R)", type: "money" },
  { name: "tolls", label: "Tolls (R)", type: "money" },
  { name: "other_charges", label: "Other charges (R)", type: "money" },
  { name: "other_description", label: "Description of other charges" },
  { name: "discount", label: "Discount (R)", type: "money" },
  { name: "vat_treatment", label: "VAT", type: "select", required: true, options: VAT_OPTIONS },
  { name: "valid_until", label: "Quotation valid until", type: "date" },
  { name: "payment_terms", label: "Payment terms", type: "textarea" },
  { name: "conditions", label: "Transport and cancellation conditions", type: "textarea" },
  { name: "notes", label: "Additional notes", type: "textarea" },
];
export const QUOTATION_FIELD_NAMES = QUOTATION_FIELDS.map((f) => f.name);
