import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { StatusBadge } from "@/shared/feedback/status-badge";
import { formatDeliveryDate } from "@/lib/delivery";
import { useAuth } from "@/lib/auth";
import { formatETB } from "@/lib/shop";
import { OwnerMenuForm } from "../components/OwnerMenuForm";
import {
  useAdminCatalog,
  useAdminOrderingAvailability,
  useAdminOrders,
  useAdminPayments,
  useReceiptUrl,
  useReviewPayment,
  useSetDeliveryDateOpen,
  useToggleAvailability,
} from "../hooks/useAdminData";

export function AdminPage() {
  const { isAdmin, ready } = useAuth();
  if (!ready) return null;
  if (!isAdmin)
    return (
      <p className="px-4 py-16 text-center text-muted-foreground">
        This page is for the shop owner only.
      </p>
    );
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-5xl">Owner</h1>
      <Tabs defaultValue="payments" className="mt-6">
        <TabsList className="h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="menu">Menu & areas</TabsTrigger>
          <TabsTrigger value="ordering">Order availability</TabsTrigger>
        </TabsList>
        <TabsContent value="payments">
          <PaymentsTab />
        </TabsContent>
        <TabsContent value="orders">
          <OrdersTab />
        </TabsContent>
        <TabsContent value="menu">
          <MenuTab />
        </TabsContent>
        <TabsContent value="ordering">
          <OrderingTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PaymentsTab() {
  const { data = [], isLoading } = useAdminPayments();
  const createReceiptUrl = useReceiptUrl();

  async function openReceipt(path: string) {
    try {
      const url = await createReceiptUrl(path);
      window.open(url, "_blank", "noopener");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't open receipt");
    }
  }

  if (isLoading) return <p className="mt-6 text-muted-foreground">Loading…</p>;
  if (data.length === 0) return <p className="mt-6 text-muted-foreground">No payments waiting.</p>;

  return (
    <ul className="mt-6 space-y-3">
      {data.map((p) => (
        <PaymentRow key={p.id} p={p} onReceipt={openReceipt} />
      ))}
    </ul>
  );
}

type PayRow = {
  id: string;
  amount: number;
  method: string | null;
  transaction_ref: string | null;
  receipt_path: string | null;
  submitted_at: string | null;
  orders: {
    order_number: string;
    contact_name: string;
    contact_phone: string;
    delivery_area_name: string;
    delivery_date: string;
    meal_slot: string;
    created_at: string;
  } | null;
};

function PaymentRow({ p, onReceipt }: { p: PayRow; onReceipt: (path: string) => void }) {
  const [note, setNote] = useState("");
  const reviewMutation = useReviewPayment();
  const busy = reviewMutation.isPending;
  async function review(approve: boolean) {
    try {
      await reviewMutation.mutateAsync({ paymentId: p.id, approve, note });
      toast.success(approve ? "Payment verified — order confirmed" : "Payment rejected");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }
  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <p className="font-display text-xl uppercase">{p.orders?.order_number}</p>
          <p className="text-xs text-muted-foreground">
            {p.orders?.contact_name} · {p.orders?.contact_phone} · {p.orders?.delivery_area_name}
          </p>
          {p.orders && (
            <p className="text-xs text-muted-foreground">
              Delivery: {formatDeliveryDate(p.orders.delivery_date)} · {p.orders.meal_slot}
            </p>
          )}
        </div>
        <p className="text-lg font-semibold text-primary">{formatETB(p.amount)}</p>
      </div>
      {p.submitted_at ? (
        <div className="mt-3 text-sm">
          <p>
            <span className="text-muted-foreground">Method:</span> {p.method?.toUpperCase()} ·{" "}
            <span className="text-muted-foreground">Ref:</span>{" "}
            <span className="font-mono">{p.transaction_ref}</span> ·{" "}
            <span className="text-muted-foreground">
              {format(new Date(p.submitted_at), "d MMM HH:mm")}
            </span>
          </p>
          {p.receipt_path && (
            <Button
              variant="link"
              className="h-auto px-0"
              onClick={() => onReceipt(p.receipt_path!)}
            >
              View receipt
            </Button>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Customer hasn't submitted a reference yet.
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Input
          className="max-w-xs"
          placeholder="Note (optional, shown to customer)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
        />
        <Button disabled={busy} onClick={() => review(true)}>
          Verify
        </Button>
        <Button disabled={busy} variant="destructive" onClick={() => review(false)}>
          Reject
        </Button>
      </div>
    </li>
  );
}

function OrdersTab() {
  const { data = [] } = useAdminOrders();
  return (
    <ul className="mt-6 space-y-2">
      {data.map((o) => {
        const pay = Array.isArray(o.payments) ? o.payments[0] : o.payments;
        return (
          <li key={o.id} className="rounded-xl border border-border bg-card p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-display text-lg uppercase">{o.order_number}</span>
              <span className="flex gap-1">
                <StatusBadge status={o.status} />
                {pay && <StatusBadge status={pay.status} label={`payment ${pay.status}`} />}
              </span>
            </div>
            <p className="mt-1 text-muted-foreground">
              {o.order_items.map((i) => `${i.quantity}× ${i.name}`).join(", ")} ·{" "}
              {formatETB(o.total)}
            </p>
            <p className="text-xs text-muted-foreground">
              Delivery: {formatDeliveryDate(o.delivery_date)} · {o.meal_slot} ·{" "}
              {o.delivery_area_name} — {o.address} · {o.contact_name} {o.contact_phone} ·{" "}
              {format(new Date(o.created_at), "d MMM HH:mm")}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function OrderingTab() {
  const { schedule, meals } = useAdminOrderingAvailability();
  const toggleAvailability = useToggleAvailability();
  const setDeliveryDateOpen = useSetDeliveryDateOpen();

  async function toggleDate(deliveryDate: string, isOpen: boolean) {
    try {
      await setDeliveryDateOpen.mutateAsync({ deliveryDate, isOpen });
      toast.success(
        `Orders ${isOpen ? "opened" : "closed"} for ${formatDeliveryDate(deliveryDate)}`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update delivery date");
    }
  }

  async function toggleMeal(slot: string, available: boolean, label: string) {
    try {
      await toggleAvailability.mutateAsync({ table: "meal_slots", id: slot, value: available });
      toast.success(`${label} orders ${available ? "opened" : "closed"}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update meal availability");
    }
  }

  return (
    <div className="mt-6 grid gap-6 md:grid-cols-2">
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-2xl">Delivery dates</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Customers can order for today or tomorrow until you close that date.
        </p>
        {schedule.isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading delivery dates…</p>
        ) : schedule.error ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            Could not load delivery dates: {schedule.error.message}
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {(schedule.data ?? []).map((day) => (
              <li key={day.delivery_date} className="flex items-center justify-between gap-3">
                <span className="text-sm">{formatDeliveryDate(day.delivery_date)}</span>
                <Switch
                  checked={day.is_open}
                  disabled={setDeliveryDateOpen.isPending}
                  aria-label={`Accept orders for ${formatDeliveryDate(day.delivery_date)}`}
                  onCheckedChange={(open) => toggleDate(day.delivery_date, open)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-2xl">Meal times</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Turn breakfast, lunch, or dinner ordering on or off.
        </p>
        {meals.isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading meal times…</p>
        ) : meals.error ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            Could not load meal times: {meals.error.message}
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {(meals.data ?? []).map((meal) => (
              <li key={meal.slot} className="flex items-center justify-between gap-3">
                <span className="text-sm">{meal.label}</span>
                <Switch
                  checked={meal.available}
                  disabled={toggleAvailability.isPending}
                  aria-label={`Accept ${meal.label.toLowerCase()} orders`}
                  onCheckedChange={(available) => toggleMeal(meal.slot, available, meal.label)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MenuTab() {
  const { items: itemsQuery, extras: extrasQuery, areas: areasQuery } = useAdminCatalog();
  const items = itemsQuery.data ?? [];
  const extras = extrasQuery.data ?? [];
  const areas = areasQuery.data ?? [];
  const availabilityMutation = useToggleAvailability();

  async function toggle(
    table: "menu_items" | "menu_extras" | "delivery_areas",
    id: string,
    value: boolean,
  ) {
    try {
      await availabilityMutation.mutateAsync({ table, id, value });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <div className="mt-6">
      <div className="mb-6 flex justify-end">
        <OwnerMenuForm />
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <ToggleList
          title="Burgers"
          rows={items.map((i) => ({
            id: i.id,
            label: `${i.name} · ${formatETB(i.price)}`,
            on: i.available,
          }))}
          onToggle={(id, v) => toggle("menu_items", id, v)}
        />
        <ToggleList
          title="Extras"
          rows={extras.map((i) => ({
            id: i.id,
            label: `${i.name} · ${formatETB(i.price)}`,
            on: i.available,
          }))}
          onToggle={(id, v) => toggle("menu_extras", id, v)}
        />
        <ToggleList
          title="Delivery areas"
          rows={areas.map((a) => ({ id: a.id, label: a.name, on: a.enabled }))}
          onToggle={(id, v) => toggle("delivery_areas", id, v)}
        />
      </div>
    </div>
  );
}

function ToggleList({
  title,
  rows,
  onToggle,
}: {
  title: string;
  rows: { id: string; label: string; on: boolean }[];
  onToggle: (id: string, v: boolean) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-xl">{title}</h3>
      <ul className="mt-3 space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
            <span>{r.label}</span>
            <Switch checked={r.on} onCheckedChange={(v) => onToggle(r.id, v)} />
          </li>
        ))}
      </ul>
    </div>
  );
}
