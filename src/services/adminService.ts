import { supabase } from "@/integrations/supabase/client";
import { MENU_PHOTO_PREFIX } from "@/lib/menu-photo";

export async function getAdminPayments() {
  const { data, error } = await supabase
    .from("payments")
    .select(
      "*, orders(order_number, contact_name, contact_phone, delivery_area_name, delivery_date, meal_slot, created_at)",
    )
    .eq("status", "unverified")
    .order("submitted_at", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data;
}

export async function createReceiptUrl(path: string) {
  const { data, error } = await supabase.storage.from("receipts").createSignedUrl(path, 300);
  if (error) throw error;
  if (!data) throw new Error("Receipt URL was not returned");
  return data.signedUrl;
}

export async function reviewPayment(paymentId: string, approve: boolean, note: string) {
  const { error } = await supabase.rpc("review_payment", {
    _payment_id: paymentId,
    _approve: approve,
    _note: note,
  });
  if (error) throw error;
}

export async function getAdminOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(name, quantity), payments(status)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data;
}

export async function getAdminMenuItems() {
  const { data, error } = await supabase
    .from("menu_items")
    .select("id,name,description,price,image_key,available")
    .order("sort_order")
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function getAdminMenuExtras() {
  const { data } = await supabase
    .from("menu_extras")
    .select("id,name,price,available")
    .order("sort_order");
  return data ?? [];
}

export async function getAdminDeliveryAreas() {
  const { data } = await supabase
    .from("delivery_areas")
    .select("id,name,enabled")
    .order("sort_order");
  return data ?? [];
}

export async function setMenuItemAvailability(id: string, available: boolean) {
  const { error } = await supabase.from("menu_items").update({ available }).eq("id", id);
  if (error) throw error;
}

export async function setMenuExtraAvailability(id: string, available: boolean) {
  const { error } = await supabase.from("menu_extras").update({ available }).eq("id", id);
  if (error) throw error;
}

export async function setDeliveryAreaEnabled(id: string, enabled: boolean) {
  const { error } = await supabase.from("delivery_areas").update({ enabled }).eq("id", id);
  if (error) throw error;
}

export async function setMealSlotAvailability(slot: string, available: boolean) {
  const { error } = await supabase.from("meal_slots").update({ available }).eq("slot", slot);
  if (error) throw error;
}

export async function setDeliveryDateOpen(deliveryDate: string, isOpen: boolean) {
  const { error } = await supabase.rpc("set_delivery_date_open", {
    _delivery_date: deliveryDate,
    _is_open: isOpen,
  });
  if (error) throw error;
}

export async function createMenuItem(input: {
  name: string;
  description: string;
  price: number;
  available: boolean;
  imageFile: File;
}) {
  const { data: lastItem, error: sortOrderError } = await supabase
    .from("menu_items")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (sortOrderError) throw sortOrderError;
  const sortOrder = (lastItem?.sort_order ?? 0) + 1;

  let uploadedPath: string | null = null;

  const extensionByType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const extension = extensionByType[input.imageFile.type];
  if (!extension || input.imageFile.size > 5 * 1024 * 1024) {
    throw new Error("Choose a JPG, PNG, or WebP picture smaller than 5 MB");
  }

  const path = `${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("menu-photos")
    .upload(path, input.imageFile, { contentType: input.imageFile.type });
  if (uploadError) throw uploadError;
  uploadedPath = path;

  try {
    const { error } = await supabase.from("menu_items").insert({
      name: input.name,
      description: input.description,
      price: input.price,
      available: input.available,
      image_key: `${MENU_PHOTO_PREFIX}${path}`,
      sort_order: sortOrder,
    });
    if (error) throw error;
  } catch (error) {
    if (uploadedPath) {
      const { error: cleanupError } = await supabase.storage
        .from("menu-photos")
        .remove([uploadedPath]);
      if (cleanupError) {
        console.error(
          "Could not remove uploaded menu photo after failed burger creation",
          cleanupError,
        );
      }
    }
    throw error;
  }
}

export async function updateMenuItem(
  id: string,
  input: {
    name: string;
    description: string;
    price: number;
    available: boolean;
    imageFile: File | null;
  },
  currentImageKey: string | null,
) {
  let uploadedPath: string | null = null;
  const updates: {
    name: string;
    description: string;
    price: number;
    available: boolean;
    image_key?: string | null;
  } = {
    name: input.name,
    description: input.description,
    price: input.price,
    available: input.available,
  };

  if (input.imageFile) {
    const extensionByType: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const extension = extensionByType[input.imageFile.type];
    if (!extension || input.imageFile.size > 5 * 1024 * 1024) {
      throw new Error("Choose a JPG, PNG, or WebP picture smaller than 5 MB");
    }

    const path = `${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage
      .from("menu-photos")
      .upload(path, input.imageFile, { contentType: input.imageFile.type });
    if (error) throw error;
    uploadedPath = path;
    updates.image_key = `${MENU_PHOTO_PREFIX}${path}`;
  }

  try {
    const { error } = await supabase.from("menu_items").update(updates).eq("id", id);
    if (error) throw error;
  } catch (error) {
    if (uploadedPath) {
      const { error: cleanupError } = await supabase.storage
        .from("menu-photos")
        .remove([uploadedPath]);
      if (cleanupError) {
        console.error(
          "Could not remove uploaded menu photo after failed burger update",
          cleanupError,
        );
      }
    }
    throw error;
  }

  const nextImageKey = updates.image_key;
  if (
    currentImageKey?.startsWith(MENU_PHOTO_PREFIX) &&
    nextImageKey !== undefined &&
    nextImageKey !== currentImageKey
  ) {
    const oldPath = currentImageKey.slice(MENU_PHOTO_PREFIX.length);
    const { error } = await supabase.storage.from("menu-photos").remove([oldPath]);
    if (error) console.error("Could not remove replaced menu photo", error);
  }
}
