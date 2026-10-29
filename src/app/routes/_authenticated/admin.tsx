import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "@/features/admin";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Owner dashboard — TMS Burgers" },
      { name: "description", content: "Verify payments and manage the TMS menu." },
      { property: "og:title", content: "Owner dashboard — TMS Burgers" },
      { property: "og:description", content: "Verify payments and manage menu." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});
