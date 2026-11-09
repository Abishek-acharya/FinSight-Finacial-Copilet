import { useCallback, useEffect, useState } from "react";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

interface SpendingPersona {
  available: boolean;
  reason?: string;
  persona?: string;
  summary?: string;
  months_analyzed?: number;
  months_in_pattern?: number;
  pattern_share_pct?: number;
  expense_to_income_pct?: number;
  method?: string;
  note?: string;
}

export function SpendingPersonaCard() {
  const [persona, setPersona] = useState<SpendingPersona | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPersona = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const result = await apiFetch<SpendingPersona>("/api/finance/spending-persona", { signal });
      setPersona(result);
      setError(null);
    } catch (loadError) {
      if (signal?.aborted) return;
      setError(loadError instanceof Error ? loadError.message : "The spending pattern could not be loaded.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let controller = new AbortController();
    void loadPersona(controller.signal);
    const refresh = () => {
      controller.abort();
      controller = new AbortController();
      void loadPersona(controller.signal);
    };
    window.addEventListener("finsight-finance-updated", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      controller.abort();
      window.removeEventListener("finsight-finance-updated", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [loadPersona]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-accent-primary/25 bg-accent-primary/10 text-accent-primary">
            <SparklesIcon className="size-5" aria-hidden="true" />
          </span>
          <div>
            <CardTitle>Your spending persona</CardTitle>
            <p className="mt-1 text-xs text-ink-muted">K-Means clustering of your monthly history.</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="animate-pulse space-y-3" aria-label="Loading spending persona" aria-busy="true">
            <div className="h-7 w-3/5 rounded bg-border/60" />
            <div className="h-3 w-full rounded bg-border/60" />
            <div className="h-3 w-4/5 rounded bg-border/60" />
          </div>
        ) : error ? (
          <div>
            <p role="alert" className="text-sm text-error">{error}</p>
            <button type="button" onClick={() => void loadPersona()} className="mt-3 text-xs font-semibold text-accent-secondary underline underline-offset-2">Try again</button>
          </div>
        ) : !persona?.available ? (
          <p className="text-sm text-ink-muted">{persona?.reason ?? "A spending persona is not available yet."}</p>
        ) : (
          <div>
            <p className="font-display text-2xl font-bold text-ink">{persona.persona}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{persona.summary}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-border bg-surface-secondary p-3">
              <div>
                <p className="text-[11px] text-ink-muted">Income used in this pattern</p>
                <p className="mt-1 text-sm font-semibold tabular-nums text-ink">{persona.expense_to_income_pct}%</p>
              </div>
              <div>
                <p className="text-[11px] text-ink-muted">Months in pattern</p>
                <p className="mt-1 text-sm font-semibold tabular-nums text-ink">{persona.months_in_pattern} of {persona.months_analyzed}</p>
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">
              {persona.method}. Pattern share: {persona.pattern_share_pct}%.
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">{persona.note}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
