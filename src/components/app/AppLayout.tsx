import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLocation, useOutlet } from "react-router-dom";
import { AppMobileNav } from "@/components/app/AppMobileNav";
import { AppNavbar } from "@/components/app/AppNavbar";
import { CommandPalette } from "@/components/app/CommandPalette";
import { FinancialCopilot } from "@/components/app/FinancialCopilot";
import { MarketTicker } from "@/components/app/MarketTicker";
import { LiveBackground } from "@/components/layout/LiveBackground";
import { useToast } from "@/components/ui/Toast";
import { getStoredSession } from "@/lib/auth/authService";
import { showFinanceSystemNotification } from "@/services/pwaService";
import { financeStore } from "@/store/financeStore";
import { useAuth } from "@/hooks/useAuth";

export default function AppLayout() {
  const { showToast } = useToast();
  const { status, user } = useAuth();
  const location = useLocation();
  const outlet = useOutlet();
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    const handleSyncError = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      showToast({
        kind: "error",
        title: "Could not sync finance data",
        description: detail?.message ?? "Your latest changes could not be saved to your account.",
        duration: 0,
      });
    };
    window.addEventListener("finsight:finance-sync-error", handleSyncError);
    return () => window.removeEventListener("finsight:finance-sync-error", handleSyncError);
  }, [showToast]);

  useEffect(() => {
    const handleOfflineWrite = () => {
      showToast({
        kind: "error",
        title: "Offline mode is read-only",
        description: "Reconnect to save changes. Nothing was queued or sent.",
        duration: 0,
      });
    };
    const handleCacheError = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      showToast({
        kind: "error",
        title: "Offline cache issue",
        description: detail?.message ?? "The browser could not update your local finance cache.",
        duration: 0,
      });
    };
    window.addEventListener("finsight:offline-write-blocked", handleOfflineWrite);
    window.addEventListener("finsight:offline-cache-error", handleCacheError);
    return () => {
      window.removeEventListener("finsight:offline-write-blocked", handleOfflineWrite);
      window.removeEventListener("finsight:offline-cache-error", handleCacheError);
    };
  }, [showToast]);

  useEffect(() => {
    if (status !== "authenticated") {
      window.dispatchEvent(new CustomEvent("finsight:live-connection", {
        detail: { connected: false, offline: status === "offline" },
      }));
      return;
    }

    const session = getStoredSession();
    if (!session) return;
    let active = true;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | undefined;
    let heartbeatTimer: number | undefined;
    let reconnectDelay = 1000;

    const connect = () => {
      if (!active) return;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      socket = new WebSocket(`${protocol}//${window.location.host}/ws/live-updates?token=${encodeURIComponent(session.accessToken)}`);
      socket.onopen = () => {
        reconnectDelay = 1000;
        window.dispatchEvent(new CustomEvent("finsight:live-connection", { detail: { connected: true } }));
        heartbeatTimer = window.setInterval(() => {
          if (socket?.readyState === WebSocket.OPEN) socket.send("ping");
        }, 25_000);
      };
      socket.onmessage = (event) => {
        let payload: { event?: string; title?: string; message?: string; id?: string };
        try {
          payload = JSON.parse(event.data) as typeof payload;
        } catch (error) {
          console.error("Could not parse a live finance event:", error);
          return;
        }

        if (payload.event === "new_transaction") {
          void financeStore.syncWithDatabase().then(() => {
            showToast({
              kind: "success",
              title: "Live dashboard update",
              description: "New financial activity has been synchronized.",
            });
          }).catch((error: unknown) => {
            showToast({
              kind: "error",
              title: "Live update could not be synchronized",
              description: error instanceof Error ? error.message : "Refresh the page to retry.",
            });
          });
        } else if (payload.event === "budget_alert") {
          showToast({
            kind: "error",
            title: payload.title || "Budget alert",
            description: payload.message || "A budget limit was exceeded.",
            duration: 0,
          });
          void showFinanceSystemNotification(payload.title || "FinSight budget alert", payload.message || "A budget limit was exceeded.")
            .catch((error: unknown) => console.error("Could not display a browser budget notification:", error));
          window.dispatchEvent(new Event("finsight-finance-updated"));
        } else if (payload.event === "anomaly_alert") {
          showToast({
            kind: "error",
            title: payload.title || "Unusual transaction detected",
            description: payload.message || "Please review this transaction.",
            duration: 0,
          });
          void showFinanceSystemNotification(payload.title || "FinSight transaction alert", payload.message || "Please review this transaction.")
            .catch((error: unknown) => console.error("Could not display a browser anomaly notification:", error));
          window.dispatchEvent(new Event("finsight-finance-updated"));
        }
      };
      socket.onclose = () => {
        if (heartbeatTimer !== undefined) window.clearInterval(heartbeatTimer);
        window.dispatchEvent(new CustomEvent("finsight:live-connection", { detail: { connected: false } }));
        if (!active) return;
        reconnectTimer = window.setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 30_000);
      };
      socket.onerror = () => socket?.close();
    };

    connect();
    return () => {
      active = false;
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
      if (heartbeatTimer !== undefined) window.clearInterval(heartbeatTimer);
      socket?.close();
      window.dispatchEvent(new CustomEvent("finsight:live-connection", { detail: { connected: false } }));
    };
  }, [showToast, status, user?.id]);

  return (
    <div className="relative isolate min-h-screen bg-background text-ink">
      <LiveBackground />
      {status !== "unauthenticated" && <MarketTicker />}
      <div className="relative z-50">
        <AppNavbar />
      </div>
      {status === "offline" && (
        <div role="status" className="relative z-10 border-b border-amber-300/70 bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-950 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100">
          Offline mode · this account’s last saved snapshot will load if available. Changes are disabled until you reconnect.
        </div>
      )}
      {status !== "unauthenticated" && <FinancialCopilot />}
      <main className="relative z-10 mx-auto w-full max-w-[var(--content-max)] px-[var(--space-page)] pb-24 pt-8 sm:pt-10">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.24, ease: "easeOut" }}
          >
            {outlet}
          </motion.div>
        </AnimatePresence>
      </main>
      <AppMobileNav />
      {status !== "unauthenticated" && <CommandPalette />}
    </div>
  );
}
