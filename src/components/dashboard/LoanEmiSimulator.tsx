import { useState } from "react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { calculateEmi } from "@/services/financialEngine";
import { formatCurrencyINR } from "@/utils/financeCalculations";

interface LoanEmiSimulatorProps {
  monthlyCashFlow: number;
}

export function LoanEmiSimulator({ monthlyCashFlow }: LoanEmiSimulatorProps) {
  const [principal, setPrincipal] = useState(500_000);
  const [annualRate, setAnnualRate] = useState(10);
  const [years, setYears] = useState(3);
  const emi = calculateEmi(principal, annualRate, years);
  const remainingCashFlow = monthlyCashFlow - emi;

  return (
    <Card>
      <CardHeader>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-secondary">What-if planning</p>
        <CardTitle className="mt-1">Loan & EMI simulator</CardTitle>
        <p className="text-xs text-ink-muted">Estimate a fixed-rate monthly payment against your observed cash flow.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <label className="block text-sm font-medium text-ink">
          Loan amount <span className="float-right tabular-nums">{formatCurrencyINR(principal)}</span>
          <input
            type="range"
            min={50_000}
            max={5_000_000}
            step={25_000}
            value={principal}
            onChange={(event) => setPrincipal(Number(event.target.value))}
            className="mt-3 w-full accent-[#d97745]"
            aria-label="Loan amount"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-ink">
            Annual interest <span className="float-right tabular-nums">{annualRate.toFixed(1)}%</span>
            <input
              type="range"
              min={0}
              max={24}
              step={0.1}
              value={annualRate}
              onChange={(event) => setAnnualRate(Number(event.target.value))}
              className="mt-3 w-full accent-[#d97745]"
              aria-label="Annual interest rate"
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            Term <span className="float-right tabular-nums">{years} {years === 1 ? "year" : "years"}</span>
            <input
              type="range"
              min={1}
              max={30}
              step={1}
              value={years}
              onChange={(event) => setYears(Number(event.target.value))}
              className="mt-3 w-full accent-[#d97745]"
              aria-label="Loan term in years"
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface-secondary p-4">
            <p className="text-xs text-ink-muted">Estimated monthly EMI</p>
            <p className="mt-1 text-xl font-bold tabular-nums">{formatCurrencyINR(emi)}</p>
          </div>
          <div className={`rounded-xl border p-4 ${remainingCashFlow < 0 ? "border-error/30 bg-error/5" : "border-border bg-surface-secondary"}`}>
            <p className="text-xs text-ink-muted">Cash flow after EMI</p>
            <p className={`mt-1 text-xl font-bold tabular-nums ${remainingCashFlow < 0 ? "text-error" : "text-ink"}`}>{formatCurrencyINR(remainingCashFlow)}</p>
          </div>
        </div>
        <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-muted">
          <InformationCircleIcon className="mt-0.5 size-4 shrink-0" />
          Cash flow uses this month’s recorded income minus expenses ({formatCurrencyINR(monthlyCashFlow)}). Estimate excludes fees, taxes, and rate changes; it is not lending advice.
        </p>
      </CardContent>
    </Card>
  );
}
