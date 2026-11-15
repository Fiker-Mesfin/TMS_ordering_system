import { format, parseISO } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

export type DeliveryDay = { delivery_date: string; is_open: boolean };
export type MealSlot = Tables<"meal_slots">;

export const deliveryScheduleQueryKey = ["delivery-schedule"] as const;
export const adminDeliveryScheduleQueryKey = ["admin-delivery-schedule"] as const;
export const mealSlotsQueryKey = ["meal-slots"] as const;

export function getDeliveryMeetingPoints(areaName: string): readonly string[] {
  if (areaName.includes("Sidist Kilo")) return ["Dorm Gate / Amestegna Ber"];
  if (areaName.includes("Arat Kilo")) return ["Art School Gate", " 4 kilo Main Gate"];
  if (areaName.includes("Amist Kilo")) return ["5 kilo Dorm Gate"];
  if (areaName.includes("FBE")) return ["FBE Dorm Gate"];
  if (areaName.includes("Yared Music School")) return ["At the gate"];
  return ["Outer Gate"];
}

export function formatDeliveryDate(date: string) {
  return format(parseISO(date), "EEEE, d MMM yyyy");
}
