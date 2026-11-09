import { useCallback, useEffect, useState } from "react";
import { CpuChipIcon } from "@heroicons/react/24/outline";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatCurrencyINR } from "@/utils/financeCalculations";

interface LiveForecast {
  available: boolean;
  reason?: string;
  method?: string;
  predicted_expense?: number;
  accuracy?: number;
  trend?: "up" | "down";
  range_lower?: number;
  range_upper?: number;
  months_used?: number;
  note?: string;
}

export function LiveMLForecastCard() {
  const [forecast, setForecast] = useState<LiveForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadForecast = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const result = await apiFetch<LiveForecast>("/api/finance/live-forecast", { signal });
      setForecast(result);
      setError(null);
    } catch (loadError) {
      if (signal?.aborted) return;
      setError(loadError instanceof Error ? loadError.message : "The live forecast could not be loaded.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let controller = new AbortController();
    void loadForecast(controller.signal);
    const refresh = () => {
      controller.abort();
      controller = new AbortController();
      void loadForecast(controller.signal);
    };
    window.addEventListener("finsight-finance-updated", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      controller.abort();
      window.removeEventListener("finsight-finance-updated", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [loadForecast]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
            <CpuChipIcon className="size-5" aria-hidden="true" />
          </span>
          <div>
            <CardTitle>Live ML forecast</CardTitle>
            <p className="mt-1 text-xs text-ink-muted">Scikit-learn estimate, refreshed when saved transactions change.</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="animate-pulse space-y-3" aria-label="Loading forecast" aria-busy="true">
            <div className="h-8 w-2/5 rounded bg-border/60" />
            <div className="h-3 w-3/4 rounded bg-border/60" />
            <div className="h-3 w-1/2 rounded bg-border/60" />
          </div>
        ) : error ? (
          <p role="alert" className="text-sm text-error">{error}</p>
        ) : !forecast?.available ? (
          <div>
            <p className="text-sm text-ink-muted">{forecast?.reason ?? "A forecast is not available yet."}</p>
            <button type="button" onClick={() => void loadForecast()} className="mt-3 text-xs font-semibold text-accent-secondary underline underline-offset-2">Try again</button>
          </div>
        ) : (
          <div>
            <p className="font-display text-3xl font-bold tabular-nums text-ink">{formatCurrencyINR(forecast.predicted_expense ?? 0)}</p>
            <p className={`mt-1 text-sm font-medium ${forecast.trend === "up" ? "text-error" : "text-success"}`}>
              Trend {forecast.trend === "up" ? "↑ increasing" : "↓ decreasing"}
            </p>
            <p className="mt-3 text-xs text-ink-muted">
              Estimated range {formatCurrencyINR(forecast.range_lower ?? 0)}–{formatCurrencyINR(forecast.range_upper ?? 0)} · {forecast.months_used} months used
            </p>
            {typeof forecast.accuracy === "number" && (
              <p className="mt-2 text-xs text-ink-muted">
                In-sample R²: {forecast.accuracy.toFixed(1)}% · model fit, not future accuracy
              </p>
            )}
            <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">{forecast.note ?? "Estimate only; actual spending may differ."}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
