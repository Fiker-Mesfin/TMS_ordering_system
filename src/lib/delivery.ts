import { format, parseISO } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

export type DeliveryDay = { delivery_date: string; is_open: boolean };
export type MealSlot = Tables<"meal_slots">;

export const deliveryScheduleQueryKey = ["delivery-schedule"] as const;
export const adminDeliveryScheduleQueryKey = ["admin-delivery-schedule"] as const;
export const mealSlotsQueryKey = ["meal-slots"] as const;

export function formatDeliveryDate(date: string) {
  return format(parseISO(date), "EEEE, d MMM yyyy");
}
