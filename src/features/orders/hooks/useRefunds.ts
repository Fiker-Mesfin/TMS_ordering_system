import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  requestPaymentRefund,
  requestRefundFollowUp,
  resolveRefundCustomerDecision,
} from "@/services/refundService";

export function useRequestPaymentRefund(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: requestPaymentRefund,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["order", orderId] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
    },
  });
}

export function useRequestRefundFollowUp(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { requestId: string; note: string }) =>
      requestRefundFollowUp(input.requestId, input.note),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["order", orderId] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
    },
  });
}

export function useResolveRefundDecision(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { requestId: string; decision: "continue" | "cancel" }) =>
      resolveRefundCustomerDecision(input.requestId, input.decision),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["order", orderId] }),
        queryClient.invalidateQueries({ queryKey: ["my-orders"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-orders"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
    },
  });
}
