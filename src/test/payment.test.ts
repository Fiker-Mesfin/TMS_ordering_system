import { describe, expect, it } from "vitest";
import { hasSubmittedPaymentReference, isAwaitingPaymentDetails } from "@/lib/payment";

describe("saved payment reference status", () => {
  it("recognizes references regardless of whether a submission timestamp exists", () => {
    expect(hasSubmittedPaymentReference("FT123456")).toBe(true);
    expect(hasSubmittedPaymentReference("  FT123456  ")).toBe(true);
    expect(hasSubmittedPaymentReference("   ")).toBe(false);
    expect(hasSubmittedPaymentReference(null)).toBe(false);
    expect(hasSubmittedPaymentReference(undefined)).toBe(false);
  });
});

describe("awaiting payment details status", () => {
  it("only includes pending, uncancelled orders without a submitted reference", () => {
    const pendingPayment = {
      transaction_ref: null,
      orders: { status: "pending", cancelled_at: null },
    };

    expect(isAwaitingPaymentDetails(pendingPayment)).toBe(true);
    expect(
      isAwaitingPaymentDetails({
        ...pendingPayment,
        orders: { status: "confirmed", cancelled_at: null },
      }),
    ).toBe(false);
    expect(
      isAwaitingPaymentDetails({
        ...pendingPayment,
        orders: { status: "pending", cancelled_at: "2026-11-08T10:00:00Z" },
      }),
    ).toBe(false);
    expect(isAwaitingPaymentDetails({ ...pendingPayment, transaction_ref: "FT123456" })).toBe(
      false,
    );
    expect(isAwaitingPaymentDetails({ transaction_ref: null, orders: null })).toBe(false);
  });
});
