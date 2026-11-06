import type { ReactNode } from "react";
import { ArrowTrendingDownIcon, ArrowTrendingUpIcon } from "@heroicons/react/24/outline";
import { Card, CardContent } from "@/components/ui/Card";
import { AnimatedNumber } from "@/components/animation/AnimatedNumber";
import { formatCurrency } from "@/lib/utils";
import { TrendIndicator } from "./TrendIndicator";

export interface MetricCardProps {
  label: string;
  value: number | string;
  currency?: string;
  change?: number;
  changeLabel?: string;
  positiveIsGood?: boolean;
  icon?: ReactNode;
  className?: string;
}

export function MetricCard({
  label,
  value,
  currency,
  change,
  changeLabel = "vs. last month",
  positiveIsGood = true,
  icon,
  className,
}: MetricCardProps) {
  return (
    <Card className={className}>
      <CardContent className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-muted">{label}</p>
          <p className="mt-2 truncate font-display text-2xl font-bold tracking-tight tabular-nums sm:text-3xl">
            {typeof value === "number"
              ? <AnimatedNumber value={value} format={(number) => currency ? formatCurrency(number, currency) : new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(number)} />
              : value}
          </p>
          {typeof change === "number" && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <TrendIndicator value={change} positiveIsGood={positiveIsGood} />
              <span className="text-xs text-ink-muted">{changeLabel}</span>
            </div>
          )}
        </div>
        {icon && <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#f8e9df] text-accent-secondary" aria-hidden="true">{icon}</span>}
      </CardContent>
    </Card>
  );
}

export function MetricDirectionIcon({ direction }: { direction: "up" | "down" }) {
  const Icon = direction === "up" ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;
  return <Icon aria-hidden="true" className="size-5" />;
}