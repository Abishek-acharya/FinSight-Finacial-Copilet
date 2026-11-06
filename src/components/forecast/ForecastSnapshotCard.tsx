import { Link } from "react-router-dom";
import { ArrowTrendingUpIcon } from "@heroicons/react/24/outline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useForecast } from "@/hooks/useForecast";
import { DEFAULT_FORECAST_FILTERS } from "@/types/forecast";
import { formatINR } from "@/utils/financeCalculations";

export function ForecastSnapshotCard() {
  const data = useForecast(DEFAULT_FORECAST_FILTERS);
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <ArrowTrendingUpIcon className="size-4 text-accent-secondary" />
          Spending forecast
        </CardTitle>
        <Link to="/app/forecast" className="text-xs font-semibold text-accent-secondary hover:underline">
          Details →
        </Link>
      </CardHeader>
      <CardContent>
        {data.expenseForecast ? (
          <>
            <p className="text-xs text-ink-muted">Estimated expenses · next 30 days</p>
            <p className="mt-1 text-xl font-bold tabular-nums">{formatINR(data.expenseForecast.estimate)}</p>
            <p className="mt-1 text-xs text-ink-muted">
              Historical variability range: {formatINR(data.expenseForecast.lower)}–{formatINR(data.expenseForecast.upper)}
            </p>
            <Badge variant="outline" className="mt-3">Statistical estimate · not ML</Badge>
          </>
        ) : (
          <p className="text-sm text-ink-muted">{data.reason ?? "Import at least three complete months of expenses to see an estimate."}</p>
        )}
      </CardContent>
    </Card>
  );
}
