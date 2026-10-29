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
} from "@/services/adminService";
import { getDeliverySchedule, getMealSlots } from "@/services/deliveryService";
import { deliveryScheduleQueryKey, mealSlotsQueryKey } from "@/lib/delivery";

export function useAdminPayments() {
  return useQuery({ queryKey: ["admin-payments"], queryFn: getAdminPayments });
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
    queryKey: deliveryScheduleQueryKey,
    queryFn: getDeliverySchedule,
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: deliveryScheduleQueryKey }),
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

export function useReceiptUrl() {
  return createReceiptUrl;
}
