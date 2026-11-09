import { useCallback, useEffect, useState } from "react";
import { ArrowPathIcon, ClipboardDocumentListIcon } from "@heroicons/react/24/outline";
import { apiFetch } from "@/lib/api";
import { getStoredSession } from "@/lib/auth/authService";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";

interface ActivityLog {
  event_type: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: number;
}

export default function ActivityHistoryPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async (signal?: AbortSignal) => {
    const session = getStoredSession();
    if (!session) {
      setLoading(false);
      setError("Sign in to view account activity.");
      return;
    }
    setLoading(true);
    try {
      const result = await apiFetch<{ logs: ActivityLog[] }>("/api/finance/activity", { signal }, session.accessToken);
      setLogs(result.logs ?? []);
      setError(null);
    } catch (loadError) {
      if (signal?.aborted) return;
      setError(loadError instanceof Error ? loadError.message : "Activity history could not be loaded.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadLogs(controller.signal);
    return () => controller.abort();
  }, [loadLogs]);

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        eyebrow="Account security"
        title="Activity history"
        description="Review recent sign-ins and recorded finance-data changes for this account."
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ArrowPathIcon className="size-4" />}
            onClick={() => void loadLogs()}
            loading={loading}
          >
            Refresh
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-primary/10 text-accent-secondary">
              <ClipboardDocumentListIcon className="size-5" aria-hidden="true" />
            </span>
            <div>
              <CardTitle>Recent account events</CardTitle>
              <p className="mt-1 text-sm text-ink-muted">Showing up to 100 most recent records. Events are logged by the application; device, browser, and IP details are not collected.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && logs.length === 0 ? (
            <div className="animate-pulse space-y-3" aria-label="Loading activity history" aria-busy="true">
              <div className="h-16 rounded-xl bg-border/50" />
              <div className="h-16 rounded-xl bg-border/50" />
              <div className="h-16 rounded-xl bg-border/50" />
            </div>
          ) : error ? (
            <Alert variant="error">{error}</Alert>
          ) : logs.length === 0 ? (
            <p className="rounded-xl bg-surface-secondary p-5 text-sm text-ink-muted">No account activity has been recorded yet.</p>
          ) : (
            <ol className="space-y-2">
              {logs.map((log, index) => (
                <li key={`${log.event_type}-${log.created_at}-${index}`} className="flex flex-col justify-between gap-2 rounded-xl border border-border/70 bg-surface px-4 py-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-sm font-medium text-ink">{log.description}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-ink-muted">{log.event_type.replace(/_/g, " ")}</p>
                  </div>
                  <time className="shrink-0 text-xs text-ink-muted" dateTime={new Date(log.created_at * 1000).toISOString()}>
                    {new Date(log.created_at * 1000).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
