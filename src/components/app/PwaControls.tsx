import { useEffect, useState } from "react";
import { ArrowDownTrayIcon, BellIcon, BellSlashIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaControls() {
  const { showToast } = useToast();
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches,
  );
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">(() =>
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported",
  );

  useEffect(() => {
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      showToast({ kind: "success", title: "FinSight installed", description: "You can now open FinSight from your home screen." });
    };
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [showToast]);

  const install = async () => {
    if (!installPrompt) {
      showToast({
        kind: "info",
        title: "Install FinSight",
        description: /iphone|ipad|ipod/i.test(navigator.userAgent)
          ? "In Safari, tap Share, then Add to Home Screen."
          : "Use your browser’s Install app or Add to Home Screen option.",
      });
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (choice.outcome === "accepted") setInstalled(true);
  };

  const enableNotifications = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setNotificationPermission("unsupported");
      showToast({ kind: "info", title: "Notifications unavailable", description: "This browser does not support service-worker notifications." });
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === "granted") {
      showToast({ kind: "success", title: "Notifications enabled", description: "Live alerts can appear while FinSight is open." });
    } else {
      showToast({ kind: "info", title: "Notifications not enabled", description: "You can allow notifications later in your browser’s site settings." });
    }
  };

  return (
    <div className="flex items-center gap-1">
      {!installed && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void install()}
          className="size-9 text-ink-muted hover:text-ink"
          aria-label="Install FinSight app"
          title="Install FinSight"
        >
          <ArrowDownTrayIcon className="size-4" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => void enableNotifications()}
        disabled={notificationPermission === "granted" || notificationPermission === "unsupported"}
        className="size-9 text-ink-muted hover:text-ink"
        aria-label={notificationPermission === "granted" ? "Notifications enabled" : "Enable browser notifications"}
        title={notificationPermission === "granted" ? "Browser notifications enabled" : "Enable browser notifications"}
      >
        {notificationPermission === "denied" ? <BellSlashIcon className="size-4" /> : <BellIcon className="size-4" />}
      </Button>
    </div>
  );
}
