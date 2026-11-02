import { createFileRoute } from "@tanstack/react-router";
import { AboutPage } from "@/features/about";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About TM's Burger" },
      {
        name: "description",
        content: "TM's Burger — quality at an affordable price, flavor on every AAU campus.",
      },
    ],
  }),
  component: AboutPage,
});
