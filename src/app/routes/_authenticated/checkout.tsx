import { createFileRoute } from "@tanstack/react-router";
import { CheckoutPage } from "@/features/checkout";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — TM's Burgers" },
      { name: "description", content: "Enter delivery details for your TM's order." },
      { property: "og:title", content: "Checkout — TM's Burgers" },
      { property: "og:description", content: "Delivery details and order placement." },
    ],
  }),
  component: CheckoutPage,
});
