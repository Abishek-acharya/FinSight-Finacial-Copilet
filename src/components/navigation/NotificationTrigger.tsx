import { BellIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";

export interface NotificationTriggerProps {
  count?: number;
  onClick: () => void;
  label?: string;
}

export function NotificationTrigger({ count = 0, onClick, label = "Notifications" }: NotificationTriggerProps) {
  const accessibleLabel = count > 0 ? `${label}, ${count} unread` : label;
  return (
    <Button variant="ghost" size="icon" aria-label={accessibleLabel} onClick={onClick} className="relative">
      <BellIcon className="size-5" aria-hidden="true" />
      {count > 0 && (
        <span aria-hidden="true" className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-accent-primary px-1 text-[10px] font-bold leading-4 text-ink">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Button>
  );
}