import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "@heroicons/react/20/solid";
import { formatPercent } from "@/lib/utils";

export interface TrendIndicatorProps {
  value: number;
  positiveIsGood?: boolean;
  label?: string;
  className?: string;
}

export function TrendIndicator({
  value,
  positiveIsGood = true,
  label,
  className,
}: TrendIndicatorProps) {
  const direction = value > 0 ? "up" : value < 0 ? "down" : "neutral";
  const favorable = direction === "neutral" || (value > 0) === positiveIsGood;
  const Icon = direction === "up" ? ArrowUpIcon : direction === "down" ? ArrowDownIcon : MinusIcon;
  const status = direction === "neutral" ? "unchanged" : favorable ? "favorable" : "unfavorable";

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${favorable ? "text-success" : "text-error"} ${className ?? ""}`}>
      <Icon aria-hidden="true" className="size-4" />
      <span>{formatPercent(value)}</span>
      <span className="sr-only">{status}{label ? ` ${label}` : ""}</span>
    </span>
  );
}