import { createFileRoute } from "@tanstack/react-router";
import { CartPage } from "@/features/cart";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — TMS Burgers" },
      { name: "description", content: "Review your TMS burger order before checkout." },
      { property: "og:title", content: "Your cart — TMS Burgers" },
      { property: "og:description", content: "Review your order before checkout." },
    ],
  }),
  component: CartPage,
});
