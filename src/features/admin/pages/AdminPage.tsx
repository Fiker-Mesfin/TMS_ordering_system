import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, X, RotateCcw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { cn } from "@/lib/utils";
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
import {
  getAdminRefundRequests,
  getRefundProofUrl,
  removeRefundProof,
  uploadRefundProof,
} from "@/services/refundService";
import { OwnerMenuForm } from "../components/OwnerMenuForm";
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

type StatusFilter = "all" | "confirmed" | "unverified" | "rejected" | "cancelled";
type SortOption = "created_desc" | "created_asc" | "delivery_asc" | "total_desc" | "total_asc";

type AdminOrder = NonNullable<Awaited<ReturnType<typeof import("@/services/adminService").getAdminOrders>>>[number];

function getOrderStatusKey(order: AdminOrder): "confirmed" | "unverified" | "rejected" | "cancelled" {
  const pay = Array.isArray(order.payments)
    ? [...order.payments].sort((a, b) => ((b as any).created_at || "").localeCompare((a as any).created_at || ""))[0] || order.payments[0]
    : order.payments;

  if (order.cancelled_at) return "cancelled";
  if (pay?.status === "rejected") return "rejected";
  if (order.status === "confirmed" || pay?.status === "verified") return "confirmed";
  return "unverified";
}

function OrdersTab() {
  const { data = [], isLoading } = useAdminOrders();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [mealSlotFilter, setMealSlotFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("created_desc");

  // Status counts
  const counts = useMemo(() => {
    const res = { all: data.length, confirmed: 0, unverified: 0, rejected: 0, cancelled: 0 };
    for (const o of data) {
      const key = getOrderStatusKey(o);
      res[key]++;
    }
    return res;
  }, [data]);

  // Unique delivery dates and areas
  const uniqueDates = useMemo(() => {
    const set = new Set<string>();
    for (const o of data) {
      if (o.delivery_date) set.add(o.delivery_date);
    }
    return Array.from(set).sort();
  }, [data]);

  const uniqueAreas = useMemo(() => {
    const set = new Set<string>();
    for (const o of data) {
      if (o.delivery_area_name) set.add(o.delivery_area_name);
    }
    return Array.from(set).sort();
  }, [data]);

  // Filter
  const filtered = useMemo(() => {
    return data.filter((o) => {
      if (statusFilter !== "all") {
        if (getOrderStatusKey(o) !== statusFilter) return false;
      }
      if (dateFilter !== "all" && o.delivery_date !== dateFilter) {
        return false;
      }
      if (mealSlotFilter !== "all" && o.meal_slot?.toLowerCase() !== mealSlotFilter.toLowerCase()) {
        return false;
      }
      if (areaFilter !== "all" && o.delivery_area_name !== areaFilter) {
        return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchNumber = o.order_number?.toLowerCase().includes(q);
        const matchName = o.contact_name?.toLowerCase().includes(q);
        const matchPhone = o.contact_phone?.toLowerCase().includes(q);
        const matchArea = o.delivery_area_name?.toLowerCase().includes(q);
        const matchAddress = o.address?.toLowerCase().includes(q);
        const matchItems = o.order_items?.some((i) => i.name.toLowerCase().includes(q));

        if (!matchNumber && !matchName && !matchPhone && !matchArea && !matchAddress && !matchItems) {
          return false;
        }
      }
      return true;
    });
  }, [data, statusFilter, dateFilter, mealSlotFilter, areaFilter, search]);

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === "created_asc") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === "delivery_asc") {
        const dateComp = (a.delivery_date || "").localeCompare(b.delivery_date || "");
        if (dateComp !== 0) return dateComp;
        const slotComp = (a.meal_slot || "").localeCompare(b.meal_slot || "");
        if (slotComp !== 0) return slotComp;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === "total_desc") {
        return Number(b.total) - Number(a.total);
      }
      if (sortBy === "total_asc") {
        return Number(a.total) - Number(b.total);
      }
      // Default: created_desc (newest / latest on top)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [filtered, sortBy]);

  const hasActiveFilters =
    search !== "" ||
    statusFilter !== "all" ||
    dateFilter !== "all" ||
    mealSlotFilter !== "all" ||
    areaFilter !== "all" ||
    sortBy !== "created_desc";

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setDateFilter("all");
    setMealSlotFilter("all");
    setAreaFilter("all");
    setSortBy("created_desc");
  }

  const statusPills: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "confirmed", label: "Confirmed" },
    { key: "unverified", label: "Under Review" },
    { key: "rejected", label: "Rejected" },
    { key: "cancelled", label: "Cancelled" },
  ];

  if (isLoading) {
    return <p className="mt-6 text-muted-foreground">Loading orders…</p>;
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Search & Status Pills */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order #, customer, phone, item, area..."
            className="pl-9 pr-9 bg-card"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {statusPills.map((pill) => {
            const isSelected = statusFilter === pill.key;
            return (
              <button
                key={pill.key}
                type="button"
                onClick={() => setStatusFilter(pill.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <span>{pill.label}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                    isSelected
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {counts[pill.key]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Secondary filter controls */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Delivery Date
          </label>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="h-9 bg-card text-xs">
              <SelectValue placeholder="All dates" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All dates</SelectItem>
              {uniqueDates.map((d) => (
                <SelectItem key={d} value={d}>
                  {formatDeliveryDate(d)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Meal Slot
          </label>
          <Select value={mealSlotFilter} onValueChange={setMealSlotFilter}>
            <SelectTrigger className="h-9 bg-card text-xs capitalize">
              <SelectValue placeholder="All slots" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All slots</SelectItem>
              <SelectItem value="breakfast">Breakfast</SelectItem>
              <SelectItem value="lunch">Lunch</SelectItem>
              <SelectItem value="dinner">Dinner</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Delivery Area
          </label>
          <Select value={areaFilter} onValueChange={setAreaFilter}>
            <SelectTrigger className="h-9 bg-card text-xs">
              <SelectValue placeholder="All areas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All areas</SelectItem>
              {uniqueAreas.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Sort By
          </label>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="h-9 bg-card text-xs">
              <SelectValue placeholder="Sort orders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_desc">Newest first (default)</SelectItem>
              <SelectItem value="created_asc">Oldest first</SelectItem>
              <SelectItem value="delivery_asc">Delivery date (soonest)</SelectItem>
              <SelectItem value="total_desc">Highest total</SelectItem>
              <SelectItem value="total_asc">Lowest total</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results header & Reset */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground pt-1">
        <p>
          Showing <span className="font-semibold text-foreground">{sorted.length}</span> of{" "}
          <span className="font-semibold text-foreground">{data.length}</span> orders
        </p>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            Reset filters
          </button>
        )}
      </div>

      {/* Orders list or empty state */}
      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center">
          <p className="text-base font-semibold">No orders match the selected filters</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting your search query, status, or date filters.
          </p>
          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetFilters}
              className="mt-4"
            >
              Reset filters
            </Button>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {sorted.map((o) => {
            const pay = Array.isArray(o.payments)
              ? [...o.payments].sort((a, b) => ((b as any).created_at || "").localeCompare((a as any).created_at || ""))[0] || o.payments[0]
              : o.payments;
            return (
              <li key={o.id} className="rounded-xl border border-border bg-card p-4 text-sm transition-colors hover:border-primary/40">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    to="/orders/$orderId"
                    params={{ orderId: o.id }}
                    className="font-display text-lg uppercase hover:text-primary transition-colors underline-offset-4 hover:underline"
                  >
                    {o.order_number}
                  </Link>
                  <span className="flex gap-1">
                    {!(pay?.status === "rejected") && (
                      <StatusBadge status={o.cancelled_at ? "cancelled" : o.status} />
                    )}
                    {pay && <StatusBadge status={pay.status} label={`payment ${pay.status}`} />}
                  </span>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {o.order_items.map((i) => `${i.quantity}× ${i.name}`).join(", ")} ·{" "}
                  <strong className="text-foreground">{formatETB(o.total)}</strong>
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
