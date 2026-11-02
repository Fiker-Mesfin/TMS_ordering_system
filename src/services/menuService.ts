import { supabase } from "@/integrations/supabase/client";
import type { MenuExtra, MenuItem } from "@/types/menu";

export async function getMenuItems(): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .order("sort_order")
    .order("created_at");
  if (error) throw error;
  return data as MenuItem[];
}

export async function getAvailableMenuExtras(): Promise<MenuExtra[]> {
  const { data, error } = await supabase
    .from("menu_extras")
    .select("id,name,price")
    .eq("available", true)
    .order("sort_order");
  if (error) throw error;
  return data.map((extra) => ({ ...extra, price: Number(extra.price) }));
}
