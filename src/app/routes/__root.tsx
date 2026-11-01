import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { type ReactNode } from "react";

import appCss from "@/styles/global.css?url";
import { Toaster } from "@/shared/ui/sonner";
import { CartProvider } from "@/lib/cart";
import { AuthProvider } from "@/lib/auth";
import { SiteHeader } from "@/shared/layout/site-header";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl text-primary">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">This page doesn't exist.</p>
        <Link to="/" className="mt-6 inline-block text-primary underline">
          Back to the menu
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong. Try again.</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "TMS Burgers" },
      { name: "description", content: "Order TMS burgers for free delivery to AAU campuses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    headScripts: [
      {
        children: `try{if(localStorage.getItem("tms-theme")==="light")document.documentElement.classList.add("light")}catch{}`,
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@400;500;600;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/tms-burger-icon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <SiteHeader />
          <main className="min-h-[calc(100vh-4rem)]">
            <Outlet />
          </main>
          <footer className="border-t border-border bg-card px-4 py-10 text-sm text-muted-foreground">
            <div className="mx-auto max-w-5xl">
              <div className="grid gap-8 sm:grid-cols-2 sm:items-start">
                <div>
                  <p className="font-display text-2xl uppercase tracking-wide text-foreground">
                    TMS Burgers
                  </p>
                  <p className="mt-2 max-w-sm leading-relaxed">
                    Fresh, satisfying burgers delivered free to AAU campuses across Addis Ababa.
                    Find your favorite and let us bring it to you.
                  </p>
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <h2 className="border-b border-primary/30 pb-2 font-display text-lg uppercase tracking-wide text-primary">
                      Follow us
                    </h2>
                    <ul className="mt-3 space-y-2">
                      <li>
                        <a
                          href="https://t.me/tms_Burgers"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="transition-colors hover:text-primary"
                        >
                          Telegram channel
                        </a>
                      </li>
                      <li>
                        <a
                          href="https://www.tiktok.com/@tms.burger?_r=1&_t=ZS-9B3BsCkZjfU"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="transition-colors hover:text-primary"
                        >
                          TikTok
                        </a>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h2 className="border-b border-primary/30 pb-2 font-display text-lg uppercase tracking-wide text-primary">
                      Contact us
                    </h2>
                    <ul className="mt-3 space-y-2">
                      <li>
                        <a
                          href="https://t.me/TMS_BG"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="transition-colors hover:text-primary"
                        >
                          Telegram: @TMS_BG
                        </a>
                      </li>
                      <li>
                        <a
                          href="tel:0909841353"
                          className="transition-colors hover:text-primary"
                        >
                          Phone: 0909841353
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="mt-8 border-t border-border pt-5 text-xs">
                <p>© {new Date().getFullYear()} TMS Burgers. All rights reserved.</p>
              </div>
            </div>
          </footer>
          <Toaster />
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
