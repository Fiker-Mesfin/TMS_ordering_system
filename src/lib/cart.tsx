import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { subscribeToAuthChanges } from "@/services/authService";
import { useAuth } from "@/lib/auth";

export type CartExtra = { id: string; name: string; price: number };
export type CartLine = {
  key: string;
  menuItemId: string;
  name: string;
  imageKey: string | null;
  basePrice: number;
  quantity: number;
  extras: CartExtra[];
};

type CartCtx = {
  lines: CartLine[];
  count: number;
  estimate: number;
  add: (line: Omit<CartLine, "key">) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  resetActive: () => void;
};

const Ctx = createContext<CartCtx | null>(null);
export const GUEST_STORAGE = "tms-cart-v1";
export const getUserStorageKey = (userId: string) => `tms-cart-user-${userId}`;

export function mergeCartLines(base: CartLine[], incoming: CartLine[]): CartLine[] {
  const result = [...base];
  for (const item of incoming) {
    const idx = result.findIndex((l) => l.key === item.key);
    const existing = idx >= 0 ? result[idx] : undefined;
    if (existing) {
      result[idx] = {
        ...existing,
        quantity: Math.min(20, existing.quantity + item.quantity),
      };
    } else {
      result.push(item);
    }
  }
  return result;
}

function getStoredLines(key: string): CartLine[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    /* ignore */
  }
  return [];
}

function saveStoredLines(key: string, lines: CartLine[]) {
  try {
    if (lines.length === 0) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(lines));
    }
  } catch {
    /* ignore */
  }
}

export const lineKey = (menuItemId: string, extraIds: string[]) =>
  `${menuItemId}|${[...extraIds].sort().join(",")}`;

export const lineUnit = (l: Pick<CartLine, "basePrice" | "extras">) =>
  l.basePrice + l.extras.reduce((s, e) => s + e.price, 0);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);
  const activeUserIdRef = useRef<string | null>(null);
  const initializedRef = useRef(false);
  const linesRef = useRef(lines);
  linesRef.current = lines;

  // Initialize and handle user auth changes
  useEffect(() => {
    const nextUserId = user?.id ?? null;
    const prevUserId = activeUserIdRef.current;

    // First initialization on mount
    if (!initializedRef.current) {
      initializedRef.current = true;
      activeUserIdRef.current = nextUserId;
      if (nextUserId) {
        const userSaved = getStoredLines(getUserStorageKey(nextUserId));
        if (userSaved.length > 0) {
          setLines(userSaved);
        } else {
          // Migration from guest storage if user has no saved cart yet
          const guestSaved = getStoredLines(GUEST_STORAGE);
          if (guestSaved.length > 0) {
            setLines(guestSaved);
            saveStoredLines(getUserStorageKey(nextUserId), guestSaved);
            try {
              localStorage.removeItem(GUEST_STORAGE);
            } catch {
              /* ignore */
            }
          } else {
            setLines([]);
          }
        }
      } else {
        setLines(getStoredLines(GUEST_STORAGE));
      }
      setLoaded(true);
      return;
    }

    if (prevUserId === nextUserId) return;

    // User signed out: clear active in-memory cart without deleting user's saved cart
    if (prevUserId && !nextUserId) {
      activeUserIdRef.current = null;
      setLines([]);
      try {
        localStorage.removeItem(GUEST_STORAGE);
      } catch {
        /* ignore */
      }
      return;
    }

    // User signed in: restore user's saved cart, merging with any guest items added while signed out
    if (nextUserId) {
      activeUserIdRef.current = nextUserId;
      const userSaved = getStoredLines(getUserStorageKey(nextUserId));
      const guestSaved = getStoredLines(GUEST_STORAGE);
      const currentLines = linesRef.current;
      const guestToMerge = guestSaved.length > 0 ? guestSaved : currentLines;
      let finalLines: CartLine[];

      if (userSaved.length > 0) {
        finalLines = mergeCartLines(userSaved, guestToMerge);
      } else if (guestToMerge.length > 0) {
        finalLines = guestToMerge;
      } else {
        finalLines = [];
      }

      setLines(finalLines);
      saveStoredLines(getUserStorageKey(nextUserId), finalLines);
      try {
        localStorage.removeItem(GUEST_STORAGE);
      } catch {
        /* ignore */
      }
    }
  }, [user]);

  // Save cart lines to the active storage whenever lines change
  useEffect(() => {
    if (!loaded) return;
    const uid = activeUserIdRef.current;
    const key = uid ? getUserStorageKey(uid) : GUEST_STORAGE;
    saveStoredLines(key, lines);
  }, [lines, loaded]);

  // Also reset active on Supabase SIGNED_OUT auth events
  useEffect(() => {
    const { data } = subscribeToAuthChanges((event) => {
      if (event === "SIGNED_OUT") {
        activeUserIdRef.current = null;
        setLines([]);
        try {
          localStorage.removeItem(GUEST_STORAGE);
        } catch {
          /* ignore */
        }
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const add = useCallback((line: Omit<CartLine, "key">) => {
    const key = lineKey(line.menuItemId, line.extras.map((e) => e.id));
    setLines((prev) => {
      const found = prev.find((l) => l.key === key);
      if (found) return prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(20, l.quantity + line.quantity) } : l));
      return [...prev, { ...line, key }];
    });
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setLines((prev) =>
      qty <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(20, qty) } : l)),
    );
  }, []);

  const remove = useCallback((key: string) => setLines((p) => p.filter((l) => l.key !== key)), []);

  // clear deletes cart in state AND permanently removes storage for current user/guest
  const clear = useCallback(() => {
    setLines([]);
    const uid = activeUserIdRef.current;
    try {
      if (uid) {
        localStorage.removeItem(getUserStorageKey(uid));
      }
      localStorage.removeItem(GUEST_STORAGE);
    } catch {
      /* ignore */
    }
  }, []);

  // resetActive resets the active cart without deleting the user's persistent cart
  const resetActive = useCallback(() => {
    activeUserIdRef.current = null;
    setLines([]);
    try {
      localStorage.removeItem(GUEST_STORAGE);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      lines,
      count: lines.reduce((s, l) => s + l.quantity, 0),
      estimate: lines.reduce((s, l) => s + lineUnit(l) * l.quantity, 0),
      add,
      setQty,
      remove,
      clear,
      resetActive,
    }),
    [lines, add, setQty, remove, clear, resetActive],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}
