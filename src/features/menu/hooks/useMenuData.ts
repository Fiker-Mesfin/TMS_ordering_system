import { useQuery } from "@tanstack/react-query";
import { getAvailableMenuExtras, getMenuItems } from "@/services/menuService";

export function useMenuItems() {
  return useQuery({ queryKey: ["menu"], queryFn: getMenuItems });
}

export function useAvailableMenuExtras() {
  return useQuery({ queryKey: ["extras"], queryFn: getAvailableMenuExtras });
}
