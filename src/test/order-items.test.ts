import { describe, expect, it } from "vitest";
import { getOrderItemExtraNames } from "@/features/orders/lib/orderItems";

describe("getOrderItemExtraNames", () => {
  it("returns names from saved order extras", () => {
    expect(
      getOrderItemExtraNames([
        { id: "sauce-id", name: "Burger sauce", price: 35 },
        { id: "ketchup-id", name: "Ketchup", price: 25 },
      ]),
    ).toEqual(["Burger sauce", "Ketchup"]);
  });

  it("ignores malformed extras and non-array values", () => {
    expect(
      getOrderItemExtraNames([{ name: "Ketchup" }, { name: 25 }, null, "Burger sauce", []]),
    ).toEqual(["Ketchup"]);
    expect(getOrderItemExtraNames(null)).toEqual([]);
  });
});
