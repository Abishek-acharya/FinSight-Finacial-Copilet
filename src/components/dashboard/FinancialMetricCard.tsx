import { ArrowDownRightIcon, ArrowUpRightIcon } from "@heroicons/react/20/solid";
import { motion, useReducedMotion } from "framer-motion";
import { AnimatedNumber } from "@/components/animation/AnimatedNumber";
import { cn } from "@/lib/utils";
import { formatCurrencyINR } from "@/utils/financeCalculations";
import type { PointerEvent } from "react";

export function FinancialMetricCard({
  label,
  value,
  numericValue,
  delta,
  tone,
  className,
}: {
  label: string;
  value: string;
  numericValue?: number;
  delta: string;
  tone: "positive" | "negative" | "neutral";
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const toneStyles = {
    positive: "bg-[#eaf7f1] text-[#2d7a5a]",
    negative: "bg-[#fae5e1] text-[#9b2c26]",
    neutral: "bg-surface-secondary text-ink",
  };

  const trendPath = tone === "positive"
    ? "M2 18 C8 14, 14 10, 20 6 S30 5, 38 4"
    : tone === "negative"
      ? "M2 4 C8 8, 14 12, 20 14 S30 20, 38 18"
      : "M2 12 C8 10, 14 12, 20 11 S30 10, 38 8";

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--beam-x", `${event.clientX - bounds.left}px`);
    event.currentTarget.style.setProperty("--beam-y", `${event.clientY - bounds.top}px`);
  };

  return (
    <motion.div
      whileHover={reduceMotion ? undefined : { y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      onPointerMove={handlePointerMove}
      className={`beam-card rounded-[24px] border border-border/70 bg-surface/85 p-6 shadow-[0_2px_10px_-4px_rgba(37,37,34,0.07)] backdrop-blur-md transition-[border-color,box-shadow] duration-300 hover:border-accent-primary/30 hover:shadow-[0_8px_30px_-4px_rgba(217,119,69,0.15)] ${className ?? ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-ink-muted">{label}</p>
          <p className={cn("financial-number mt-4 text-3xl font-bold", label.toLowerCase().includes("saving") && "text-luxury-gold")}>
            {numericValue === undefined
              ? value
              : <AnimatedNumber value={numericValue} format={formatCurrencyINR} duration={1100} />}
          </p>
        </div>
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold", toneStyles[tone])}>
          {tone === "negative"
            ? <ArrowDownRightIcon className="size-3" />
            : tone === "positive"
              ? <ArrowUpRightIcon className="size-3" />
              : null}
          {delta}
        </span>
      </div>

      <svg viewBox="0 0 40 20" className="mt-4 h-8 w-full" preserveAspectRatio="none" aria-hidden="true">
        <path d={trendPath} fill="none" stroke={tone === "negative" ? "#d97706" : tone === "positive" ? "#2d7a5a" : "#8a7d66"} strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </motion.div>
  );
}
