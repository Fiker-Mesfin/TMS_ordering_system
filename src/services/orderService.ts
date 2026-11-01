import { supabase } from "@/integrations/supabase/client";

export type OrderRescheduleOption = {
  can_reschedule: boolean;
  delivery_date: string | null;
  is_open: boolean;
};

export async function getMyOrders(userId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, cancelled_at, total, created_at, delivery_date, meal_slot, delivery_area_name, payments(status,submitted_at)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getOrderRescheduleOptions(orderId: string): Promise<OrderRescheduleOption[]> {
  const { data, error } = await supabase.rpc("get_order_reschedule_options", {
    _order_id: orderId,
  });
  if (error) throw error;
  return data;
}

export async function rescheduleOrderDelivery(input: { orderId: string; deliveryDate: string }) {
  const { error } = await supabase.rpc("reschedule_order_delivery", {
    _order_id: input.orderId,
    _delivery_date: input.deliveryDate,
  });
  if (error) throw error;
}

export async function cancelUnpaidOrder(orderId: string) {
  const { error } = await supabase.rpc("cancel_unpaid_order", {
    _order_id: orderId,
  });
  if (error) throw error;
}

export async function getOrderDetails(orderId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*), payments(*), refund_requests(*)")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function uploadPaymentReceipt(userId: string, orderId: string, file: File) {
  const ext =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${userId}/${orderId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("receipts").upload(path, file);
  if (error) throw error;
  return path;
}

export async function submitPaymentProof(input: {
  orderId: string;
  method: string;
  reference: string;
  receiptPath: string | null;
}) {
  const { error } = await supabase.rpc("submit_payment_proof", {
    _order_id: input.orderId,
    _method: input.method,
    _reference: input.reference,
    _receipt_path: input.receiptPath,
  });
  if (error) throw error;
}
