import { useCallback, useEffect, useState } from "react";
import { ArrowPathIcon, ChartBarSquareIcon } from "@heroicons/react/24/outline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { apiFetch } from "@/lib/api";
import { formatCurrencyINR } from "@/utils/financeCalculations";

interface GoalSimulation {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  remaining_amount: number;
  horizon_months: number;
  probability_pct: number;
  median_additional_savings: number;
  months_analyzed: number;
}

interface GoalSimulationResponse {
  available: boolean;
  reason?: string;
  method?: string;
  simulations?: number;
  months_analyzed?: number;
  goals?: GoalSimulation[];
  note?: string;
}

function probabilityTone(probability: number): string {
  if (probability >= 75) return "text-success";
  if (probability >= 40) return "text-amber-600";
  return "text-error";
}

export function MonteCarloGoalsCard() {
  const [result, setResult] = useState<GoalSimulationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSimulation = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await apiFetch<GoalSimulationResponse>("/api/finance/goal-simulation", { signal });
      setResult(response);
      setError(null);
    } catch (loadError) {
      if (signal?.aborted) return;
      setError(loadError instanceof Error ? loadError.message : "The savings simulation could not be loaded.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let controller = new AbortController();
    void loadSimulation(controller.signal);
    const refresh = () => {
      controller.abort();
      controller = new AbortController();
      void loadSimulation(controller.signal);
    };
    window.addEventListener("finsight-finance-updated", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      controller.abort();
      window.removeEventListener("finsight-finance-updated", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [loadSimulation]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            <ChartBarSquareIcon className="size-5" aria-hidden="true" />
          </span>
          <div>
            <CardTitle>Savings goal scenarios</CardTitle>
            <p className="mt-1 text-xs text-ink-muted">10,000 resampled cash-flow paths · no market-return assumptions</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="animate-pulse space-y-3" aria-label="Simulating savings goals" aria-busy="true">
            <div className="h-7 w-3/5 rounded bg-border/60" />
            <div className="h-3 w-full rounded bg-border/60" />
            <div className="h-3 w-4/5 rounded bg-border/60" />
          </div>
        ) : error ? (
          <div>
            <p role="alert" className="text-sm text-error">{error}</p>
            <button type="button" onClick={() => void loadSimulation()} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent-secondary underline underline-offset-2">
              <ArrowPathIcon className="size-3.5" aria-hidden="true" /> Try again
            </button>
          </div>
        ) : !result?.available ? (
          <p className="text-sm text-ink-muted">{result?.reason ?? "Savings simulations are not available yet."}</p>
        ) : (
          <div className="space-y-4">
            {result.goals?.map((goal) => (
              <section key={goal.id || goal.name} className="rounded-xl border border-border bg-surface-secondary/70 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{goal.name}</p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {formatCurrencyINR(goal.remaining_amount)} remaining · {goal.horizon_months} month{goal.horizon_months === 1 ? "" : "s"}
                    </p>
                  </div>
                  <p className={`shrink-0 text-xl font-bold tabular-nums ${probabilityTone(goal.probability_pct)}`}>
                    {goal.probability_pct}%
                  </p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border/70" role="progressbar" aria-label={`${goal.name} simulated likelihood`} aria-valuenow={goal.probability_pct} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-accent-primary" style={{ width: `${goal.probability_pct}%` }} />
                </div>
                <p className="mt-2 text-[11px] text-ink-muted">
                  Median modeled surplus: {formatCurrencyINR(goal.median_additional_savings)} · target {formatCurrencyINR(goal.target_amount)}
                </p>
              </section>
            ))}
            <p className="text-[11px] leading-relaxed text-ink-muted">
              {result.simulations?.toLocaleString("en-IN")} simulations across {result.months_analyzed} completed history months. {result.note}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
