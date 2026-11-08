export function hasSubmittedPaymentReference(transactionRef: string | null | undefined) {
  return Boolean(transactionRef?.trim());
}

export function isAwaitingPaymentDetails(payment: {
  transaction_ref: string | null | undefined;
  orders?: { status: string; cancelled_at: string | null } | null;
}) {
  return (
    !hasSubmittedPaymentReference(payment.transaction_ref) &&
    payment.orders?.status === "pending" &&
    !payment.orders.cancelled_at
  );
}
