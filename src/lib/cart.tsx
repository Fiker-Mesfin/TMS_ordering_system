import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

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
};

const Ctx = createContext<CartCtx | null>(null);
const STORAGE = "tms-cart-v1";

export const lineKey = (menuItemId: string, extraIds: string[]) =>
  `${menuItemId}|${[...extraIds].sort().join(",")}`;

export const lineUnit = (l: Pick<CartLine, "basePrice" | "extras">) =>
  l.basePrice + l.extras.reduce((s, e) => s + e.price, 0);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) setLines(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE, JSON.stringify(lines));
  }, [lines, loaded]);

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
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({
      lines,
      count: lines.reduce((s, l) => s + l.quantity, 0),
      estimate: lines.reduce((s, l) => s + lineUnit(l) * l.quantity, 0),
      add,
      setQty,
      remove,
      clear,
    }),
    [lines, add, setQty, remove, clear],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}
