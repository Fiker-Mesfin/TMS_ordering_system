import { supabase } from "@/integrations/supabase/client";
import type { DeliveryDay, MealSlot } from "@/lib/delivery";

export async function getDeliverySchedule(): Promise<DeliveryDay[]> {
  const { data, error } = await supabase.rpc("get_delivery_schedule");
  if (error) throw error;
  return data;
}

export async function getMealSlots(): Promise<MealSlot[]> {
  const { data, error } = await supabase
    .from("meal_slots")
    .select("slot,label,available,sort_order")
    .order("sort_order");
  if (error) throw error;
  return data;
}
