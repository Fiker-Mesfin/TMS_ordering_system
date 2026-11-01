import { describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import {
  buildAdminOrdersXlsx,
  type AdminOrderExportRow,
} from "@/features/admin/components/adminOrdersExport";

const adminOrder: AdminOrderExportRow = {
  order_number: "TMS-1002",
  contact_name: "Student Example",
  contact_phone: "0909841353",
  delivery_area_name: "AAU FBE",
  delivery_date: "2026-11-03",
  meal_slot: "lunch",
  address: "Inside campus / Gebi",
  notes: "Building 4, room 12",
  order_items: [{ name: "TM's Signature Burger", quantity: 2 }],
  total: 700,
  status: "active",
  cancelled_at: null,
  created_at: "2026-11-02T10:00:00.000Z",
  payments: [{ status: "verified" }],
};

describe("admin orders Excel export", () => {
  it("exports all order delivery details and payment status to Excel", () => {
    const files = unzipSync(buildAdminOrdersXlsx([adminOrder]));
    const sheet = files["xl/worksheets/sheet1.xml"];
    if (!sheet) throw new Error("Expected orders worksheet was not created");
    const xml = strFromU8(sheet);

    expect(xml).toContain("Student / customer full name");
    expect(xml).toContain("Contact phone");
    expect(xml).toContain("Campus / delivery area");
    expect(xml).toContain("Delivery date");
    expect(xml).toContain("Meal time");
    expect(xml).toContain("Delivery location preference");
    expect(xml).toContain("Building, hall, room, or landmark");
    expect(xml).toContain("Student Example");
    expect(xml).toContain("0909841353");
    expect(xml).toContain("AAU FBE");
    expect(xml).toContain("Inside campus / Gebi");
    expect(xml).toContain("Building 4, room 12");
    expect(xml).toContain("verified");
  });
});
