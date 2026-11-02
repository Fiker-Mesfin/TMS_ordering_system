import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMyOrders,
  getOrderDetails,
  getOrderRescheduleOptions,
  rescheduleOrderDelivery,
  cancelUnpaidOrder,
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
  return useQuery({
    queryKey: ["order", orderId],
    queryFn: () => getOrderDetails(orderId),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useOrderRescheduleOptions(orderId: string) {
  return useQuery({
    queryKey: ["order-reschedule-options", orderId],
    queryFn: () => getOrderRescheduleOptions(orderId),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useRescheduleOrder(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deliveryDate: string) => rescheduleOrderDelivery({ orderId, deliveryDate }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["order", orderId] }),
        queryClient.invalidateQueries({ queryKey: ["order-reschedule-options", orderId] }),
        queryClient.invalidateQueries({ queryKey: ["my-orders"] }),
      ]);
    },
  });
}

export function useCancelUnpaidOrder(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cancelUnpaidOrder(orderId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["order", orderId] }),
        queryClient.invalidateQueries({ queryKey: ["my-orders"] }),
        queryClient.invalidateQueries({ queryKey: ["order-reschedule-options", orderId] }),
      ]);
    },
  });
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
