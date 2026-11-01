// All money is integer cents (ZAR). Nothing here uses floating point for stored amounts.

export const VAT_STANDARD_PCT = 15;
export type VatTreatment = "standard" | "zero_rated" | "exempt";
export type PricingMethod = "fixed" | "per_km" | "per_tonne" | "per_km_tonne" | "custom";

/** Parses "1234", "1234.5", "1 234,50", "R1,234.50" into cents. Returns null when invalid. */
export function parseRandsToCents(input: string | null | undefined): number | null {
  if (input == null) return null;
  let s = input.trim().replace(/\s/g, "").replace(/^R/i, "");
  if (s === "") return null;
  if (s.includes(",") && s.includes(".")) s = s.replace(/,/g, "");
  else if (s.includes(",")) s = s.replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}

export function centsToRandsString(cents: number | null | undefined): string {
  if (cents == null) return "";
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(cents));
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

export function formatZar(cents: number | null | undefined): string {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format((cents ?? 0) / 100);
}

/** quantity (up to 3 decimals) x unit price, rounded half up to the cent. */
export function lineTotalCents(quantity: number, unitPriceCents: number): number {
  return Math.round((Math.round(quantity * 1000) * unitPriceCents) / 1000);
}

/** Amount for the main transport charge from the chosen pricing method. */
export function transportAmountCents(
  method: PricingMethod,
  rateCents: number,
  distanceKm: number | null,
  weightKg: number | null,
): number {
  const km = distanceKm ?? 0;
  const kg = weightKg ?? 0;
  switch (method) {
    case "fixed":
    case "custom":
      return rateCents;
    case "per_km":
      return Math.round(rateCents * km);
    case "per_tonne":
      return Math.round((rateCents * kg) / 1000);
    case "per_km_tonne":
      return Math.round((rateCents * km * kg) / 1000);
  }
}

export type TotalsLine = { lineTotalCents: number; vatTreatment: VatTreatment; vatRatePct: number };
export type Totals = { subtotalCents: number; discountCents: number; vatCents: number; totalCents: number };

/**
 * Subtotal excludes VAT. The discount is spread across lines in proportion to their value
 * (remainder on the last line), VAT is calculated per line on the discounted amount.
 */
export function computeTotals(lines: TotalsLine[], discountCents: number): Totals {
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotalCents, 0);
  const discount = Math.min(Math.max(discountCents, 0), subtotal);
  let allocated = 0;
  let vat = 0;
  lines.forEach((l, i) => {
    const share =
      i === lines.length - 1 ? discount - allocated : subtotal > 0 ? Math.round((discount * l.lineTotalCents) / subtotal) : 0;
    allocated += share;
    const net = l.lineTotalCents - share;
    if (l.vatTreatment === "standard") vat += Math.round((net * l.vatRatePct) / 100);
  });
  return { subtotalCents: subtotal, discountCents: discount, vatCents: vat, totalCents: subtotal - discount + vat };
}
