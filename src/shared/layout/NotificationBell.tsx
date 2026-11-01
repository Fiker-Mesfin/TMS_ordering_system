import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { Bell, Check } from "lucide-react";
import { toast } from "sonner";
import { useNotifications, useMarkNotificationRead } from "@/hooks/useNotifications";
import { Button } from "@/shared/ui/button";
import { useAuth } from "@/lib/auth";

export function NotificationBell() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { data: notifications, isLoading, isError, refetch } = useNotifications(user?.id);
  const markRead = useMarkNotificationRead(user?.id);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const seenIds = useRef<Set<string> | null>(null);
  const unreadCount = notifications?.filter((notification) => !notification.read_at).length ?? 0;

  useEffect(() => {
    if (!notifications) return;
    const currentIds = new Set(notifications.map((notification) => notification.id));
    if (seenIds.current === null) {
      seenIds.current = currentIds;
      return;
    }

    notifications
      .filter((notification) => !seenIds.current?.has(notification.id))
      .reverse()
      .forEach((notification) => {
        toast(notification.title, { description: notification.body });
      });
    seenIds.current = currentIds;
  }, [notifications]);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: PointerEvent) {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  async function openNotification(notification: NonNullable<typeof notifications>[number]) {
    if (!notification.read_at) {
      try {
        await markRead.mutateAsync(notification.id);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not mark notification as read");
      }
    }
    setOpen(false);
    if (
      notification.event_type === "payment_submitted" ||
      notification.event_type === "refund_requested" ||
      notification.event_type === "refund_follow_up"
    ) {
      navigate({ to: "/admin" });
    } else if (notification.order_id) {
      navigate({ to: "/orders/$orderId", params: { orderId: notification.order_id } });
    } else {
      navigate({ to: "/orders" });
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        title={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        aria-controls="notification-panel"
        onClick={() => setOpen((value) => !value)}
        className="relative sm:h-10 sm:w-10 sm:[&_svg]:size-5"
      >
        <Bell />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <section
          id="notification-panel"
          aria-label="Notifications"
          className="fixed left-3 right-3 top-14 z-50 overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[min(22rem,calc(100vw-2rem))]"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="font-display text-xl uppercase">Notifications</h2>
            <span className="text-sm text-muted-foreground">{unreadCount} unread</span>
          </div>
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading notifications…</p>
          ) : isError ? (
            <div className="p-4 text-sm">
              <p className="text-destructive">Could not load notifications.</p>
              <Button variant="link" className="h-auto px-0" onClick={() => void refetch()}>
                Try again
              </Button>
            </div>
          ) : notifications?.length ? (
            <ul className="max-h-[min(28rem,70vh)] overflow-y-auto">
              {notifications.map((notification) => (
                <li key={notification.id} className="border-b border-border last:border-0">
                  <button
                    type="button"
                    onClick={() => void openNotification(notification)}
                    className="flex w-full gap-3 p-4 text-left transition-colors hover:bg-muted"
                  >
                    <span
                      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${notification.read_at ? "bg-muted-foreground/30" : "bg-primary"}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-semibold leading-snug">
                        {notification.title}
                      </span>
                      <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                        {notification.body}
                      </span>
                      <span className="mt-2 block text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </span>
                    {!notification.read_at && <Check className="h-4 w-4 shrink-0 text-success" />}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">You’re all caught up.</p>
          )}
          <div className="border-t border-border p-3 text-center">
            <Button asChild size="sm" variant="ghost">
              <Link to={isAdmin ? "/admin" : "/orders"} onClick={() => setOpen(false)}>
                {isAdmin ? "Orders" : "My orders"}
              </Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
