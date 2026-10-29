import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { getIsAdmin, subscribeToAuthChanges } from "@/services/authService";

type AuthCtx = { user: User | null; ready: boolean; isAdmin: boolean };
const Ctx = createContext<AuthCtx>({ user: null, ready: false, isAdmin: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const qc = useQueryClient();

  useEffect(() => {
    const { data } = subscribeToAuthChanges((event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") qc.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, qc]);

  const { data: isAdmin = false } = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: () => {
      if (!user) throw new Error("A signed-in user is required to check the owner role");
      return getIsAdmin(user.id);
    },
  });

  return (
    <Ctx.Provider value={{ user, ready, isAdmin: !!user && isAdmin }}>{children}</Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
