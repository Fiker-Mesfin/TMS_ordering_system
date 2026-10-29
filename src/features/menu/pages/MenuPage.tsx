import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import hero from "@/assets/hero.jpg";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { useCart } from "@/lib/cart";
import { formatETB } from "@/lib/shop";
import { useAvailableMenuExtras, useMenuItems } from "../hooks/useMenuData";
import type { MenuExtra, MenuItem } from "@/types/menu";
import { MenuPhoto } from "@/shared/menu/MenuPhoto";

export function MenuPage() {
  const { data: items = [], isLoading } = useMenuItems();
  const { data: extras = [] } = useAvailableMenuExtras();
  const [selected, setSelected] = useState<MenuItem | null>(null);

  return (
    <>
      <section className="relative overflow-hidden">
        <img
          src={hero}
          alt="Double smash burger over open flames"
          width={1600}
          height={912}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-hero-fade" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:py-32">
          <p className="inline-flex rounded-full border border-primary/30 bg-background/90 px-4 py-2 text-sm font-bold uppercase tracking-[0.2em] text-primary shadow-md backdrop-blur-sm">
            Free delivery · AAU campuses
          </p>
          <h1 className="mt-3 max-w-xl text-6xl leading-none sm:text-8xl">
            Smashed. <span className="text-primary">Stacked.</span> Delivered.
          </h1>
          <p className="mt-5 max-w-md text-muted-foreground">
            Pick your burger, load it with extras, and pay by CBE or Telebirr transfer.
          </p>
          <Button asChild size="lg" className="mt-8 bg-flame shadow-flame">
            <a href="#menu">See the menu</a>
          </Button>
        </div>
      </section>

      <section id="menu" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-5xl">The Menu</h2>
        {isLoading ? (
          <p className="mt-8 text-muted-foreground">Loading…</p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <article
                key={item.id}
                className="group overflow-hidden rounded-xl border border-border bg-card"
              >
                <div className="aspect-square overflow-hidden">
                  <MenuPhoto
                    imageKey={item.image_key}
                    alt={item.name}
                    loading="lazy"
                    width={816}
                    height={816}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-2xl">{item.name}</h3>
                    <span className="font-semibold text-primary">{formatETB(item.price)}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                  <Button
                    className="mt-4 w-full"
                    disabled={!item.available}
                    onClick={() => setSelected(item)}
                  >
                    {item.available ? "Add to cart" : "Sold out"}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {selected && <AddDialog item={selected} extras={extras} onClose={() => setSelected(null)} />}
    </>
  );
}

function AddDialog({
  item,
  extras,
  onClose,
}: {
  item: MenuItem;
  extras: MenuExtra[];
  onClose: () => void;
}) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [chosen, setChosen] = useState<string[]>([]);
  const chosenExtras = extras.filter((e) => chosen.includes(e.id));
  const unit = Number(item.price) + chosenExtras.reduce((s, e) => s + e.price, 0);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-3xl uppercase">{item.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-semibold">Extras (optional)</p>
            <div className="space-y-2">
              {extras.map((e) => (
                <label
                  key={e.id}
                  className="flex cursor-pointer items-center justify-between rounded-md border border-border px-3 py-2"
                >
                  <span className="flex items-center gap-3">
                    <Checkbox
                      checked={chosen.includes(e.id)}
                      onCheckedChange={(c) =>
                        setChosen((p) => (c ? [...p, e.id] : p.filter((x) => x !== e.id)))
                      }
                    />
                    {e.name}
                  </span>
                  <span className="text-sm text-muted-foreground">+{formatETB(e.price)}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Quantity</span>
            <div className="flex items-center gap-3">
              <Button
                size="icon"
                variant="secondary"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Less"
              >
                <Minus />
              </Button>
              <span className="w-6 text-center font-semibold">{qty}</span>
              <Button
                size="icon"
                variant="secondary"
                onClick={() => setQty((q) => Math.min(20, q + 1))}
                aria-label="More"
              >
                <Plus />
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            className="w-full bg-flame"
            onClick={() => {
              add({
                menuItemId: item.id,
                name: item.name,
                imageKey: item.image_key,
                basePrice: Number(item.price),
                quantity: qty,
                extras: chosenExtras,
              });
              toast.success(`${qty} × ${item.name} added`);
              onClose();
            }}
          >
            Add {qty} · {formatETB(unit * qty)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
