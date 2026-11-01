import { createFileRoute } from "@tanstack/react-router";
import { MenuPage } from "@/features/menu";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TM's Burgers — Menu & free campus delivery" },
      {
        name: "description",
        content: "Browse TM's burgers and extras. Free delivery to AAU campuses in Addis Ababa.",
      },
      { property: "og:title", content: "TM's Burgers — Menu" },
      { property: "og:description", content: "Smash burgers delivered free to AAU campuses." },
    ],
  }),
  component: MenuPage,
});
