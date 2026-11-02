import { createFileRoute } from "@tanstack/react-router";
import { OrderDetailPage } from "@/features/orders";

export const Route = createFileRoute("/_authenticated/orders/$orderId")({
  head: () => ({
    meta: [
      { title: "Order details — TM's Burgers" },
      { name: "description", content: "Order status and bank transfer instructions." },
      { property: "og:title", content: "Order details — TM's Burgers" },
      { property: "og:description", content: "Order status and payment." },
    ],
  }),
  component: OrderDetailRoute,
});

function OrderDetailRoute() {
  const { orderId } = Route.useParams();
  return <OrderDetailPage orderId={orderId} />;
}
