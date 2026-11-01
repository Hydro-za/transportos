import test from "node:test";
import assert from "node:assert/strict";
import {
  parseRandsToCents, centsToRandsString, lineTotalCents, transportAmountCents, computeTotals,
} from "../src/lib/money.ts";

test("parseRandsToCents", () => {
  assert.equal(parseRandsToCents("1234"), 123400);
  assert.equal(parseRandsToCents("1234.5"), 123450);
  assert.equal(parseRandsToCents("1 234,50"), 123450);
  assert.equal(parseRandsToCents("R1,234.50"), 123450);
  assert.equal(parseRandsToCents("0.07"), 7);
  assert.equal(parseRandsToCents("12.345"), null);
  assert.equal(parseRandsToCents("abc"), null);
  assert.equal(parseRandsToCents(""), null);
  assert.equal(parseRandsToCents("-5"), null);
});

test("centsToRandsString", () => {
  assert.equal(centsToRandsString(123450), "1234.50");
  assert.equal(centsToRandsString(7), "0.07");
  assert.equal(centsToRandsString(null), "");
});

test("lineTotalCents rounds half up", () => {
  assert.equal(lineTotalCents(1, 12345), 12345);
  assert.equal(lineTotalCents(2.5, 1001), 2503); // 2502.5 -> 2503
  assert.equal(lineTotalCents(0.333, 100), 33);
});

test("transport pricing methods", () => {
  assert.equal(transportAmountCents("fixed", 500000, 1500, 28000), 500000);
  assert.equal(transportAmountCents("per_km", 2200, 1500, null), 3300000);
  assert.equal(transportAmountCents("per_tonne", 15000, null, 28000), 420000);
  assert.equal(transportAmountCents("per_km_tonne", 100, 1500, 28000), 4200000);
});

test("totals: standard VAT 15%", () => {
  const t = computeTotals([{ lineTotalCents: 100000, vatTreatment: "standard", vatRatePct: 15 }], 0);
  assert.deepEqual(t, { subtotalCents: 100000, discountCents: 0, vatCents: 15000, totalCents: 115000 });
});

test("totals: zero-rated and exempt lines carry no VAT", () => {
  const t = computeTotals(
    [
      { lineTotalCents: 100000, vatTreatment: "zero_rated", vatRatePct: 0 },
      { lineTotalCents: 50000, vatTreatment: "exempt", vatRatePct: 15 },
      { lineTotalCents: 20000, vatTreatment: "standard", vatRatePct: 15 },
    ],
    0,
  );
  assert.equal(t.vatCents, 3000);
  assert.equal(t.totalCents, 173000);
});

test("totals: discount reduces the VAT base proportionally", () => {
  const t = computeTotals(
    [
      { lineTotalCents: 100000, vatTreatment: "standard", vatRatePct: 15 },
      { lineTotalCents: 100000, vatTreatment: "zero_rated", vatRatePct: 0 },
    ],
    20000,
  );
  // discount 10000 on each line; VAT on 90000 = 13500
  assert.equal(t.vatCents, 13500);
  assert.equal(t.totalCents, 200000 - 20000 + 13500);
});

test("totals: discount never exceeds subtotal and sums exactly", () => {
  const t = computeTotals(
    [
      { lineTotalCents: 3333, vatTreatment: "standard", vatRatePct: 15 },
      { lineTotalCents: 3333, vatTreatment: "standard", vatRatePct: 15 },
      { lineTotalCents: 3334, vatTreatment: "standard", vatRatePct: 15 },
    ],
    999999,
  );
  assert.equal(t.discountCents, 10000);
  assert.equal(t.totalCents, 0);
});

import { buildQuote } from "../src/lib/quotation.ts";

const base = {
  pricingMethod: "per_km", rateCents: 2200, distanceKm: 1500, weightKg: 28000,
  collection: "Cape Town", delivery: "Durban", fuelSurchargePct: 10,
  loadingCents: 50000, offloadingCents: 0, waitingCents: 0, additionalStopsCents: 0, tollsCents: 120000,
  otherCents: 0, otherDescription: "", discountCents: 0, vatTreatment: "standard", vatRatePct: 15,
};

test("quote: per-km with fuel surcharge, loading and tolls, 15% VAT", () => {
  const q = buildQuote(base);
  assert.ok(!("error" in q));
  // transport 1500 x R22 = R33,000; fuel 10% = R3,300; loading R500; tolls R1,200
  assert.equal(q.lines.length, 4);
  assert.equal(q.totals.subtotalCents, 3300000 + 330000 + 50000 + 120000);
  assert.equal(q.totals.vatCents, Math.round(q.totals.subtotalCents * 0.15));
  assert.equal(q.totals.totalCents, q.totals.subtotalCents + q.totals.vatCents);
});

test("quote: zero-rated export has no VAT", () => {
  const q = buildQuote({ ...base, vatTreatment: "zero_rated" });
  assert.ok(!("error" in q));
  assert.equal(q.totals.vatCents, 0);
});

test("quote: validation errors", () => {
  assert.ok("error" in buildQuote({ ...base, rateCents: 0 }));
  assert.ok("error" in buildQuote({ ...base, distanceKm: null }));
  assert.ok("error" in buildQuote({ ...base, pricingMethod: "per_tonne", weightKg: null }));
});

import { fuelStatsByRecord } from "../src/lib/fuel.ts";
import { maintenanceAlerts, expiryAlerts } from "../src/lib/maintenance.ts";

test("fuel: full-tank consumption between consecutive full fills", () => {
  const rec = (id, odo, litres, cents, full = true, date = "2026-01-01") => ({ id, vehicle_id: "v1", fuel_date: date, litres, total_cents: cents, odometer_km: odo, full_tank: full });
  const stats = fuelStatsByRecord([
    rec("a", 10000, 300, 600000),
    rec("b", 10500, 150, 300000, false),
    rec("c", 11000, 150, 300000, true),
  ]);
  assert.equal(stats.has("a"), false); // first full tank: no baseline
  assert.equal(stats.has("b"), false); // partial
  const c = stats.get("c");
  assert.equal(c.km, 1000);
  assert.equal(c.litres, 300);
  assert.equal(Math.round(c.litresPer100km * 10) / 10, 30);
  assert.equal(c.costPerKmCents, 600);
});

test("maintenance alerts by date and odometer", () => {
  const a = maintenanceAlerts(
    [
      { vehicle_id: "1", registration_no: "A", odometer_km: 100, next_service_km: null, next_service_date: "2026-11-10" },
      { vehicle_id: "2", registration_no: "B", odometer_km: 99500, next_service_km: 100000, next_service_date: null },
      { vehicle_id: "3", registration_no: "C", odometer_km: 5, next_service_km: null, next_service_date: "2026-10-01" },
      { vehicle_id: "4", registration_no: "D", odometer_km: 5, next_service_km: 90000, next_service_date: "2027-06-01" },
    ],
    "2026-11-02",
  );
  assert.equal(a.length, 3);
  assert.equal(a.find((x) => x.registration_no === "C").overdue, true);
  assert.equal(a.find((x) => x.registration_no === "B").overdue, false);
});

test("expiry alerts", () => {
  const e = expiryAlerts([{ label: "x", date: "2026-10-01" }, { label: "y", date: "2026-12-01" }, { label: "z", date: "2027-12-01" }, { label: "n", date: null }], "2026-11-02");
  assert.deepEqual(e.map((i) => [i.label, i.expired]), [["x", true], ["y", false]]);
});
