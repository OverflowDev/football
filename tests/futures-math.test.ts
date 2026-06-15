import { describe, it, expect } from "vitest";
import { liquidationPrice, positionPnl } from "@/lib/futures-math";

describe("futures math", () => {
  it("liquidation price for a long is below entry by 1/leverage", () => {
    expect(liquidationPrice(100, "LONG", 2)).toBe(50);
    expect(liquidationPrice(100, "LONG", 10)).toBe(90);
  });

  it("liquidation price for a short is above entry by 1/leverage", () => {
    expect(liquidationPrice(100, "SHORT", 2)).toBe(150);
    expect(liquidationPrice(100, "SHORT", 10)).toBe(110);
  });

  it("P&L is directional", () => {
    expect(positionPnl("LONG", 100, 110, 10)).toBe(100);
    expect(positionPnl("LONG", 100, 90, 10)).toBe(-100);
    expect(positionPnl("SHORT", 100, 90, 10)).toBe(100);
    expect(positionPnl("SHORT", 100, 110, 10)).toBe(-100);
  });
});
