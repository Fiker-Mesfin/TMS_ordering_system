import { supabase } from "@/integrations/supabase/client";

export type PlaceOrderInput = {
  items: { menuItemId: string; quantity: number; extraIds: string[] }[];
  areaId: string;
  address: string;
  contactName: string;
  contactPhone: string;
  deliveryDate: string;
  mealSlot: string;
  notes?: string;
};

export async function getEnabledDeliveryAreas() {
  const { data, error } = await supabase
    .from("delivery_areas")
    .select("id,name")
    .eq("enabled", true)
    .order("sort_order");
  if (error) throw error;
  return data;
}

export async function placeOrder(input: PlaceOrderInput) {
  const { data, error } = await supabase.rpc("place_order", {
    _items: input.items.map((item) => ({
      menu_item_id: item.menuItemId,
      quantity: item.quantity,
      extra_ids: item.extraIds,
    })),
    _area_id: input.areaId,
    _address: input.address,
    _contact_name: input.contactName,
    _contact_phone: input.contactPhone,
    _notes: input.notes ?? "",
    _delivery_date: input.deliveryDate,
    _meal_slot: input.mealSlot,
  });
  if (error) throw error;
  return data;
}
