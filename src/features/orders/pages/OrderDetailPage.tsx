import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { RequiredMark } from "@/shared/ui/required-mark";
import { StatusBadge } from "@/shared/feedback/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/ui/alert-dialog";
import { formatDeliveryDate } from "@/lib/delivery";
import { useAuth } from "@/lib/auth";
import { formatETB, PAYMENT_ACCOUNTS } from "@/lib/shop";
import type { Tables } from "@/integrations/supabase/types";
import {
  useOrderDetails,
  useOrderRescheduleOptions,
  useRescheduleOrder,
  useCancelUnpaidOrder,
  useSubmitPaymentProof,
  useUploadPaymentReceipt,
} from "../hooks/useOrders";
import { RefundSection } from "../components/RefundSection";

type Extra = { name: string; price: number };

export function OrderDetailPage({ orderId }: { orderId: string }) {
  const { data: order, isLoading } = useOrderDetails(orderId);

  if (isLoading) return <p className="px-4 py-12 text-center text-muted-foreground">Loading…</p>;
  if (!order)
    return <p className="px-4 py-12 text-center text-muted-foreground">Order not found.</p>;
  const pay = Array.isArray(order.payments) ? order.payments[0] : order.payments;
  const paymentSubmitted = Boolean(pay?.submitted_at);
  const paymentVerified = pay?.status === "verified";
  const paymentRejected = pay?.status === "rejected";
  const waiting = pay?.status === "unverified" && Boolean(pay?.submitted_at);
  const latestRefund = [...order.refund_requests].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  )[0];
  const refundBlocksPayment = order.refund_requests.some(
    (request) =>
      request.status === "pending" ||
      request.status === "approved" ||
      (request.status === "refunded" && request.customer_decision !== "continue"),
  );
  const deliveryScheduleMessage = `Your burgers are scheduled for delivery on ${formatDeliveryDate(order.delivery_date)} during ${order.meal_slot}.`;
  const progressSteps = order.cancelled_at
    ? [
      { label: "Order placed", complete: true },
      ...(paymentSubmitted
        ? [{ label: "Refund received", complete: true }]
        : [{ label: "Order cancelled", complete: true }]),
    ]
    : [
      { label: "Order placed", complete: true },
      {
        label: paymentSubmitted ? "Payment submitted" : "Payment needed",
        complete: paymentSubmitted,
      },
      {
        label: paymentVerified
          ? "Payment verified"
          : paymentRejected
            ? "Payment rejected"
            : waiting
              ? "Waiting for verification"
              : "Verification",
        complete: paymentVerified,
      },
      { label: "Delivery scheduled", complete: order.status === "confirmed" },
    ];

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-12">
      <Link to="/orders" className="text-base text-muted-foreground hover:text-foreground">
        ← My Orders
      </Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl sm:text-5xl">{order.order_number}</h1>
          <p className="text-base text-muted-foreground">
            {format(new Date(order.created_at), "d MMM yyyy, HH:mm")}
          </p>
          <p className="text-base text-muted-foreground">
            Delivery: {formatDeliveryDate(order.delivery_date)} · {order.meal_slot}
          </p>
        </div>
        <div className="flex flex-col items-start gap-1 lg:flex-row lg:items-center lg:gap-2">
          {!(pay?.status === "rejected") && (
            <StatusBadge
              status={order.cancelled_at ? "cancelled" : order.status}
              className="text-sm sm:text-base"
            />
          )}
          {pay && (
            <StatusBadge
              status={pay.status}
              label={`payment ${pay.status}`}
              className="text-sm sm:text-base"
            />
          )}
        </div>
      </div>

      <section
        className="space-y-4 rounded-xl border border-border bg-card p-5"
        aria-label="Order progress"
      >
        <div>
          <h2 className="text-3xl">Order progress</h2>
          <p className="mt-1 text-base leading-relaxed text-muted-foreground" role="status">
            {order.cancelled_at
              ? "You confirmed receiving the refund and closed this order. Place a new order whenever you are ready."
              : paymentVerified
                ? deliveryScheduleMessage
                : latestRefund?.status === "pending"
                  ? "Your refund request is waiting for the owner to review it. Payment submission is paused while it is reviewed."
                  : latestRefund?.status === "approved"
                    ? "Your refund was approved. The owner will send it manually and add the transaction reference and proof here."
                    : latestRefund?.status === "refunded"
                      ? latestRefund.customer_decision === "continue"
                        ? "You confirmed receiving the refund and chose to continue this order. Submit a new payment below."
                        : latestRefund.customer_decision === "cancel"
                          ? "You confirmed receiving the refund and closed this order. You can place a new order from the menu."
                          : latestRefund.follow_up_status === "pending"
                            ? "Your refund is marked sent, and your missing-transfer report is being investigated."
                            : `Your refund is marked sent. Reference: ${latestRefund.refund_reference}. Review its proof below, then choose to close this order or continue with a new payment.`
                      : paymentRejected
                        ? "Your payment needs attention. Review the note below and resubmit your proof, or request a refund if you already transferred the money."
                        : waiting
                          ? "Payment proof received — waiting for verification. You have no other tasks right now, just wait while we verify your transfer."
                          : paymentSubmitted
                            ? "Payment received — we’re checking it. We’ll confirm the order and delivery schedule once it’s verified."
                            : "Your order is saved but not confirmed. Complete the bank transfer and submit its reference and proof below to reserve your delivery."}
          </p>
        </div>
        <ol className="grid gap-3 sm:grid-cols-4">
          {progressSteps.map((step, index) => (
            <li
              key={step.label}
              className={`rounded-lg border p-3 text-base leading-snug ${step.complete
                  ? "border-success/50 bg-success/10 text-success"
                  : paymentRejected && index === 2
                    ? "border-destructive/50 bg-destructive/10 text-destructive"
                    : "border-border text-muted-foreground"
                }`}
            >
              <span className="block text-sm font-semibold uppercase tracking-wide">
                Step {index + 1}
              </span>
              <span className="mt-1 block font-medium">{step.label}</span>
            </li>
          ))}
        </ol>
      </section>

      {!order.cancelled_at &&
        (paymentVerified ? (
          <OrderDeliveryDateEditor orderId={order.id} />
        ) : !paymentSubmitted ? (
          <CancelOrderAction orderId={order.id} />
        ) : null)}

      <section className="rounded-xl border border-border bg-card p-5">
        <ul className="space-y-2 text-base">
          {order.order_items.map((it) => (
            <li key={it.id} className="flex justify-between gap-2">
              <span>
                {it.quantity} × {it.name}
                {(it.extras as Extra[]).length > 0 && (
                  <span className="block text-sm text-muted-foreground sm:text-base">
                    + {(it.extras as Extra[]).map((e) => e.name).join(", ")}
                  </span>
                )}
              </span>
              <span>{formatETB(it.line_total)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-1 border-t border-border pt-4 text-base">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivery</span>
            <span>FREE · ETB 0</span>
          </div>
          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span className="text-primary">{formatETB(order.total)}</span>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Deliver to {order.delivery_area_name} — {order.address} · {order.contact_name},{" "}
          {order.contact_phone}
        </p>
      </section>

      {order.status === "confirmed" ? (
        <section className="rounded-xl border border-success bg-card p-5">
          <p className="font-display text-2xl uppercase text-success">Order confirmed</p>
          <p className="mt-1 text-base leading-relaxed text-muted-foreground">
            Payment verified. {deliveryScheduleMessage}
          </p>
        </section>
      ) : (
        <>
          {order.cancelled_at && (
            <section className="rounded-xl border border-border bg-card p-5">
              <p className="font-display text-2xl uppercase">Order cancelled</p>
              <p className="mt-1 text-base leading-relaxed text-muted-foreground">
                {paymentSubmitted
                  ? "This order was closed after you confirmed receiving the refund."
                  : "This order was cancelled before payment proof was submitted."}
              </p>
              <Link
                to="/"
                className="mt-3 inline-block text-base font-semibold text-primary underline"
              >
                Place a new order
              </Link>
            </section>
          )}
          {pay?.status === "rejected" && !refundBlocksPayment && !order.cancelled_at ? (
            <RejectedPaymentActions
              orderId={order.id}
              orderNumber={order.order_number}
              total={Number(order.total)}
              payment={pay}
              amount={Number(pay.amount)}
              refundRequests={order.refund_requests}
            />
          ) : (
            <>
              {pay?.status === "rejected" && (
                <RefundSection
                  orderId={order.id}
                  orderNumber={order.order_number}
                  amount={Number(pay.amount)}
                  requests={order.refund_requests}
                  paymentSubmittedAt={pay.submitted_at}
                />
              )}
              {pay && !refundBlocksPayment && !order.cancelled_at && (
                <PaymentSection
                  orderId={order.id}
                  orderNumber={order.order_number}
                  total={Number(order.total)}
                  payment={pay}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function CancelOrderAction({ orderId }: { orderId: string }) {
  const cancelOrder = useCancelUnpaidOrder(orderId);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function confirmCancellation() {
    try {
      await cancelOrder.mutateAsync();
      setDialogOpen(false);
      toast.success("Order cancelled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not cancel this order");
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-5">
      <div>
        <h2 className="text-2xl">Cancel this order?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You can cancel before submitting payment proof. If you have already transferred money,
          contact us instead so we can help with your payment.
        </p>
      </div>
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="destructive" disabled={cancelOrder.isPending}>
            Cancel order
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. You can place a new order from the menu later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelOrder.isPending}>Keep order</AlertDialogCancel>
            <AlertDialogAction
              disabled={cancelOrder.isPending}
              onClick={(event) => {
                event.preventDefault();
                void confirmCancellation();
              }}
            >
              {cancelOrder.isPending ? "Cancelling…" : "Yes, cancel order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function OrderDeliveryDateEditor({ orderId }: { orderId: string }) {
  const { data: options, isLoading, error } = useOrderRescheduleOptions(orderId);
  const reschedule = useRescheduleOrder(orderId);
  const [selectedDate, setSelectedDate] = useState("");
  const canReschedule = options?.[0]?.can_reschedule ?? false;
  const datedOptions = options?.filter(
    (option): option is typeof option & { delivery_date: string } =>
      option.delivery_date !== null,
  );

  async function saveDate() {
    if (!selectedDate || reschedule.isPending) return;
    try {
      await reschedule.mutateAsync(selectedDate);
      toast.success(`Delivery moved to ${formatDeliveryDate(selectedDate)}`);
      setSelectedDate("");
    } catch (saveError) {
      toast.error(
        saveError instanceof Error ? saveError.message : "Could not change delivery date",
      );
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-5">
      <div>
        <h2 className="text-2xl">Change delivery date</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Move delivery forward by up to two weekdays. Changes close at 11:00 LT on the day before
          your scheduled delivery.
        </p>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Checking available dates…</p>
      ) : error ? (
        <p role="alert" className="text-sm text-destructive">
          Could not load delivery date options: {error.message}
        </p>
      ) : !canReschedule ? (
        <p className="text-sm text-muted-foreground">
          The change window has closed, or this order is no longer active.
        </p>
      ) : datedOptions && datedOptions.length > 0 ? (
        <>
          <RadioGroup
            value={selectedDate}
            onValueChange={setSelectedDate}
            aria-label="New delivery date"
            className="space-y-2"
          >
            {datedOptions.map((option) => (
              <Label
                key={option.delivery_date}
                htmlFor={`reschedule-date-${option.delivery_date}`}
                className={`flex items-center gap-3 rounded-md border border-border p-3 ${
                  option.is_open ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                }`}
              >
                <RadioGroupItem
                  id={`reschedule-date-${option.delivery_date}`}
                  value={option.delivery_date}
                  disabled={!option.is_open}
                />
                <span>{formatDeliveryDate(option.delivery_date)}</span>
                {!option.is_open && (
                  <span className="ml-auto text-sm text-muted-foreground">Closed</span>
                )}
              </Label>
            ))}
          </RadioGroup>
          <Button
            type="button"
            disabled={!selectedDate || reschedule.isPending}
            onClick={() => void saveDate()}
          >
            {reschedule.isPending ? "Updating…" : "Update delivery date"}
          </Button>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">No future weekdays are available to choose.</p>
      )}
    </section>
  );
}

type Payment = {
  status: string;
  method: string | null;
  transaction_ref: string | null;
  submitted_at: string | null;
  review_note: string | null;
};

type RefundRequest = Tables<"refund_requests">;

function RejectedPaymentActions({
  orderId,
  orderNumber,
  total,
  payment,
  amount,
  refundRequests,
}: {
  orderId: string;
  orderNumber: string;
  total: number;
  payment: Payment;
  amount: number;
  refundRequests: RefundRequest[];
}) {
  const [activeTab, setActiveTab] = useState<"pay" | "refund">("pay");

  return (
    <div className="space-y-4">
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "pay" | "refund")}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-muted rounded-xl border border-border">
          <TabsTrigger
            value="pay"
            className="h-full rounded-lg text-sm sm:text-base font-semibold transition-all cursor-pointer data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            Proceed to pay
          </TabsTrigger>
          <TabsTrigger
            value="refund"
            className="h-full rounded-lg text-sm sm:text-base font-semibold transition-all cursor-pointer data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            Request refund
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="pay"
          forceMount
          className={activeTab === "pay" ? "mt-4 block" : "mt-4 hidden"}
        >
          <PaymentSection
            orderId={orderId}
            orderNumber={orderNumber}
            total={total}
            payment={payment}
          />
        </TabsContent>
        <TabsContent
          value="refund"
          forceMount
          className={activeTab === "refund" ? "mt-4 block" : "mt-4 hidden"}
        >
          <RefundSection
            orderId={orderId}
            orderNumber={orderNumber}
            amount={amount}
            requests={refundRequests}
            paymentSubmittedAt={payment.submitted_at}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PaymentSection({
  orderId,
  orderNumber,
  total,
  payment,
}: {
  orderId: string;
  orderNumber: string;
  total: number;
  payment: Payment;
}) {
  const { user } = useAuth();
  const paymentProofMutation = useSubmitPaymentProof(orderId);
  const receiptUploadMutation = useUploadPaymentReceipt();
  const [method, setMethod] = useState(payment.method ?? "cbe");
  const [ref, setRef] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [showResubmit, setShowResubmit] = useState(false);
  const waiting = payment.status === "unverified" && !!payment.submitted_at;

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (ref.trim().length < 4) {
      toast.error("Enter the transaction reference");
      return;
    }
    if (file && file.size > 5 * 1024 * 1024) {
      toast.error("Receipt must be under 5 MB");
      return;
    }
    if (file && !/^(image\/|application\/pdf)/.test(file.type)) {
      toast.error("Receipt must be an image or PDF");
      return;
    }
    setBusy(true);
    let path: string | null = null;
    if (file && user) {
      try {
        path = await receiptUploadMutation.mutateAsync({ userId: user.id, orderId, file });
      } catch (error) {
        console.error(error);
        setBusy(false);
        toast.error("Receipt upload failed");
        return;
      }
    }
    try {
      await paymentProofMutation.mutateAsync({
        orderId,
        method,
        reference: ref.trim(),
        receiptPath: path,
      });
    } catch (error) {
      setBusy(false);
      toast.error(error instanceof Error ? error.message : String(error));
      return;
    }
    setBusy(false);
    toast.success("Payment details sent. We'll verify shortly.");
    setRef("");
    setFile(null);
    setShowResubmit(false);
  }

  // When payment proof has been submitted, display the "Payment under review" card
  if (waiting && !showResubmit) {
    const methodLabel =
      payment.method === "cbe"
        ? "Commercial Bank of Ethiopia"
        : payment.method === "telebirr"
          ? "Telebirr"
          : (PAYMENT_ACCOUNTS.find((a) => a.id === payment.method)?.label ?? "Bank Transfer");

    return (
      <section
        id="payment"
        className="space-y-5 rounded-xl border border-border bg-card p-5"
      >
        <div>
          <h2 className="text-3xl">Payment under review</h2>
          <p className="mt-1 text-base leading-relaxed text-muted-foreground">
            We've received your payment details and are checking the transaction. Your order will be
            confirmed once the payment has been verified.
          </p>
        </div>

        <div className="border-t border-border/60" />

        <div className="space-y-3">
          <h3 className="text-2xl">Payment details</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-base">
              <span className="text-muted-foreground">Reference</span>
              <span className="font-mono font-bold text-foreground">
                {payment.transaction_ref}
              </span>
            </div>
            <div className="flex items-center justify-between text-base">
              <span className="text-muted-foreground">Payment method</span>
              <span className="font-semibold text-foreground">{methodLabel}</span>
            </div>
            <div className="flex items-center justify-between text-base">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-bold text-primary">{formatETB(total)}</span>
            </div>
            <div className="flex items-center justify-between text-base">
              <span className="text-muted-foreground">Submitted</span>
              <span className="text-muted-foreground">
                {payment.submitted_at
                  ? format(new Date(payment.submitted_at), "d MMM yyyy, HH:mm")
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-border/60 pt-4 space-y-2">
          <p className="text-base text-muted-foreground">
            There's nothing else you need to do right now. We'll let you know when your order is
            confirmed.
          </p>
          <button
            type="button"
            onClick={() => {
              setRef(payment.transaction_ref ?? "");
              setShowResubmit(true);
            }}
            className="text-base font-semibold text-primary hover:underline transition-colors block text-left"
          >
            Entered the wrong reference? Update payment details
          </button>
        </div>
      </section>
    );
  }

  return (
    <section id="payment" className="space-y-5 rounded-xl border border-border bg-card p-5">
      {waiting && showResubmit ? (
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div>
            <h2 className="text-xl font-bold">Update Payment Details</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Current reference:{" "}
              <span className="font-mono font-medium text-foreground">
                {payment.transaction_ref}
              </span>
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowResubmit(false)}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <>
          <div>
            <h2 className="text-3xl">Pay by transfer</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Send exactly <strong className="text-foreground">{formatETB(total)}</strong> to one of
              these accounts. Put <strong className="text-foreground">{orderNumber}</strong> in the
              transfer reason.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {PAYMENT_ACCOUNTS.map((a) => (
              <div key={a.id} className="rounded-lg border border-border bg-muted p-4">
                <p className="text-sm font-semibold">{a.label}</p>
                <p className="mt-1 font-mono text-lg">{a.accountNumber}</p>
                <p className="text-sm text-muted-foreground">{a.accountName}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {payment.status === "rejected" && (
        <p className="rounded-md border border-destructive p-3 text-sm">
          Your last payment couldn't be verified
          {payment.review_note ? `: ${payment.review_note}` : "."} Please check and resubmit.
        </p>
      )}

      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm font-semibold">
          {waiting ? "Submit corrected reference:" : "After paying, submit your proof:"}
        </p>
        <div>
          <p className="mb-2 text-sm font-medium">
            Payment method <RequiredMark />
          </p>
          <RadioGroup
            value={method}
            onValueChange={setMethod}
            required
            aria-label="Payment method"
            className="flex gap-6"
          >
            {PAYMENT_ACCOUNTS.map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-sm">
                <RadioGroupItem value={a.id} /> {a.id === "cbe" ? "CBE" : "Telebirr"}
              </label>
            ))}
          </RadioGroup>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ref">
            Transaction reference <RequiredMark />
          </Label>
          <Input
            id="ref"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            required
            maxLength={64}
            placeholder="e.g. FT24301ABC12"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="receipt">Receipt screenshot (optional)</Label>
          <Input
            id="receipt"
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="flex gap-2">
          {waiting && showResubmit && (
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setShowResubmit(false)}
            >
              Cancel
            </Button>
          )}
          <Button className="w-full bg-flame flex-1" disabled={busy}>
            {busy ? "Sending…" : waiting ? "Update payment proof" : "Submit payment proof"}
          </Button>
        </div>
      </form>
    </section>
  );
}
