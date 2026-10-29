import { createFileRoute } from "@tanstack/react-router";
import { MyOrdersPage } from "@/features/orders";

export const Route = createFileRoute("/_authenticated/orders/")({
  head: () => ({
    meta: [
      { title: "My Orders — TMS Burgers" },
      { name: "description", content: "Track your TMS orders and payment status." },
      { property: "og:title", content: "My Orders — TMS Burgers" },
      { property: "og:description", content: "Track your orders." },
    ],
  }),
  component: MyOrdersPage,
});
