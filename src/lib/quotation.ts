import {
  computeTotals,
  formatZar,
  lineTotalCents,
  transportAmountCents,
  type PricingMethod,
  type Totals,
  type VatTreatment,
} from "./money.ts";

export type QuoteInputs = {
  pricingMethod: PricingMethod;
  rateCents: number;
  distanceKm: number | null;
  weightKg: number | null;
  collection: string;
  delivery: string;
  fuelSurchargePct: number;
  loadingCents: number;
  offloadingCents: number;
  waitingCents: number;
  additionalStopsCents: number;
  tollsCents: number;
  otherCents: number;
  otherDescription: string;
  discountCents: number;
  vatTreatment: VatTreatment;
  vatRatePct: number;
};

export type QuoteLine = {
  description: string;
  quantity: number;
  unit_price_cents: number;
  vat_treatment: VatTreatment;
  vat_rate_pct: number;
  line_total_cents: number;
  sort_order: number;
};

const METHOD_LABEL: Record<PricingMethod, string> = {
  fixed: "fixed price",
  per_km: "per km",
  per_tonne: "per tonne",
  per_km_tonne: "per km per tonne",
  custom: "custom price",
};

export function buildQuote(i: QuoteInputs): { lines: QuoteLine[]; totals: Totals } | { error: string } {
  if (i.rateCents <= 0) return { error: "Enter the rate or price for the transport charge." };
  if ((i.pricingMethod === "per_km" || i.pricingMethod === "per_km_tonne") && !(i.distanceKm && i.distanceKm > 0)) {
    return { error: "Enter the distance in km for per-km pricing." };
  }
  if ((i.pricingMethod === "per_tonne" || i.pricingMethod === "per_km_tonne") && !(i.weightKg && i.weightKg > 0)) {
    return { error: "Enter the cargo weight for per-tonne pricing." };
  }

  const transport = transportAmountCents(i.pricingMethod, i.rateCents, i.distanceKm, i.weightKg);
  const rate = formatZar(i.rateCents);
  const detail =
    i.pricingMethod === "per_km"
      ? `${i.distanceKm} km @ ${rate}/km`
      : i.pricingMethod === "per_tonne"
        ? `${(i.weightKg ?? 0) / 1000} t @ ${rate}/t`
        : i.pricingMethod === "per_km_tonne"
          ? `${i.distanceKm} km x ${(i.weightKg ?? 0) / 1000} t @ ${rate}`
          : METHOD_LABEL[i.pricingMethod];

  const treatment = i.vatTreatment;
  const pct = treatment === "standard" ? i.vatRatePct : 0;
  const raw: { description: string; cents: number }[] = [
    { description: `Transport: ${i.collection || "collection"} to ${i.delivery || "delivery"} (${detail})`, cents: transport },
  ];
  if (i.fuelSurchargePct > 0) {
    raw.push({ description: `Fuel surcharge (${i.fuelSurchargePct}%)`, cents: Math.round((transport * i.fuelSurchargePct) / 100) });
  }
  const extras: [string, number][] = [
    ["Loading fee", i.loadingCents],
    ["Offloading fee", i.offloadingCents],
    ["Waiting time", i.waitingCents],
    ["Additional stops", i.additionalStopsCents],
    ["Tolls", i.tollsCents],
    [i.otherDescription || "Other charges", i.otherCents],
  ];
  for (const [description, cents] of extras) if (cents > 0) raw.push({ description, cents });

  const lines: QuoteLine[] = raw.map((r, idx) => ({
    description: r.description,
    quantity: 1,
    unit_price_cents: r.cents,
    vat_treatment: treatment,
    vat_rate_pct: pct,
    line_total_cents: lineTotalCents(1, r.cents),
    sort_order: idx,
  }));
  const totals = computeTotals(
    lines.map((l) => ({ lineTotalCents: l.line_total_cents, vatTreatment: l.vat_treatment, vatRatePct: l.vat_rate_pct })),
    i.discountCents,
  );
  return { lines, totals };
}
