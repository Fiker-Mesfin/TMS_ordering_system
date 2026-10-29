import { supabase } from "@/integrations/supabase/client";

export async function requestPaymentRefund(input: {
  orderId: string;
  method: "cbe" | "telebirr";
  accountNumber: string;
  reason: string;
}) {
  const { data, error } = await supabase.rpc("request_payment_refund", {
    _order_id: input.orderId,
    _method: input.method,
    _account_number: input.accountNumber,
    _reason: input.reason,
  });
  if (error) throw error;
  return data;
}

export async function requestRefundFollowUp(requestId: string, note: string) {
  const { error } = await supabase.rpc("request_refund_follow_up", {
    _request_id: requestId,
    _note: note,
  });
  if (error) throw error;
}

export async function resolveRefundCustomerDecision(
  requestId: string,
  decision: "continue" | "cancel",
) {
  const { error } = await supabase.rpc("resolve_refund_customer_decision", {
    _request_id: requestId,
    _decision: decision,
  });
  if (error) throw error;
}

export async function getRefundProofUrl(path: string) {
  const { data, error } = await supabase.storage.from("refund-proofs").createSignedUrl(path, 300);
  if (error) throw error;
  if (!data) throw new Error("Refund proof URL was not returned");
  return data.signedUrl;
}

export async function getAdminRefundRequests() {
  const { data, error } = await supabase
    .from("refund_requests")
    .select(
      "*, orders!refund_requests_order_id_fkey(order_number,contact_name,contact_phone,delivery_area_name), payments!refund_requests_payment_id_fkey(method,transaction_ref)",
    )
    .or("status.in.(pending,approved),follow_up_status.eq.pending")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function reviewRefundRequest(input: {
  requestId: string;
  approve: boolean;
  note: string;
}) {
  const { error } = await supabase.rpc("review_refund_request", {
    _request_id: input.requestId,
    _approve: input.approve,
    _note: input.note,
  });
  if (error) throw error;
}

export async function uploadRefundProof(requestId: string, file: File) {
  const extensionByType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
  };
  const extension = extensionByType[file.type];
  if (!extension || file.size > 5 * 1024 * 1024) {
    throw new Error("Choose a JPG, PNG, WebP, or PDF proof smaller than 5 MB");
  }
  const path = `${requestId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from("refund-proofs")
    .upload(path, file, { contentType: file.type });
  if (error) throw error;
  return path;
}

export async function removeRefundProof(path: string) {
  const { error } = await supabase.storage.from("refund-proofs").remove([path]);
  if (error) throw error;
}

export async function completePaymentRefund(input: {
  requestId: string;
  reference: string;
  proofPath: string;
}) {
  const { error } = await supabase.rpc("complete_payment_refund", {
    _request_id: input.requestId,
    _refund_reference: input.reference,
    _proof_path: input.proofPath,
  });
  if (error) throw error;
}

export async function resolveRefundFollowUp(input: { requestId: string; note: string }) {
  const { error } = await supabase.rpc("resolve_refund_follow_up", {
    _request_id: input.requestId,
    _note: input.note,
  });
  if (error) throw error;
}
