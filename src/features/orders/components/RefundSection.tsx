import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { formatETB } from "@/lib/shop";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { Textarea } from "@/shared/ui/textarea";
import { getRefundProofUrl } from "@/services/refundService";
import {
  useRequestPaymentRefund,
  useRequestRefundFollowUp,
  useResolveRefundDecision,
} from "../hooks/useRefunds";

type RefundRequest = Tables<"refund_requests">;

export function RefundSection({
  orderId,
  orderNumber,
  amount,
  requests,
  paymentSubmittedAt,
}: {
  orderId: string;
  orderNumber: string;
  amount: number;
  requests: RefundRequest[];
  paymentSubmittedAt: string | null;
}) {
  const navigate = useNavigate();
  const [method, setMethod] = useState<"cbe" | "telebirr">("cbe");
  const [accountNumber, setAccountNumber] = useState("");
  const [reason, setReason] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");
  const [proofBusy, setProofBusy] = useState(false);
  const requestRefund = useRequestPaymentRefund(orderId);
  const requestFollowUp = useRequestRefundFollowUp(orderId);
  const resolveDecision = useResolveRefundDecision(orderId);
  const latest = [...requests].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const completedRefund =
    latest?.status === "refunded" && latest.customer_decision !== "continue" ? latest : undefined;
  const canRequestAnotherRefund =
    latest?.customer_decision === "continue" &&
    !!latest.customer_decided_at &&
    !!paymentSubmittedAt &&
    new Date(paymentSubmittedAt).getTime() > new Date(latest.customer_decided_at).getTime();

  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await requestRefund.mutateAsync({
        orderId,
        method,
        accountNumber: accountNumber.trim(),
        reason: reason.trim(),
      });
      setAccountNumber("");
      setReason("");
      toast.success("Refund request sent for review");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit refund request");
    }
  }

  async function submitFollowUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!completedRefund) return;
    try {
      await requestFollowUp.mutateAsync({
        requestId: completedRefund.id,
        note: followUpNote.trim(),
      });
      toast.success("Refund follow-up sent to the owner");
      setFollowUpNote("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send refund follow-up");
    }
  }

  async function chooseDecision(decision: "continue" | "cancel") {
    if (!completedRefund) return;
    try {
      await resolveDecision.mutateAsync({ requestId: completedRefund.id, decision });
      if (decision === "cancel") {
        toast.success("Order closed. You can place a new order now.");
        await navigate({ to: "/" });
      } else {
        toast.success("You can now submit a new payment for this order.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update this order");
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

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div>
        <h2 className="text-3xl">Refund request</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          If you already transferred money but your payment was rejected, request a refund to your
          CBE or Telebirr account. Refund transfers are sent manually after review.
        </p>
      </div>

      {latest && (
        <div className="space-y-2 rounded-lg border border-border bg-muted/50 p-4 text-sm">
          <p className="font-semibold capitalize">Request status: {latest.status}</p>
          {latest.status === "refunded" && latest.customer_decision === "continue" && (
            <p className="text-muted-foreground">
              {canRequestAnotherRefund
                ? "You continued this order, submitted another payment, and it was rejected. You may request a new refund."
                : "You previously confirmed receiving this refund and continued this order. Submit another payment before requesting any further refund."}
            </p>
          )}
          {latest.status === "pending" && (
            <p className="text-muted-foreground">The owner is reviewing your refund request.</p>
          )}
          {latest.status === "approved" && (
            <p className="text-muted-foreground">
              Approved. The owner will send the transfer manually and add its reference and proof
              here.
            </p>
          )}
          {latest.status === "rejected" && (
            <>
              <p className="text-muted-foreground">
                {latest.admin_note || "The refund request was declined."} Contact us at{" "}
                <a className="font-semibold text-primary underline" href="tel:0988241287">
                  0988241287
                </a>{" "}
                if you need help. You may submit another request.
              </p>
            </>
          )}
          {completedRefund && (
            <>
              <p className="text-muted-foreground">
                Refund marked sent. Transfer reference:{" "}
                <span className="font-mono text-foreground">
                  {completedRefund.refund_reference}
                </span>
              </p>
              {completedRefund.proof_path && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={proofBusy}
                  onClick={() => void openProof(completedRefund.proof_path!)}
                >
                  {proofBusy ? "Opening…" : "View refund proof"}
                </Button>
              )}
              {completedRefund.customer_decision === "continue" ? (
                <p className="text-muted-foreground">
                  You confirmed receiving this refund and chose to continue this order. Submit the
                  correct payment using the payment section below.
                </p>
              ) : completedRefund.customer_decision === "cancel" ? (
                <p className="text-muted-foreground">
                  You confirmed receiving this refund and closed this order. Place a new order from
                  the menu whenever you are ready.
                </p>
              ) : completedRefund.follow_up_status === "pending" ? (
                <p className="text-muted-foreground">
                  Your “refund not received” follow-up is with the owner for investigation.
                </p>
              ) : (
                <>
                  {completedRefund.follow_up_status === "resolved" && (
                    <p className="text-muted-foreground">
                      Follow-up update:{" "}
                      {completedRefund.follow_up_admin_note || "The owner reviewed your request."}
                    </p>
                  )}
                  <div className="space-y-2 border-t border-border pt-3">
                    <p className="text-sm font-semibold">Have you received this refund?</p>
                    <p className="text-xs text-muted-foreground">
                      If you cannot find it, request an investigation first. You can choose what to
                      do with this order after the owner reviews it.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        disabled={resolveDecision.isPending}
                        onClick={() => void chooseDecision("continue")}
                      >
                        Continue this order
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={resolveDecision.isPending}
                        onClick={() => void chooseDecision("cancel")}
                      >
                        Close order and reorder
                      </Button>
                    </div>
                    <form
                      onSubmit={submitFollowUp}
                      className="space-y-2 border-t border-border pt-3"
                    >
                      <p className="text-xs text-muted-foreground">
                        A follow-up will not automatically issue another payment.
                      </p>
                      <Textarea
                        value={followUpNote}
                        onChange={(event) => setFollowUpNote(event.target.value)}
                        maxLength={500}
                        placeholder="Optional details, such as when you checked your account"
                        aria-label="Refund follow-up details"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        variant="outline"
                        disabled={requestFollowUp.isPending}
                      >
                        {requestFollowUp.isPending ? "Sending…" : "I haven't received this refund"}
                      </Button>
                    </form>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {!completedRefund &&
        (!latest ||
          latest.status === "rejected" ||
          (latest.customer_decision === "continue" && canRequestAnotherRefund)) && (
          <form onSubmit={submitRequest} className="space-y-4">
            <p className="text-sm font-semibold">
              {latest ? "Submit another request" : `Request ${formatETB(amount)} back to:`}
            </p>
            <RadioGroup
              value={method}
              onValueChange={(value) => setMethod(value as "cbe" | "telebirr")}
              aria-label="Refund payment method"
              className="flex flex-wrap gap-5"
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="cbe" /> CBE
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="telebirr" /> Telebirr
              </label>
            </RadioGroup>
            <div className="space-y-1.5">
              <Label htmlFor={`refund-account-${orderId}`}>
                {method === "cbe" ? "CBE account number" : "Telebirr phone number"}
              </Label>
              <Input
                id={`refund-account-${orderId}`}
                value={accountNumber}
                onChange={(event) => setAccountNumber(event.target.value)}
                required
                minLength={6}
                maxLength={32}
                inputMode="tel"
                placeholder={method === "cbe" ? "Enter your CBE account number" : "09XXXXXXXX"}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`refund-reason-${orderId}`}>Reason (optional)</Label>
              <Textarea
                id={`refund-reason-${orderId}`}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={500}
                placeholder="Add any details that may help us review your request"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={requestRefund.isPending}>
                {requestRefund.isPending ? "Sending…" : "Submit refund request"}
              </Button>
              <Button asChild type="button" variant="outline">
                <Link to="/">Order again</Link>
              </Button>
            </div>
          </form>
        )}

      {!latest && (
        <p className="text-xs text-muted-foreground">
          Only request a refund if you sent the payment and it was rejected. If you did not make a
          transfer, you can{" "}
          <Link to="/" className="font-semibold text-primary underline">
            place a new order
          </Link>{" "}
          instead.
        </p>
      )}
      {latest && (
        <p className="text-xs text-muted-foreground">
          Still want to order?{" "}
          <Link to="/" className="font-semibold text-primary underline">
            Browse the menu
          </Link>
          .
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Refund request for {orderNumber}. Approval does not transfer money automatically; the owner
        sends it and posts the transaction proof here.
      </p>
    </section>
  );
}
