import { useState } from "react";
import { format } from "date-fns";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { StatusBadge } from "@/shared/feedback/status-badge";
import { formatDeliveryDate } from "@/lib/delivery";
import { useAuth } from "@/lib/auth";
import { formatETB } from "@/lib/shop";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import {
  getAdminRefundRequests,
  getRefundProofUrl,
  removeRefundProof,
  uploadRefundProof,
} from "@/services/refundService";
import { OwnerMenuForm } from "../components/OwnerMenuForm";
import { downloadAdminOrdersXlsx } from "../components/adminOrdersExport";
import type { MenuItem } from "@/types/menu";
import {
  useAdminCatalog,
  useAdminOrderingAvailability,
  useAdminOrders,
  useAdminPayments,
  useAdminRefundRequests,
  useCompletePaymentRefund,
  useReceiptUrl,
  useReviewPayment,
  useReviewRefundRequest,
  useResolveRefundFollowUp,
  useSetDeliveryDateOpen,
  useToggleAvailability,
} from "../hooks/useAdminData";

type RefundAdminRow = Awaited<ReturnType<typeof getAdminRefundRequests>>[number];

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
          <TabsTrigger value="refunds">Refunds</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="menu">Menu & areas</TabsTrigger>
          <TabsTrigger value="ordering">Order availability</TabsTrigger>
        </TabsList>
        <TabsContent value="payments">
          <PaymentsTab />
        </TabsContent>
        <TabsContent value="refunds">
          <RefundsTab />
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

function RefundsTab() {
  const { data = [], isLoading, isError, error } = useAdminRefundRequests();

  if (isLoading) return <p className="mt-6 text-muted-foreground">Loading refund requests…</p>;
  if (isError)
    return (
      <p className="mt-6 text-destructive">
        Could not load refund requests: {error instanceof Error ? error.message : String(error)}
      </p>
    );
  if (data.length === 0)
    return <p className="mt-6 text-muted-foreground">No refund requests need attention.</p>;

  return (
    <ul className="mt-6 space-y-3">
      {data.map((request) => (
        <RefundRequestRow key={request.id} request={request} />
      ))}
    </ul>
  );
}

function RefundRequestRow({ request }: { request: RefundAdminRow }) {
  const [note, setNote] = useState("");
  const [reference, setReference] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [transferred, setTransferred] = useState(false);
  const [followUpNote, setFollowUpNote] = useState("");
  const [proofBusy, setProofBusy] = useState(false);
  const review = useReviewRefundRequest();
  const complete = useCompletePaymentRefund();
  const resolveFollowUp = useResolveRefundFollowUp();

  async function reviewRequest(approve: boolean) {
    if (!approve && !note.trim()) {
      toast.error("Add a reason before rejecting this refund request");
      return;
    }
    try {
      await review.mutateAsync({ requestId: request.id, approve, note: note.trim() });
      toast.success(
        approve
          ? "Refund approved; send it manually to the requested account"
          : "Refund request rejected",
      );
      setNote("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not review refund request");
    }
  }

  async function markAsRefunded(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!proof) {
      toast.error("Upload the refund transaction screenshot or PDF");
      return;
    }
    if (!transferred) {
      toast.error("Confirm that you have sent the refund before marking it complete");
      return;
    }
    let path: string | null = null;
    try {
      path = await uploadRefundProof(request.id, proof);
      await complete.mutateAsync({
        requestId: request.id,
        reference: reference.trim(),
        proofPath: path,
      });
      toast.success("Refund transfer recorded and customer notified");
      setReference("");
      setProof(null);
      setTransferred(false);
    } catch (error) {
      if (path) {
        try {
          await removeRefundProof(path);
        } catch (cleanupError) {
          console.error("Could not remove refund proof after failed refund update", cleanupError);
        }
      }
      toast.error(error instanceof Error ? error.message : "Could not record refund transfer");
    }
  }

  async function openProof(path: string) {
    setProofBusy(true);
    try {
      const url = await getRefundProofUrl(path);
      window.open(url, "_blank", "noopener");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open refund proof");
    } finally {
      setProofBusy(false);
    }
  }

  async function completeFollowUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await resolveFollowUp.mutateAsync({ requestId: request.id, note: followUpNote.trim() });
      toast.success("Refund follow-up marked reviewed; customer notified");
      setFollowUpNote("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not resolve refund follow-up");
    }
  }

  return (
    <li className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-xl uppercase">{request.orders?.order_number}</p>
          <p className="text-xs text-muted-foreground">
            {request.orders?.contact_name} · {request.orders?.contact_phone} ·{" "}
            {request.orders?.delivery_area_name}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Requested {format(new Date(request.created_at), "d MMM yyyy, HH:mm")} ·{" "}
            {request.method.toUpperCase()} · Account {request.account_number}
          </p>
          {request.payments?.transaction_ref && (
            <p className="text-xs text-muted-foreground">
              Original payment ref:{" "}
              <span className="font-mono">{request.payments.transaction_ref}</span>
            </p>
          )}
        </div>
        <div className="text-right">
          <StatusBadge status={request.status} label={`refund ${request.status}`} />
          <p className="mt-1 font-semibold text-primary">{formatETB(request.amount)}</p>
        </div>
      </div>
      {request.reason && (
        <p className="text-sm">
          <span className="text-muted-foreground">Customer reason:</span> {request.reason}
        </p>
      )}

      {request.status === "pending" && (
        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          <Input
            className="max-w-md"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={500}
            placeholder="Rejection reason (required to reject); optional approval note"
            aria-label="Refund review note"
          />
          <Button disabled={review.isPending} onClick={() => void reviewRequest(true)}>
            Approve refund
          </Button>
          <Button
            variant="destructive"
            disabled={review.isPending}
            onClick={() => void reviewRequest(false)}
          >
            Reject
          </Button>
        </div>
      )}

      {request.status === "approved" && (
        <form onSubmit={markAsRefunded} className="space-y-3 border-t border-border pt-3">
          <p className="text-sm font-semibold">
            After sending the transfer manually, record it here:
          </p>
          <Input
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            required
            minLength={4}
            maxLength={100}
            placeholder="Refund transaction reference"
          />
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            required
            onChange={(event) => setProof(event.target.files?.[0] ?? null)}
            aria-label="Refund transfer proof"
          />
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={transferred}
              onChange={(event) => setTransferred(event.target.checked)}
              className="mt-1"
            />
            I have completed the bank transfer to the customer’s account.
          </label>
          <Button type="submit" disabled={complete.isPending}>
            {complete.isPending ? "Saving…" : "Mark refunded and notify customer"}
          </Button>
        </form>
      )}

      {request.status === "refunded" && (
        <div className="space-y-2 border-t border-border pt-3 text-sm">
          <p>
            Refund ref: <span className="font-mono">{request.refund_reference}</span>
          </p>
          {request.proof_path && (
            <Button
              variant="link"
              className="h-auto px-0"
              disabled={proofBusy}
              onClick={() => void openProof(request.proof_path!)}
            >
              {proofBusy ? "Opening…" : "View refund proof"}
            </Button>
          )}
          {request.follow_up_status === "pending" && (
            <div className="rounded-md border border-warning/50 bg-warning/10 p-3">
              <p className="font-semibold">Customer says refund has not arrived</p>
              {request.follow_up_note && <p className="mt-1">{request.follow_up_note}</p>}
              <p className="mt-1 text-xs text-muted-foreground">
                Investigate the existing transfer. Do not send another refund unless you verify it
                is necessary.
              </p>
              <form onSubmit={completeFollowUp} className="mt-3 flex flex-wrap gap-2">
                <Input
                  className="max-w-md"
                  value={followUpNote}
                  onChange={(event) => setFollowUpNote(event.target.value)}
                  maxLength={500}
                  placeholder="Update for the customer (optional)"
                />
                <Button type="submit" size="sm" disabled={resolveFollowUp.isPending}>
                  Mark follow-up reviewed
                </Button>
              </form>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function OrdersTab() {
  const { data = [] } = useAdminOrders();
  const [deliveryDate, setDeliveryDate] = useState("");
  const [burger, setBurger] = useState("all");
  const [deliveryArea, setDeliveryArea] = useState("all");
  const [mealSlot, setMealSlot] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const areas = [
    ...new Set([
      "AAU FBE",
      "AAU Yared Music School",
      ...data.map((order) => order.delivery_area_name).filter(Boolean),
    ]),
  ].sort((a, b) => a.localeCompare(b));
  const mealSlots = [
    ...new Set(["dinner", ...data.map((order) => order.meal_slot).filter(Boolean)]),
  ].sort((a, b) => a.localeCompare(b));
  const filteredOrders = data.filter((order) => {
    const matchesDate = !deliveryDate || order.delivery_date === deliveryDate;
    const matchesArea = deliveryArea === "all" || order.delivery_area_name === deliveryArea;
    const matchesMeal = mealSlot === "all" || order.meal_slot === mealSlot;
    const payment = Array.isArray(order.payments) ? order.payments[0] : order.payments;
    const matchesPayment =
      paymentStatus === "all" || (payment?.status ?? "unverified") === paymentStatus;
    const matchesBurger =
      burger === "all" ||
      order.order_items.some((item) => {
        const name = item.name.trim().toLowerCase();
        return burger === "signature"
          ? name === "tms signature burger"
          : name === "tms double trouble";
      });
    return matchesDate && matchesArea && matchesMeal && matchesBurger && matchesPayment;
  });
  function getBurgerCounts(orders: typeof data) {
    return orders.reduce(
      (counts, order) => {
        for (const item of order.order_items) {
          const name = item.name.trim().toLowerCase();
          if (name === "tms signature burger") counts.signature += item.quantity;
          if (name === "tms double trouble") counts.doubleTrouble += item.quantity;
        }
        return counts;
      },
      { signature: 0, doubleTrouble: 0 },
    );
  }
  const totalBurgerCounts = getBurgerCounts(data);
  const filteredBurgerCounts = getBurgerCounts(filteredOrders);

  function clearOrderFilters() {
    setDeliveryDate("");
    setBurger("all");
    setDeliveryArea("all");
    setMealSlot("all");
    setPaymentStatus("all");
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="flex flex-col gap-1 text-sm font-medium" htmlFor="orders-filter-date">
          Delivery date
          <Input
            id="orders-filter-date"
            type="date"
            value={deliveryDate}
            onChange={(event) => setDeliveryDate(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium" htmlFor="orders-filter-burger">
          Burger
          <Select value={burger} onValueChange={setBurger}>
            <SelectTrigger id="orders-filter-burger">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All burgers</SelectItem>
              <SelectItem value="signature">TM's Signature Burger</SelectItem>
              <SelectItem value="double">TM's Double Trouble</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium" htmlFor="orders-filter-area">
          Campus / area
          <Select value={deliveryArea} onValueChange={setDeliveryArea}>
            <SelectTrigger id="orders-filter-area">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All campuses</SelectItem>
              {areas.map((area) => (
                <SelectItem key={area} value={area}>
                  {area}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium" htmlFor="orders-filter-meal">
          Delivery time
          <Select value={mealSlot} onValueChange={setMealSlot}>
            <SelectTrigger id="orders-filter-meal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All meal times</SelectItem>
              {mealSlots.map((slot) => (
                <SelectItem key={slot} value={slot}>
                  {slot}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium" htmlFor="orders-filter-payment">
          Payment status
          <Select value={paymentStatus} onValueChange={setPaymentStatus}>
            <SelectTrigger id="orders-filter-payment">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All payment statuses</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="unverified">Unverified</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm font-semibold text-primary">Orders loaded</p>
          <p className="mt-1 font-display text-3xl text-foreground">{data.length}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Signature: {totalBurgerCounts.signature} · Double Trouble:{" "}
            {totalBurgerCounts.doubleTrouble}
          </p>
        </div>
        <div className="rounded-xl border border-accent/50 bg-accent/20 p-4">
          <p className="text-sm font-semibold text-accent-foreground">Orders matching filters</p>
          <p className="mt-1 font-display text-3xl text-foreground">{filteredOrders.length}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Signature: {filteredBurgerCounts.signature} · Double Trouble:{" "}
            {filteredBurgerCounts.doubleTrouble}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={filteredOrders.length === 0}
          onClick={() => downloadAdminOrdersXlsx(filteredOrders)}
        >
          <FileSpreadsheet />
          <Download />
          Export filtered orders to Excel
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={clearOrderFilters}>
          Clear filters
        </Button>
      </div>
      {filteredOrders.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-5 text-muted-foreground">
          No orders match these filters.
        </p>
      ) : (
        <ul className="space-y-2">
          {filteredOrders.map((o) => {
            const pay = Array.isArray(o.payments) ? o.payments[0] : o.payments;
            return (
              <li key={o.id} className="rounded-xl border border-border bg-card p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-display text-lg uppercase">{o.order_number}</span>
                  <span className="flex gap-1">
                    {!(pay?.status === "rejected") && (
                      <StatusBadge status={o.cancelled_at ? "cancelled" : o.status} />
                    )}
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
      )}
    </div>
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
          Customers can choose the next two weekdays. Close dates here to pause orders; manage
          availability up to five business days ahead.
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
        {itemsQuery.isError ? (
          <p role="alert" className="text-sm text-destructive">
            Couldn't load burgers:{" "}
            {itemsQuery.error instanceof Error ? itemsQuery.error.message : "Please try again."}
          </p>
        ) : (
          <ToggleList
            title="Burgers"
            rows={items.map((i) => ({
              id: i.id,
              label: `${i.name} · ${formatETB(i.price)}`,
              on: i.available,
              item: i,
            }))}
            onToggle={(id, v) => toggle("menu_items", id, v)}
          />
        )}
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
  rows: { id: string; label: string; on: boolean; item?: MenuItem }[];
  onToggle: (id: string, v: boolean) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-xl">{title}</h3>
      <ul className="mt-3 space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 flex-1">{r.label}</span>
            <div className="flex shrink-0 items-center gap-1">
              {r.item && <OwnerMenuForm item={r.item} />}
              <Switch checked={r.on} onCheckedChange={(v) => onToggle(r.id, v)} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
