import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createReceiptUrl,
  createMenuItem,
  getAdminDeliveryAreas,
  getAdminMenuExtras,
  getAdminMenuItems,
  getAdminOrders,
  getAdminPayments,
  reviewPayment,
  setDeliveryAreaEnabled,
  setDeliveryDateOpen,
  setMealSlotAvailability,
  setMenuExtraAvailability,
  setMenuItemAvailability,
  updateMenuItem,
} from "@/services/adminService";
import { getAdminDeliverySchedule, getMealSlots } from "@/services/deliveryService";
import {
  adminDeliveryScheduleQueryKey,
  deliveryScheduleQueryKey,
  mealSlotsQueryKey,
} from "@/lib/delivery";
import {
  completePaymentRefund,
  getAdminRefundRequests,
  resolveRefundFollowUp,
  reviewRefundRequest,
} from "@/services/refundService";

export function useAdminPayments() {
  return useQuery({ queryKey: ["admin-payments"], queryFn: getAdminPayments });
}

export function useAdminRefundRequests() {
  return useQuery({ queryKey: ["admin-refund-requests"], queryFn: getAdminRefundRequests });
}

export function useAdminOrders() {
  return useQuery({ queryKey: ["admin-orders"], queryFn: getAdminOrders });
}

export function useAdminCatalog() {
  const items = useQuery({ queryKey: ["admin-menu"], queryFn: getAdminMenuItems });
  const extras = useQuery({ queryKey: ["admin-extras"], queryFn: getAdminMenuExtras });
  const areas = useQuery({ queryKey: ["admin-areas"], queryFn: getAdminDeliveryAreas });
  return { items, extras, areas };
}

export function useAdminOrderingAvailability() {
  const schedule = useQuery({
    queryKey: adminDeliveryScheduleQueryKey,
    queryFn: getAdminDeliverySchedule,
    refetchInterval: 60_000,
  });
  const meals = useQuery({ queryKey: mealSlotsQueryKey, queryFn: getMealSlots });
  return { schedule, meals };
}

export function useToggleAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      table: "menu_items" | "menu_extras" | "delivery_areas" | "meal_slots";
      id: string;
      value: boolean;
    }) => {
      if (input.table === "menu_items") return setMenuItemAvailability(input.id, input.value);
      if (input.table === "menu_extras") return setMenuExtraAvailability(input.id, input.value);
      if (input.table === "delivery_areas") return setDeliveryAreaEnabled(input.id, input.value);
      return setMealSlotAvailability(input.id, input.value);
    },
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useSetDeliveryDateOpen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { deliveryDate: string; isOpen: boolean }) =>
      setDeliveryDateOpen(input.deliveryDate, input.isOpen),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminDeliveryScheduleQueryKey }),
        queryClient.invalidateQueries({ queryKey: deliveryScheduleQueryKey }),
      ]);
    },
  });
}

export function useCreateMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMenuItem,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-menu"] }),
        queryClient.invalidateQueries({ queryKey: ["menu"] }),
      ]);
    },
  });
}

export function useUpdateMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      values: Parameters<typeof updateMenuItem>[1];
      currentImageKey: string | null;
    }) => updateMenuItem(input.id, input.values, input.currentImageKey),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-menu"] }),
        queryClient.invalidateQueries({ queryKey: ["menu"] }),
      ]);
    },
  });
}

export function useReviewPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { paymentId: string; approve: boolean; note: string }) =>
      reviewPayment(input.paymentId, input.approve, input.note),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
  });
}

export function useReviewRefundRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reviewRefundRequest,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-refund-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
    },
  });
}

export function useCompletePaymentRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: completePaymentRefund,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-refund-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
    },
  });
}

export function useResolveRefundFollowUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resolveRefundFollowUp,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-refund-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
    },
  });
}

export function useReceiptUrl() {
  return createReceiptUrl;
}
