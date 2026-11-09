import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownTrayIcon, ClipboardDocumentListIcon } from "@heroicons/react/24/outline";
import { apiFetch } from "@/lib/api";
import { getStoredSession } from "@/lib/auth/authService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { financeStore } from "@/store/financeStore";
import { useAuth } from "@/hooks/useAuth";

interface ActivityLog {
  event_type: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: number;
}

export default function SettingsPage() {
  const { status } = useAuth();
  const offline = status === "offline";
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logError, setLogError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    const loadLogs = async () => {
      const session = getStoredSession();
      if (!session) {
        setLoading(false);
        return;
      }
      try {
        const result = await apiFetch<{ logs: ActivityLog[] }>("/api/finance/activity", {}, session.accessToken);
        setLogs(result.logs ?? []);
        setLogError(null);
      } catch (error) {
        setLogError(error instanceof Error ? error.message : "Activity history could not be loaded.");
      } finally {
        setLoading(false);
      }
    };

    void loadLogs();
  }, []);

  const deleteFinanceData = async () => {
    const session = getStoredSession();
    if (!session) {
      setDeleteError("Sign in again before deleting your financial data.");
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    setDeleteSuccess(false);
    try {
      await apiFetch<void>("/api/finance/snapshot", { method: "DELETE" }, session.accessToken);
      await financeStore.clearLocalData();
      setLogs([]);
      setDeleteOpen(false);
      setDeleteSuccess(true);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Financial data could not be deleted.");
    } finally {
      setDeleting(false);
    }
  };

  const downloadMyData = async () => {
    const session = getStoredSession();
    if (!session) {
      setExportError("Sign in again before exporting your account data.");
      return;
    }
    setExporting(true);
    setExportError(null);
    try {
      const data = await apiFetch<Record<string, unknown>>("/api/finance/export", {}, session.accessToken);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "finsight-data-export.json";
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Your account data could not be exported.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Account controls"
        description="Manage your account, review recent activity, and keep your financial data protected."
      />

      <Card>
        <CardHeader>
          <CardTitle>Financial data & privacy</CardTitle>
          <p className="text-sm text-ink-muted">
            Your finance snapshot is stored in this app’s SQLite database and a per-account browser cache. Assistant financial calculations use deterministic commands; statement images submitted for OCR are processed by the configured app backend.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-ink-muted">
            Delete removes saved transactions, accounts, budgets, goals, imported statement records, alerts, and the local finance cache for this account. Your sign-in account and security activity history remain.
          </p>
          {deleteError && <p role="alert" className="text-sm text-error">{deleteError}</p>}
          {exportError && <p role="alert" className="text-sm text-error">{exportError}</p>}
          {deleteSuccess && <p role="status" className="text-sm text-success">Your financial data and local cache have been deleted.</p>}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              leftIcon={<ArrowDownTrayIcon className="size-4" />}
              disabled={offline}
              loading={exporting}
              onClick={() => void downloadMyData()}
            >
              Download my data
            </Button>
          <Button variant="destructive" disabled={offline} onClick={() => setDeleteOpen(true)}>Delete my financial data</Button>
          </div>
          {offline && <p className="text-sm text-ink-muted">Reconnect before deleting account data from the server.</p>}
          <p className="text-xs text-ink-muted">The JSON export contains your account profile, finance snapshot, and up to 1,000 recent activity events. It excludes credentials and active session tokens.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Recent activity</CardTitle>
            <Link to="/app/activity" className="inline-flex items-center gap-1 text-xs font-semibold text-accent-secondary hover:underline">
              <ClipboardDocumentListIcon className="size-4" aria-hidden="true" />
              View history
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-0 pb-4">
          {loading ? (
            <div className="space-y-3 p-6">
              <div className="h-4 w-1/2 animate-pulse rounded bg-border/60" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-border/60" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-border/60" />
            </div>
          ) : logs.length > 0 ? (
            <div className="space-y-2 p-6">
              {logs.map((log) => (
                <div key={`${log.event_type}-${log.created_at}`} className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-surface px-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{log.description}</p>
                    <p className="mt-1 text-xs text-ink-muted uppercase tracking-[0.12em]">{log.event_type}</p>
                  </div>
                  <span className="shrink-0 text-xs text-ink-muted">
                    {new Date(log.created_at * 1000).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          ) : logError ? (
            <p role="alert" className="p-6 text-sm text-error">{logError}</p>
          ) : (
            <p className="p-6 text-sm text-ink-muted">No recent account activity has been recorded yet.</p>
          )}
        </CardContent>
      </Card>
      <ConfirmationDialog
        open={deleteOpen}
        onClose={() => {
          if (!deleting) setDeleteOpen(false);
        }}
        onConfirm={() => void deleteFinanceData()}
        title="Delete all financial data?"
        description="This permanently deletes your saved finance snapshot, uploaded statement fingerprints, and alerts from the database, then clears the browser cache. Your login account is not deleted."
        confirmLabel="Delete financial data"
        destructive
        loading={deleting}
      />
    </PageContainer>
  );
}
