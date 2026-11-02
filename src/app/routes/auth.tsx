import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/features/auth";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search["redirect"] === "string" ? search["redirect"] : undefined,
    ...(typeof search["error_description"] === "string"
      ? { authError: search["error_description"] }
      : typeof search["error"] === "string"
        ? { authError: search["error"] }
        : {}),
  }),
  head: () => ({
    meta: [
      { title: "Sign in — TM's Burgers" },
      { name: "description", content: "Sign in or create an account to place your TM's order." },
      { property: "og:title", content: "Sign in — TM's Burgers" },
      { property: "og:description", content: "Sign in to check out." },
    ],
  }),
  component: AuthRoute,
});

function AuthRoute() {
  const { redirect, authError } = Route.useSearch();
  return <AuthPage redirect={redirect} {...(authError ? { authError } : {})} />;
}
