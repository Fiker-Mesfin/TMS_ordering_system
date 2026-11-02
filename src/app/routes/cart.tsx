import { createFileRoute } from "@tanstack/react-router";
import { CartPage } from "@/features/cart";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — TM's Burgers" },
      { name: "description", content: "Review your TM's burger order before checkout." },
      { property: "og:title", content: "Your cart — TM's Burgers" },
      { property: "og:description", content: "Review your order before checkout." },
    ],
  }),
  component: CartPage,
});
