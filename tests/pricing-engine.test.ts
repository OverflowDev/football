import { describe, it, expect } from "vitest";
import {
  fpiFairValue,
  bondingCurveBuyCost,
  bondingCurveSellReturn,
  calculateNewPrice,
  MAX_MOVE_PER_UPDATE,
} from "@/lib/pricing-engine";

describe("FPI pricing engine", () => {
  it("computes fair value from the FPI formula", () => {
    // base 100 × (1 + (50 + 0 − 0)/100) = 150
    expect(fpiFairValue({ baseValue: 100, formRating: 50, rumorScore: 0, injuryStatus: false })).toBe(150);
  });

  it("applies the injury penalty", () => {
    // base 100 × (1 + (50 + 0 − 30)/100) = 120
    expect(fpiFairValue({ baseValue: 100, formRating: 50, rumorScore: 0, injuryStatus: true })).toBe(120);
  });

  it("bonding curve: buying costs more than the flat price, selling returns less", () => {
    const flat = 100 * 50;
    expect(bondingCurveBuyCost(100, 50)).toBeGreaterThan(flat);
    expect(bondingCurveSellReturn(100, 50)).toBeLessThan(flat);
  });

  it("dampens a single update to at most ±20%", () => {
    const res = calculateNewPrice(100, { age: 25, goals: 100 }); // absurdly bullish
    expect(res.newPrice).toBeLessThanOrEqual(100 * (1 + MAX_MOVE_PER_UPDATE) + 0.01);
    expect(res.dampened).toBe(true);
  });

  it("never returns a price below the floor", () => {
    const res = calculateNewPrice(0.5, { age: 25, injuryConfirmed: true, redCard: true, negativeNews: 10 });
    expect(res.newPrice).toBeGreaterThanOrEqual(0.5);
  });
});
