import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ShoppingBag, LogOut, Moon, Sun, Menu as MenuIcon } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { useSignOut } from "@/hooks/useSignOut";
import { useTheme } from "@/hooks/useTheme";
import { NotificationBell } from "@/shared/layout/NotificationBell";

export function SiteHeader() {
  const { count, resetActive } = useCart();
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const signOutUser = useSignOut();
  const { theme, toggle } = useTheme();

  async function signOut() {
    resetActive();
    await qc.cancelQueries();
    qc.clear();
    await signOutUser();
    navigate({ to: "/", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:h-16 sm:px-4">
        <Link to="/" className="font-display text-3xl tracking-wide text-primary">
          TM's<span className="text-foreground">.</span>
        </Link>
        <div className="flex items-center gap-0.5 sm:gap-1.5 lg:gap-2">
          <nav aria-label="Main navigation" className="hidden items-center gap-2 sm:flex lg:gap-3">
            <Button asChild variant="ghost" size="sm" className="h-10 px-3 text-base">
              <Link to="/">Menu</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="h-10 px-3 text-base">
              <Link to="/about">About</Link>
            </Button>
            {user && (
              <Button asChild variant="ghost" size="sm" className="h-10 px-3 text-base">
                <Link to="/orders">My Orders</Link>
              </Button>
            )}
            {isAdmin && (
              <Button asChild variant="ghost" size="sm" className="h-10 px-3 text-base">
                <Link to="/admin">Owner</Link>
              </Button>
            )}
          </nav>
          {user && <NotificationBell key={user.id} />}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="sm:h-10 sm:w-10 sm:[&_svg]:size-5"
          >
            {theme === "dark" ? <Sun /> : <Moon />}
          </Button>
          {user ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              aria-label="Sign out"
              title="Sign out"
              className="sm:h-10 sm:w-10 sm:[&_svg]:size-5"
            >
              <LogOut />
            </Button>
          ) : (
            <Button asChild variant="ghost" size="sm" className="px-2 sm:px-3">
              <Link to="/auth" search={{ redirect: undefined }}>
                Sign in
              </Link>
            </Button>
          )}
          <Button
            asChild
            size="icon"
            className="relative sm:h-10 sm:w-auto sm:px-3 sm:[&_svg]:size-5"
          >
            <Link
              to="/cart"
              aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}`}
              title={`Cart, ${count} ${count === 1 ? "item" : "items"}`}
            >
              <ShoppingBag />
              <span className="sr-only sm:not-sr-only sm:ml-1">{count}</span>
              {count > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold leading-none text-primary-foreground sm:hidden"
                >
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open navigation menu"
                title="Open navigation menu"
                className="sm:hidden"
              >
                <MenuIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to="/">Menu</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/about">About</Link>
              </DropdownMenuItem>
              {user && (
                <DropdownMenuItem asChild>
                  <Link to="/orders">My Orders</Link>
                </DropdownMenuItem>
              )}
              {isAdmin && (
                <DropdownMenuItem asChild>
                  <Link to="/admin">Owner</Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
