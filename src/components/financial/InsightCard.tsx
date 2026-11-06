import type { ReactNode } from "react";
import { LightBulbIcon } from "@heroicons/react/24/outline";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface InsightCardProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
  className?: string;
}

export function InsightCard({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  className,
}: InsightCardProps) {
  return (
    <Card className={cn("border-[#eed9cb] bg-[#fffaf6]", className)}>
      <CardContent className="flex items-start gap-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#f8e9df] text-accent-secondary" aria-hidden="true">
          {icon ?? <LightBulbIcon className="size-5" />}
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="mt-1.5 text-sm text-ink-muted">{description}</p>
          {actionLabel && onAction && (
            <Button variant="ghost" size="sm" onClick={onAction} className="mt-3 -ml-3 text-accent-secondary hover:text-accent-secondary">
              {actionLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}