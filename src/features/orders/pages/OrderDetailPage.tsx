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
import { formatDeliveryDate } from "@/lib/delivery";
import { useAuth } from "@/lib/auth";
import { formatETB, PAYMENT_ACCOUNTS } from "@/lib/shop";
import {
  useOrderDetails,
  useSubmitPaymentProof,
  useUploadPaymentReceipt,
} from "../hooks/useOrders";

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
  const deliveryScheduleMessage = `Your burgers are scheduled for delivery on ${formatDeliveryDate(order.delivery_date)} during ${order.meal_slot}.`;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-12">
      <Link to="/orders" className="text-sm text-muted-foreground hover:text-foreground">
        ← My Orders
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-5xl">{order.order_number}</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(order.created_at), "d MMM yyyy, HH:mm")}
          </p>
          <p className="text-sm text-muted-foreground">
            Delivery: {formatDeliveryDate(order.delivery_date)} · {order.meal_slot}
          </p>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={order.status} />
          {pay && <StatusBadge status={pay.status} label={`payment ${pay.status}`} />}
        </div>
      </div>

      <section
        className="space-y-4 rounded-xl border border-border bg-card p-5"
        aria-label="Order progress"
      >
        <div>
          <h2 className="text-3xl">Order progress</h2>
          <p className="mt-1 text-sm text-muted-foreground" role="status">
            {paymentVerified
              ? deliveryScheduleMessage
              : paymentRejected
                ? "Your payment needs attention. Review the note below and resubmit your proof to continue."
                : paymentSubmitted
                  ? "Payment received — we’re checking it. We’ll confirm the order and delivery schedule once it’s verified."
                  : "Your order is saved but not confirmed. Complete the bank transfer and submit its reference and proof below to reserve your delivery."}
          </p>
        </div>
        <ol className="grid gap-3 sm:grid-cols-4">
          {[
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
                  : "Verification",
              complete: paymentVerified,
            },
            { label: "Delivery scheduled", complete: order.status === "confirmed" },
          ].map((step, index) => (
            <li
              key={step.label}
              className={`rounded-lg border p-3 text-sm ${
                step.complete
                  ? "border-success/50 bg-success/10 text-success"
                  : paymentRejected && index === 2
                    ? "border-destructive/50 bg-destructive/10 text-destructive"
                    : "border-border text-muted-foreground"
              }`}
            >
              <span className="block text-xs font-semibold uppercase tracking-wide">
                Step {index + 1}
              </span>
              <span className="mt-1 block font-medium">{step.label}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <ul className="space-y-2 text-sm">
          {order.order_items.map((it) => (
            <li key={it.id} className="flex justify-between gap-2">
              <span>
                {it.quantity} × {it.name}
                {(it.extras as Extra[]).length > 0 && (
                  <span className="block text-xs text-muted-foreground">
                    + {(it.extras as Extra[]).map((e) => e.name).join(", ")}
                  </span>
                )}
              </span>
              <span>{formatETB(it.line_total)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivery</span>
            <span>FREE · ETB 0</span>
          </div>
          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span className="text-primary">{formatETB(order.total)}</span>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Deliver to {order.delivery_area_name} — {order.address} · {order.contact_name},{" "}
          {order.contact_phone}
        </p>
      </section>

      {order.status === "confirmed" ? (
        <section className="rounded-xl border border-success bg-card p-5">
          <p className="font-display text-2xl uppercase text-success">Order confirmed</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Payment verified. {deliveryScheduleMessage}
          </p>
        </section>
      ) : (
        pay && (
          <PaymentSection
            orderId={order.id}
            orderNumber={order.order_number}
            total={Number(order.total)}
            payment={pay}
          />
        )
      )}
    </div>
  );
}

type Payment = {
  status: string;
  method: string | null;
  transaction_ref: string | null;
  submitted_at: string | null;
  review_note: string | null;
};

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
  }

  return (
    <section id="payment" className="space-y-5 rounded-xl border border-primary/60 bg-card p-5">
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
            <p className="text-xs text-muted-foreground">{a.accountName}</p>
          </div>
        ))}
      </div>

      {payment.status === "rejected" && (
        <p className="rounded-md border border-destructive p-3 text-sm">
          Your last payment couldn't be verified
          {payment.review_note ? `: ${payment.review_note}` : "."} Please check and resubmit.
        </p>
      )}
      {waiting && (
        <p className="rounded-md border border-border p-3 text-sm text-muted-foreground">
          We received your reference{" "}
          <span className="font-mono text-foreground">{payment.transaction_ref}</span>. The owner is
          checking the bank transaction — your order will be confirmed once verified.
        </p>
      )}

      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm font-semibold">
          {waiting ? "Need to correct it? Resubmit:" : "After paying, submit your proof:"}
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
        <Button className="w-full bg-flame" disabled={busy}>
          {busy ? "Sending…" : "Submit payment proof"}
        </Button>
      </form>
    </section>
  );
}
