import { useMutation, useQuery } from "@tanstack/react-query";
import { getEnabledDeliveryAreas, placeOrder } from "@/services/checkoutService";
import { getDeliverySchedule, getMealSlots } from "@/services/deliveryService";
import { deliveryScheduleQueryKey, mealSlotsQueryKey } from "@/lib/delivery";

export function useEnabledDeliveryAreas() {
  return useQuery({ queryKey: ["areas-enabled"], queryFn: getEnabledDeliveryAreas });
}

export function useDeliverySchedule() {
  return useQuery({
    queryKey: deliveryScheduleQueryKey,
    queryFn: getDeliverySchedule,
    refetchInterval: 60_000,
  });
}

export function useAvailableMealSlots() {
  return useQuery({
    queryKey: mealSlotsQueryKey,
    queryFn: async () => (await getMealSlots()).filter((slot) => slot.available),
  });
}

export function usePlaceOrder() {
  return useMutation({ mutationFn: placeOrder });
}
