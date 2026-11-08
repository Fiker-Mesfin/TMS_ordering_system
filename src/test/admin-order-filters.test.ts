import { describe, expect, it } from "vitest";
import {
  getAdminBurgerCounts,
  matchesAdminBurgerFilter,
} from "@/features/admin/lib/adminOrderFilters";

describe("admin order burger filters", () => {
  it("counts quantities for signature and double burgers using their menu names", () => {
    const orders = [
      {
        order_items: [
          { name: "TM's Signature Burger", quantity: 2 },
          { name: "Double Smash", quantity: 1 },
        ],
      },
      {
        order_items: [
          { name: "TMS Double Trouble", quantity: 3 },
          { name: "Crispy Chicken", quantity: 2 },
        ],
      },
    ];

    expect(getAdminBurgerCounts(orders)).toEqual({ signature: 2, doubleTrouble: 4 });
    expect(matchesAdminBurgerFilter("TM's Signature Burger", "signature")).toBe(true);
    expect(matchesAdminBurgerFilter("Double Smash", "double")).toBe(true);
    expect(matchesAdminBurgerFilter("Crispy Chicken", "double")).toBe(false);
    expect(matchesAdminBurgerFilter("Crispy Chicken", "all")).toBe(true);
  });
});
