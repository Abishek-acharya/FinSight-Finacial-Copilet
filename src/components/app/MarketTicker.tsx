import { useCallback, useEffect, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

interface MarketQuote {
  symbol: string;
  price: number;
  change: number;
  change_percent: number;
  latest_trading_day: string;
}

interface MarketTickerResponse {
  available: boolean;
  reason?: string;
  provider?: string;
  fetched_at?: string;
  note?: string;
  quotes: MarketQuote[];
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: value < 10 ? 4 : 2,
  }).format(value);
}

export function MarketTicker() {
  const { status } = useAuth();
  const [data, setData] = useState<MarketTickerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadQuotes = useCallback(async (signal?: AbortSignal) => {
    if (status === "offline") {
      setError("Market quotes are unavailable offline.");
      return;
    }
    try {
      const result = await apiFetch<MarketTickerResponse>("/api/market/ticker", { signal });
      setData(result);
      setError(null);
    } catch (loadError) {
      if (signal?.aborted) return;
      setError(loadError instanceof Error ? loadError.message : "Market quotes could not be loaded.");
    }
  }, [status]);

  useEffect(() => {
    if (status === "offline") {
      setError("Market quotes are unavailable offline.");
      return;
    }
    const controller = new AbortController();
    void loadQuotes(controller.signal);
    const interval = window.setInterval(() => void loadQuotes(), 15 * 60 * 1000);
    const handleFocus = () => void loadQuotes();
    window.addEventListener("focus", handleFocus);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadQuotes, status]);

  const quoteCount = data?.quotes.length ?? 0;
  return (
    <section aria-label="Market quotes" className="w-full border-b border-border/70 bg-surface-secondary/70">
      <div className="mx-auto flex min-h-9 max-w-[var(--content-max)] items-center gap-4 overflow-x-auto px-[var(--space-page)] py-1.5 text-[11px]">
        <span className="shrink-0 font-semibold uppercase tracking-[0.14em] text-ink-muted">Market snapshot</span>
        {quoteCount ? (
          <>
            <ul className="flex min-w-0 items-center gap-5">
              {data?.quotes.map((quote) => {
                const TrendIcon = quote.change > 0 ? ArrowUpIcon : quote.change < 0 ? ArrowDownIcon : MinusIcon;
                const changeTone = quote.change > 0 ? "text-success" : quote.change < 0 ? "text-error" : "text-ink-muted";
                return (
                  <li key={quote.symbol} className="flex shrink-0 items-center gap-1.5" title={`Latest trading day: ${quote.latest_trading_day || "not provided"}`}>
                    <span className="font-semibold text-ink">{quote.symbol}</span>
                    <span className="tabular-nums text-ink">{formatPrice(quote.price)}</span>
                    <span className={`inline-flex items-center gap-0.5 tabular-nums ${changeTone}`}>
                      <TrendIcon className="size-3" aria-hidden="true" />
                      {quote.change_percent >= 0 ? "+" : ""}{quote.change_percent.toFixed(2)}%
                    </span>
                  </li>
                );
              })}
            </ul>
            <span className="ml-auto hidden shrink-0 text-[10px] text-ink-muted sm:inline">
              {data?.provider} · may be delayed · {data?.fetched_at ? `updated ${new Date(data.fetched_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : ""}
            </span>
          </>
        ) : (
          <span role="status" className="truncate text-ink-muted">
            {error ?? data?.reason ?? "Loading quotes…"} {data?.provider ? `· ${data.provider}` : ""}
          </span>
        )}
      </div>
    </section>
  );
}
