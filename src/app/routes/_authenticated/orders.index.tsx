import { createFileRoute } from "@tanstack/react-router";
import { MyOrdersPage } from "@/features/orders";

export const Route = createFileRoute("/_authenticated/orders/")({
  head: () => ({
    meta: [
      { title: "My Orders — TM's Burgers" },
      { name: "description", content: "Track your TM's orders and payment status." },
      { property: "og:title", content: "My Orders — TM's Burgers" },
      { property: "og:description", content: "Track your orders." },
    ],
  }),
  component: MyOrdersPage,
});
