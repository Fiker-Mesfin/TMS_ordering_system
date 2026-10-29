import { supabase } from "@/integrations/supabase/client";

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
