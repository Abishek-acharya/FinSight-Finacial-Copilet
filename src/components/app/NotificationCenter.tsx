import { BellIcon } from "@heroicons/react/24/outline";
import { useCallback, useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api";
import { getStoredSession } from "@/lib/auth/authService";

interface FinanceAlert {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: number;
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<FinanceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const unreadCount = alerts.filter((alert) => !alert.is_read).length;

  const loadAlerts = useCallback(async () => {
    const session = getStoredSession();
    if (!session) {
      setAlerts([]);
      setLoading(false);
      setError(null);
      return;
    }
    try {
      const result = await apiFetch<{ alerts: FinanceAlert[] }>("/api/finance/alerts", {}, session.accessToken);
      setAlerts(result.alerts);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Alerts could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAlerts();
    const refresh = () => void loadAlerts();
    window.addEventListener("focus", refresh);
    window.addEventListener("finsight-finance-updated", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("finsight-finance-updated", refresh);
    };
  }, [loadAlerts]);

  const markAllRead = async () => {
    const session = getStoredSession();
    if (!session || unreadCount === 0) return;
    setError(null);
    try {
      await apiFetch<void>("/api/finance/alerts/read", { method: "POST" }, session.accessToken);
      setAlerts((current) => current.map((alert) => ({ ...alert, is_read: true })));
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : "Alerts could not be marked as read.");
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="md"
        onClick={() => {
          setOpen(true);
          void loadAlerts();
        }}
        className="relative gap-2 text-ink-muted hover:text-ink"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
      >
        <BellIcon className="size-5" />
        <span className="hidden sm:inline">Alerts</span>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-accent-primary text-[10px] font-bold text-ink">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      <Drawer open={open} onClose={() => setOpen(false)} title="Notifications" description="Budget and unusual-transaction alerts from your saved financial data">
        <div className="space-y-4">
          {unreadCount > 0 && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => void markAllRead()}>Mark all read</Button>
            </div>
          )}
          {error && <p role="alert" className="rounded-lg border border-error/30 bg-error/5 p-3 text-sm text-error">{error}</p>}
          {loading ? (
            <p className="text-sm text-ink-muted">Loading alerts…</p>
          ) : alerts.length > 0 ? (
            alerts.map((alert) => (
              <article key={alert.id} className={`rounded-xl border p-4 ${alert.is_read ? "border-border bg-surface-secondary" : "border-accent-primary/40 bg-accent-primary/5"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{alert.title}</p>
                    <p className="mt-1 text-sm leading-6 text-ink-muted">{alert.message}</p>
                  </div>
                  <time className="shrink-0 text-[11px] text-ink-muted" dateTime={new Date(alert.created_at * 1000).toISOString()}>
                    {new Date(alert.created_at * 1000).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </time>
                </div>
              </article>
            ))
          ) : !error ? (
            <p className="text-sm text-ink-muted">No alerts yet. Budget alerts appear when spending exceeds a category limit; unusual-transaction alerts need enough same-category history.</p>
          ) : null}
        </div>
      </Drawer>
    </>
  );
}
