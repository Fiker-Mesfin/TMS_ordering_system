import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { Button } from "@/shared/ui/button";
import { StatusBadge } from "@/shared/feedback/status-badge";
import { formatDeliveryDate } from "@/lib/delivery";
import { useAuth } from "@/lib/auth";
import { formatETB } from "@/lib/shop";
import { useMyOrders } from "../hooks/useOrders";

export function MyOrdersPage() {
  const { user } = useAuth();
  const { data: orders = [], isLoading } = useMyOrders(user?.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-5xl">My Orders</h1>
      {isLoading ? (
        <p className="mt-8 text-muted-foreground">Loading…</p>
      ) : orders.length === 0 ? (
        <div className="mt-8 rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">No orders yet.</p>
          <Button asChild className="mt-4">
            <Link to="/">Order now</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {orders.map((o) => {
            const pay = Array.isArray(o.payments) ? o.payments[0] : o.payments;
            return (
              <li key={o.id}>
                <Link
                  to="/orders/$orderId"
                  params={{ orderId: o.id }}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <div className="min-w-0">
                    <p className="font-display text-xl uppercase">{o.order_number}</p>
                    <p className="text-sm text-muted-foreground sm:text-base">
                      {format(new Date(o.created_at), "d MMM yyyy, HH:mm")} · {o.delivery_area_name}
                    </p>
                    <p className="text-sm text-muted-foreground sm:text-base">
                      Delivery: {formatDeliveryDate(o.delivery_date)} · {o.meal_slot}
                    </p>
                    <p
                      className={`mt-1 text-sm font-medium leading-snug sm:text-base ${pay?.status === "rejected" ? "text-destructive" : pay?.status === "verified" ? "text-success" : "text-primary"}`}
                    >
                      {o.cancelled_at
                        ? "Order closed — place a new order from the menu"
                        : pay?.status === "verified"
                          ? "Confirmed — delivery scheduled"
                          : pay?.status === "rejected"
                            ? "Payment needs attention — open to resubmit"
                            : pay?.submitted_at
                              ? "Payment submitted — waiting for verification"
                              : "Payment required — open to complete your order"}
                    </p>
                  </div>
                  <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:flex-col sm:items-end sm:text-right">
                    <p className="font-semibold">{formatETB(o.total)}</p>
                    <div className="flex flex-col items-end gap-1 sm:mt-1 sm:flex-row sm:flex-wrap sm:justify-end">
                      {!(pay?.status === "rejected") && (
                        <StatusBadge
                          status={o.cancelled_at ? "cancelled" : o.status}
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
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
