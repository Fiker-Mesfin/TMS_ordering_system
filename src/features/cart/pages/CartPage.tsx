import { Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useCart, lineUnit } from "@/lib/cart";
import { formatETB } from "@/lib/shop";
import { MenuPhoto } from "@/shared/menu/MenuPhoto";

export function CartPage() {
  const { lines, setQty, remove, estimate } = useCart();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-5xl">Your cart</h1>
      {lines.length === 0 ? (
        <div className="mt-8 rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">Your cart is empty.</p>
          <Button asChild className="mt-4">
            <Link to="/">Browse the menu</Link>
          </Button>
        </div>
      ) : (
        <>
          <ul className="mt-8 space-y-3">
            {lines.map((l) => (
              <li key={l.key} className="flex gap-4 rounded-xl border border-border bg-card p-3">
                <MenuPhoto
                  imageKey={l.imageKey}
                  alt={l.name}
                  width={80}
                  height={80}
                  loading="lazy"
                  className="h-20 w-20 rounded-md object-cover"
                />
                <div className="flex-1">
                  <div className="flex justify-between gap-2">
                    <p className="font-semibold">{l.name}</p>
                    <p className="font-semibold">{formatETB(lineUnit(l) * l.quantity)}</p>
                  </div>
                  {l.extras.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      + {l.extras.map((e) => e.name).join(", ")}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      onClick={() => setQty(l.key, l.quantity - 1)}
                      aria-label="Less"
                    >
                      <Minus />
                    </Button>
                    <span className="w-6 text-center">{l.quantity}</span>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      onClick={() => setQty(l.key, l.quantity + 1)}
                      aria-label="More"
                    >
                      <Plus />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="ml-auto h-8 w-8"
                      onClick={() => remove(l.key)}
                      aria-label="Remove"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6 space-y-2 rounded-xl border border-border bg-card p-5">
            <Row label="Subtotal (estimate)" value={formatETB(estimate)} />
            <Row label="Delivery" value="FREE · ETB 0" />
            <p className="text-xs text-muted-foreground">
              Final total is confirmed by our system at checkout.
            </p>
            <Button asChild size="lg" className="mt-3 w-full bg-flame shadow-flame">
              <Link to="/checkout">Checkout</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
