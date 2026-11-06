import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export interface ChartCardProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ChartCard({ title, description, action, children, className }: ChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent className="min-w-0 overflow-x-auto">{children}</CardContent>
    </Card>
  );
}