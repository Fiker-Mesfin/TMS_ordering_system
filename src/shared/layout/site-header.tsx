import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ShoppingBag, LogOut, Moon, Sun } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { useSignOut } from "@/hooks/useSignOut";
import { useTheme } from "@/hooks/useTheme";
import { NotificationBell } from "@/shared/layout/NotificationBell";

export function SiteHeader() {
  const { count } = useCart();
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const signOutUser = useSignOut();
  const { theme, toggle } = useTheme();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await signOutUser();
    navigate({ to: "/", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="font-display text-3xl uppercase tracking-wide text-primary">
          TMS<span className="text-foreground">.</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">Menu</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/about">About</Link>
          </Button>
          {user && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/orders">My Orders</Link>
            </Button>
          )}
          {isAdmin && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin">Owner</Link>
            </Button>
          )}
          {user && <NotificationBell key={user.id} />}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun /> : <Moon />}
          </Button>
          {user ? (
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
              <LogOut />
            </Button>
          ) : (
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth" search={{ redirect: undefined }}>
                Sign in
              </Link>
            </Button>
          )}
          <Button asChild size="sm" className="relative">
            <Link to="/cart" aria-label="Cart">
              <ShoppingBag />
              <span>{count}</span>
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
