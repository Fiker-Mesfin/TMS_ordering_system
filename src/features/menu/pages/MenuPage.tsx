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
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-32">
          <p className="inline-flex rounded-full border border-primary/30 bg-background/95 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-primary shadow-md backdrop-blur-sm sm:px-4 sm:text-sm sm:tracking-[0.2em] md:text-base">
            Free delivery · AAU campuses
          </p>
          <h1 className="mt-4 max-w-2xl text-5xl leading-[0.95] sm:mt-3 sm:text-8xl">
            Smashed. <span className="text-primary">Stacked.</span> Delivered.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-foreground/90">
            Pick your burger, load it with extras, and pay by CBE or Telebirr transfer.
          </p>
          <Button asChild size="lg" className="mt-7 bg-flame shadow-flame sm:mt-8">
            <a href="#menu">See the menu</a>
          </Button>
        </div>
      </section>

      <section id="menu" className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <h2 className="text-4xl sm:text-5xl">The Menu</h2>
        {isLoading ? (
          <p className="mt-8 text-base text-muted-foreground">Loading…</p>
        ) : (
          <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {items.map((item) => (
              <article
                key={item.id}
                className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
              >
                <div className="aspect-[4/3] overflow-hidden sm:aspect-square">
                  <MenuPhoto
                    imageKey={item.image_key}
                    alt={item.name}
                    loading="lazy"
                    width={816}
                    height={816}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="min-w-0 text-xl leading-tight sm:text-2xl">{item.name}</h3>
                    <span className="shrink-0 whitespace-nowrap pt-0.5 font-semibold text-primary">
                      {formatETB(item.price)}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-base leading-relaxed text-card-foreground/80">
                    {item.description}
                  </p>
                  <div className="mt-auto pt-4">
                    <Button
                      className="min-h-11 w-full text-sm"
                      disabled={!item.available}
                      onClick={() => setSelected(item)}
                    >
                      {item.available ? "Add to cart" : "Sold out"}
                    </Button>
                  </div>
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
            <p className="mb-2 text-base font-semibold">Extras (optional)</p>
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
                  <span className="text-base text-muted-foreground">+{formatETB(e.price)}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold">Quantity</span>
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
