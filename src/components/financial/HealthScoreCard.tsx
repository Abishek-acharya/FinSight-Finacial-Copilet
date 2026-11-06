import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export interface HealthScoreCardProps {
  score: number;
  title?: string;
  description?: string;
  className?: string;
}

export function HealthScoreCard({
  score,
  title = "Financial health",
  description,
  className,
}: HealthScoreCardProps) {
  const boundedScore = Math.min(100, Math.max(0, score));
  const tone = boundedScore >= 70 ? "text-success" : boundedScore >= 40 ? "text-warning" : "text-error";
  const label = boundedScore >= 70 ? "Good" : boundedScore >= 40 ? "Fair" : "Needs attention";

  return (
    <Card className={className}>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="flex items-center gap-5">
        <div
          role="img"
          aria-label={`Financial health score ${Math.round(boundedScore)} out of 100`}
          className="relative grid size-24 shrink-0 place-items-center rounded-full"
          style={{ background: `conic-gradient(var(--color-accent-primary) ${boundedScore}%, var(--color-surface-secondary) 0)` }}
        >
          <div className="grid size-[4.25rem] place-items-center rounded-full bg-surface font-display text-xl font-bold tabular-nums">
            {Math.round(boundedScore)}
          </div>
        </div>
        <div>
          <p className={cn("font-semibold", tone)}>{label}</p>
          {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
        </div>
      </CardContent>
    </Card>
  );
}