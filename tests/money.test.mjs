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
