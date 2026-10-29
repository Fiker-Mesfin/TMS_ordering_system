import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMyOrders,
  getOrderDetails,
  submitPaymentProof,
  uploadPaymentReceipt,
} from "@/services/orderService";

export function useMyOrders(userId?: string) {
  return useQuery({
    queryKey: ["my-orders", userId],
    enabled: !!userId,
    queryFn: () => {
      if (!userId) throw new Error("A signed-in user is required to load orders");
      return getMyOrders(userId);
    },
  });
}

export function useOrderDetails(orderId: string) {
  return useQuery({ queryKey: ["order", orderId], queryFn: () => getOrderDetails(orderId) });
}

export function useSubmitPaymentProof(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitPaymentProof,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["order", orderId] }),
  });
}

export function useUploadPaymentReceipt() {
  return useMutation({
    mutationFn: (input: { userId: string; orderId: string; file: File }) =>
      uploadPaymentReceipt(input.userId, input.orderId, input.file),
  });
}
