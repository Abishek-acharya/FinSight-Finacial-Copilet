import { BellIcon } from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";

const demoNotifications = [
  {
    title: "Cash flow update",
    message: "Your spending is 12% below your target this week.",
    time: "2h ago",
  },
  {
    title: "Budget alert",
    message: "Dining is trending 18% higher than planned.",
    time: "Today",
  },
  {
    title: "Savings milestone",
    message: "You are 2 payments away from reaching your emergency fund goal.",
    time: "Yesterday",
  },
];

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const unreadCount = useMemo(() => demoNotifications.length, []);

  return (
    <>
      <Button
        variant="ghost"
        size="md"
        onClick={() => setOpen(true)}
        className="relative gap-2 text-ink-muted hover:text-ink"
      >
        <BellIcon className="size-5" />
        <span className="hidden sm:inline">Alerts</span>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-accent-primary text-[10px] font-bold text-ink">
            {unreadCount}
          </span>
        )}
      </Button>

      <Drawer open={open} onClose={() => setOpen(false)} title="Notifications" description="Your latest FinSight updates">
        <div className="space-y-4">
          {demoNotifications.map((notification) => (
            <div key={notification.title} className="rounded-xl border border-border bg-surface-secondary p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{notification.title}</p>
                  <p className="mt-1 text-sm leading-6 text-ink-muted">{notification.message}</p>
                </div>
                <span className="shrink-0 text-[11px] uppercase tracking-[0.12em] text-ink-muted">
                  {notification.time}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Drawer>
    </>
  );
}
