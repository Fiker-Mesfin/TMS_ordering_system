export type AdminBurgerFilter = "all" | "signature" | "double";

type OrderWithItems = {
  order_items: { name: string; quantity: number }[];
};

function isSignatureBurger(name: string) {
  return name.toLowerCase().includes("signature");
}

function isDoubleBurger(name: string) {
  return name.toLowerCase().includes("double");
}

export function matchesAdminBurgerFilter(name: string, filter: AdminBurgerFilter) {
  if (filter === "all") return true;
  return filter === "signature" ? isSignatureBurger(name) : isDoubleBurger(name);
}

export function getAdminBurgerCounts(orders: OrderWithItems[]) {
  return orders.reduce(
    (counts, order) => {
      for (const item of order.order_items) {
        if (isSignatureBurger(item.name)) counts.signature += item.quantity;
        if (isDoubleBurger(item.name)) counts.doubleTrouble += item.quantity;
      }
      return counts;
    },
    { signature: 0, doubleTrouble: 0 },
  );
}
