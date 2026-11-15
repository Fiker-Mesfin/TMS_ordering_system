import { describe, expect, it } from "vitest";
import { getDeliveryMeetingPoints } from "@/lib/delivery";

describe("getDeliveryMeetingPoints", () => {
  it("returns the specified meeting points for each campus", () => {
    expect(getDeliveryMeetingPoints("AAU Sidist Kilo (Main Campus)")).toEqual([
      "Dorm Gate / Amestegna Ber",
    ]);
    expect(getDeliveryMeetingPoints("AAU Arat Kilo (Science)")).toEqual([
      "Art School Gate",
      " 4 kilo Main Gate",
    ]);
    expect(getDeliveryMeetingPoints("AAU Amist Kilo (Technology)")).toEqual(["5 kilo Dorm Gate"]);
    expect(getDeliveryMeetingPoints("AAU FBE")).toEqual(["FBE Dorm Gate"]);
    expect(getDeliveryMeetingPoints("AAU Yared Music School")).toEqual(["At the gate"]);
  });

  it("uses the outer gate for other campuses", () => {
    expect(getDeliveryMeetingPoints("AAU Commerce (Lideta)")).toEqual(["Outer Gate"]);
  });
});
