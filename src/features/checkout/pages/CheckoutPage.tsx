import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { RequiredMark } from "@/shared/ui/required-mark";
import { Textarea } from "@/shared/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { useCart, lineUnit } from "@/lib/cart";
import { formatDeliveryDate } from "@/lib/delivery";
import { formatETB, PHONE_REGEX } from "@/lib/shop";
import {
  useAvailableMealSlots,
  useDeliverySchedule,
  useEnabledDeliveryAreas,
  usePlaceOrder,
} from "../hooks/useCheckout";

const schema = z.object({
  contactName: z.string().trim().min(2, "Enter your name").max(100),
  contactPhone: z
    .string()
    .trim()
    .regex(PHONE_REGEX, "Enter a valid Ethiopian phone (e.g. 0911234567)"),
  areaId: z.string().uuid("Choose a delivery area"),
  deliveryLocation: z.enum(["Inside campus / Gebi", "At the doors"], {
    message: "Choose where to meet your delivery",
  }),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a delivery date"),
  mealSlot: z.string().min(1, "Choose a meal time"),
  notes: z.string().trim().max(500).optional(),
});

export function CheckoutPage() {
  const { lines, estimate, clear } = useCart();
  const navigate = useNavigate();
  const [areaId, setAreaId] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [mealSlot, setMealSlot] = useState("");
  const { data: areas = [] } = useEnabledDeliveryAreas();
  const {
    data: deliveryDays = [],
    isLoading: datesLoading,
    error: deliveryScheduleError,
  } = useDeliverySchedule();
  const {
    data: mealSlots = [],
    isLoading: mealsLoading,
    error: mealSlotsError,
  } = useAvailableMealSlots();
  const orderMutation = usePlaceOrder();
  const openDeliveryDays = deliveryDays.filter((day) => day.is_open);

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-muted-foreground">Your cart is empty.</p>
        <Button asChild className="mt-4">
          <Link to="/">Browse the menu</Link>
        </Button>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      contactName: fd.get("contactName"),
      contactPhone: fd.get("contactPhone"),
      areaId,
      deliveryLocation,
      deliveryDate,
      mealSlot,
      notes: (fd.get("notes") as string) || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your delivery details");
      return;
    }
    const d = parsed.data;
    if (!deliveryDays.some((day) => day.delivery_date === d.deliveryDate && day.is_open)) {
      toast.error("Orders for that delivery date are closed. Choose another date.");
      return;
    }
    if (!mealSlots.some((slot) => slot.slot === d.mealSlot && slot.available)) {
      toast.error("That meal time is no longer available. Choose another.");
      return;
    }
    try {
      const orderId = await orderMutation.mutateAsync({
        items: lines.map((line) => ({
          menuItemId: line.menuItemId,
          quantity: line.quantity,
          extraIds: line.extras.map((extra) => extra.id),
        })),
        areaId: d.areaId,
        address: d.deliveryLocation,
        contactName: d.contactName,
        contactPhone: d.contactPhone,
        deliveryDate: d.deliveryDate,
        mealSlot: d.mealSlot,
        notes: d.notes ?? "",
      });
      clear();
      toast.success("Order placed! Complete your payment to confirm it.");
      navigate({ to: "/orders/$orderId", params: { orderId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-12 md:grid-cols-[1fr_340px]">
      <form onSubmit={onSubmit} className="space-y-5">
        <h1 className="text-5xl">Delivery details</h1>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="contactName">
              Full name <RequiredMark />
            </Label>
            <Input id="contactName" name="contactName" required maxLength={100} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactPhone">
              Phone (for delivery) <RequiredMark />
            </Label>
            <Input
              id="contactPhone"
              name="contactPhone"
              placeholder="0911234567"
              required
              maxLength={13}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="delivery-area">
            Delivery area (AAU campus) <RequiredMark />
          </Label>
          <Select value={areaId} onValueChange={setAreaId}>
            <SelectTrigger id="delivery-area" aria-required="true">
              <SelectValue placeholder="Choose your campus" />
            </SelectTrigger>
            <SelectContent>
              {areas.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-base font-medium leading-snug">
            Delivery date <RequiredMark />
          </legend>
          <p className="text-sm text-muted-foreground">
            Choose one of the next two weekdays. We don’t deliver on weekends.
          </p>
          {datesLoading ? (
            <p className="text-base text-muted-foreground">Checking available delivery dates…</p>
          ) : deliveryScheduleError ? (
            <p role="alert" className="text-base text-destructive">
              Could not load delivery dates: {deliveryScheduleError.message}
            </p>
          ) : openDeliveryDays.length > 0 ? (
            <RadioGroup
              value={deliveryDate}
              onValueChange={setDeliveryDate}
              required
              aria-label="Delivery date"
              className="grid gap-3 sm:grid-cols-2"
            >
              {openDeliveryDays.map((day) => (
                <Label
                  key={day.delivery_date}
                  htmlFor={`delivery-date-${day.delivery_date}`}
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-card p-3"
                >
                  <RadioGroupItem
                    id={`delivery-date-${day.delivery_date}`}
                    value={day.delivery_date}
                  />
                  {formatDeliveryDate(day.delivery_date)}
                </Label>
              ))}
            </RadioGroup>
          ) : (
            <p className="rounded-md border border-destructive/50 p-3 text-base text-destructive">
              No delivery dates are currently available. Please check again later.
            </p>
          )}
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="text-base font-medium leading-snug">
            Meal time <RequiredMark />
          </legend>
          {mealsLoading ? (
            <p className="text-base text-muted-foreground">Loading available meal times…</p>
          ) : mealSlotsError ? (
            <p role="alert" className="text-base text-destructive">
              Could not load meal times: {mealSlotsError.message}
            </p>
          ) : mealSlots.length > 0 ? (
            <RadioGroup
              value={mealSlot}
              onValueChange={setMealSlot}
              required
              aria-label="Meal time"
              className="grid gap-3 sm:grid-cols-3"
            >
              {mealSlots.map((slot) => (
                <Label
                  key={slot.slot}
                  htmlFor={`meal-slot-${slot.slot}`}
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-card p-3"
                >
                  <RadioGroupItem id={`meal-slot-${slot.slot}`} value={slot.slot} />
                  {slot.label}
                </Label>
              ))}
            </RadioGroup>
          ) : (
            <p className="text-base text-muted-foreground">
              No meal times are currently accepting orders.
            </p>
          )}
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="text-base font-medium leading-snug">
            Delivery location <RequiredMark />
          </legend>
          <RadioGroup
            value={deliveryLocation}
            onValueChange={setDeliveryLocation}
            required
            aria-label="Delivery location"
            className="grid gap-3 sm:grid-cols-2"
          >
            {(["Inside campus / Gebi", "At the doors"] as const).map((location) => (
              <Label
                key={location}
                htmlFor={`delivery-location-${location === "At the doors" ? "doors" : "inside"}`}
                className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-card p-3"
              >
                <RadioGroupItem
                  id={`delivery-location-${location === "At the doors" ? "doors" : "inside"}`}
                  value={location}
                />
                {location}
              </Label>
            ))}
          </RadioGroup>
        </fieldset>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Directions or landmark (optional)</Label>
          <Textarea
            id="notes"
            name="notes"
            maxLength={500}
            placeholder="Add directions or other delivery details"
          />
        </div>
        <Button
          size="lg"
          className="w-full bg-flame shadow-flame"
          disabled={
            orderMutation.isPending ||
            datesLoading ||
            mealsLoading ||
            !!deliveryScheduleError ||
            !!mealSlotsError ||
            openDeliveryDays.length === 0 ||
            mealSlots.length === 0
          }
        >
          {orderMutation.isPending ? "Placing order…" : "Place order"}
        </Button>
      </form>

      <aside className="h-fit rounded-xl border border-border bg-card p-5">
        <h2 className="text-2xl">Summary</h2>
        <ul className="mt-4 space-y-2 text-base">
          {lines.map((l) => (
            <li key={l.key} className="flex justify-between gap-2">
              <span>
                {l.quantity} × {l.name}
                {l.extras.length > 0 && (
                  <span className="block text-sm text-muted-foreground sm:text-base">
                    + {l.extras.map((e) => e.name).join(", ")}
                  </span>
                )}
              </span>
              <span>{formatETB(lineUnit(l) * l.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-1 border-t border-border pt-4 text-base">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivery</span>
            <span>ETB 0</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Estimated total</span>
            <span>{formatETB(estimate)}</span>
          </div>
          <p className="pt-1 text-sm text-muted-foreground sm:text-base">
            The final total is calculated by our system when you place the order.
          </p>
        </div>
      </aside>
    </div>
  );
}
