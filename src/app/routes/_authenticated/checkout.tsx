import { createFileRoute } from "@tanstack/react-router";
import { CheckoutPage } from "@/features/checkout";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — TMS Burgers" },
      { name: "description", content: "Enter delivery details for your TMS order." },
      { property: "og:title", content: "Checkout — TMS Burgers" },
      { property: "og:description", content: "Delivery details and order placement." },
    ],
  }),
  component: CheckoutPage,
});
