import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircleIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatementUploadZone } from "@/components/statements/StatementUploadZone";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useFinanceStore } from "@/hooks/useFinanceStore";
import {
  ALLOWED_EXTENSIONS,
  getExtension,
  validateFile,
} from "@/services/processors/documentProcessor";
import { detectDuplicates } from "@/services/processors/duplicateDetector";
import { extractFromFile } from "@/services/processors/documentProcessor";
import { validateAll } from "@/services/processors/transactionValidator";
import { confirmImport, deleteStatement, recordFailedImport } from "@/services/statementService";
import type {
  ExtractedRow,
  ExtractionResult,
  ProcessingState,
  StatementFormData,
} from "@/types/statement";
import { financeStore, getFinanceStoreWarning, type ImportedStatementRecord } from "@/store/financeStore";
import { formatCurrencyINR } from "@/utils/financeCalculations";

interface QueuedFile {
  file: File;
  error?: string;
  progress: number;
}

const EMPTY_FORM: StatementFormData = {
  bank: "",
  accountNickname: "",
  accountType: "savings",
  accountNumberMasked: "",
  periodFrom: "",
  periodTo: "",
  currency: "INR",
};

type RowFilter = "all" | "income" | "expense" | "invalid" | "duplicate";

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function createAccountId(maskedNumber: string) {
  return `imported-${maskedNumber.replace(/\D/g, "") || "x"}`;
}

function maskedAccount(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? `•••• ${digits.slice(-4)}` : "";
}

function fileTypeLabel(file: File) {
  return getExtension(file.name).replace(".", "").toUpperCase();
}

function formatFileSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function dateLabel(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
}

export default function StatementsPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const snapshot = useFinanceStore();
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [form, setForm] = useState<StatementFormData>(EMPTY_FORM);
  const [phase, setPhase] = useState<"upload" | "processing" | "review">("upload");
  const [processing, setProcessing] = useState<ProcessingState>({
    step: "idle",
    progress: 0,
    message: "",
  });
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [rows, setRows] = useState<ExtractedRow[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<RowFilter>("all");
  const [editing, setEditing] = useState<ExtractedRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ImportedStatementRecord | null>(null);
  const [confirmImportOpen, setConfirmImportOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const loadedStatement = snapshot.statements.find((statement) => statement.status === "completed");
  const isUploadLocked = snapshot.transactions.length > 0 || loadedStatement !== undefined;

  const validRows = useMemo(
    () => rows.filter((row) => row.validationErrors.length === 0),
    [rows],
  );
  const selectedRows = useMemo(
    () => validRows.filter((row) => row.selected),
    [validRows],
  );
  const totals = useMemo(() => {
    const included = selectedRows;
    const income = included
      .filter((row) => row.type === "income")
      .reduce((sum, row) => sum + (row.amount ?? 0), 0);
    const expenses = included
      .filter((row) => row.type === "expense")
      .reduce((sum, row) => sum + (row.amount ?? 0), 0);
    return {
      valid: validRows.length,
      invalid: rows.length - validRows.length,
      duplicates: rows.filter((row) => row.isDuplicate).length,
      income,
      expenses,
      net: income - expenses,
    };
  }, [rows, selectedRows, validRows]);
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === "income" && row.type !== "income") return false;
      if (filter === "expense" && row.type !== "expense") return false;
      if (filter === "invalid" && row.validationErrors.length === 0) return false;
      if (filter === "duplicate" && !row.isDuplicate) return false;
      if (query && !`${row.description} ${row.merchant}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [rows, filter, search]);

  const setField = <K extends keyof StatementFormData>(key: K, value: StatementFormData[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const addFiles = (files: File[]) => {
    const additions: QueuedFile[] = [];
    for (const file of files) {
      const error = validateFile(file) ?? undefined;
      additions.push({ file, error, progress: 0 });
      if (error) showToast({ kind: "error", title: "File rejected", description: error });
    }
    if (additions.length) setQueue((current) => [...current, ...additions]);
  };

  const removeQueuedFile = (file: File) => {
    setQueue((current) => current.filter((entry) => entry.file !== file));
  };

  const startProcessing = async () => {
    const queued = queue.find((item) => !item.error);
    if (!queued) {
      showToast({ kind: "error", title: "No valid file", description: "Add a supported statement file first." });
      return;
    }
    if (!form.bank.trim() || !form.accountNumberMasked.trim()) {
      showToast({ kind: "error", title: "Missing details", description: "Bank name and account number are required." });
      return;
    }
    if (form.periodFrom && form.periodTo && form.periodFrom > form.periodTo) {
      showToast({ kind: "error", title: "Invalid statement period", description: "The start date must be before the end date." });
      return;
    }

    setPhase("processing");
    setActiveFile(queued.file);
    setExtraction(null);
    setRows([]);
    setWarnings([]);
    const updateStep = async (
      step: ProcessingState["step"],
      progress: number,
      message: string,
    ) => {
      setProcessing({ step, progress, message });
      setQueue((current) =>
        current.map((item) => item.file === queued.file ? { ...item, progress } : item),
      );
      await wait(100);
    };

    try {
      await updateStep("validating", 5, "Validating file…");
      const fileError = validateFile(queued.file);
      if (fileError) throw new Error(fileError);
      await updateStep("reading", 20, "Reading document…");
      await updateStep("extracting", 40, "Extracting transaction rows…");
      const result = await extractFromFile(queued.file);
      setExtraction(result);
      setWarnings(result.warnings);
      await updateStep("normalizing", 68, "Normalizing and categorizing…");
      const { rows: validated, summary } = validateAll(result.rows);
      setRows(validated);
      await updateStep("validating-rows", 82, "Validating transaction rows…");
      const accountId = createAccountId(maskedAccount(form.accountNumberMasked));
      const checkedRows = detectDuplicates(validated, snapshot.transactions, accountId);
      setRows(checkedRows);
      await updateStep("duplicate-check", 94, "Checking for duplicates…");
      setProcessing({
        step: "review",
        progress: 100,
        message: `Ready to review — ${summary.valid} valid, ${summary.invalid} invalid`,
      });
      setQueue((current) =>
        current.map((item) => item.file === queued.file ? { ...item, progress: 100 } : item),
      );
      setPhase("review");
    } catch (error) {
      const message = error instanceof Error ? error.message : "The file could not be processed.";
      setProcessing({ step: "error", progress: 0, message: "Processing failed", error: message });
      setQueue((current) =>
        current.map((item) => item.file === queued.file ? { ...item, progress: 0, error: message } : item),
      );
      try {
        recordFailedImport(queued.file.name, fileTypeLabel(queued.file), queued.file.size, message);
      } catch (saveError) {
        const saveMessage = saveError instanceof Error ? saveError.message : "Failure details could not be saved.";
        showToast({ kind: "error", title: "Could not save failed import", description: saveMessage });
      }
      setPhase("upload");
      showToast({ kind: "error", title: "Processing failed", description: message });
    }
  };

  const toggleRow = (localId: string) => {
    setRows((current) =>
      current.map((row) => row.localId === localId && row.validationErrors.length === 0
        ? { ...row, selected: !row.selected }
        : row),
    );
  };

  const toggleAllRows = (selected: boolean) => {
    setRows((current) =>
      current.map((row) =>
        row.validationErrors.length === 0 && (!selected || !row.isDuplicate)
          ? { ...row, selected }
          : row,
      ),
    );
  };

  const saveEdit = (updated: ExtractedRow) => {
    const validated = validateAll([updated]).rows[0];
    setRows((current) => {
      const changedRows = current.map((row) => row.localId === updated.localId ? validated : row);
      return detectDuplicates(
        changedRows,
        snapshot.transactions,
        createAccountId(maskedAccount(form.accountNumberMasked)),
      );
    });
    setEditing(null);
  };

  const doImport = async () => {
    if (!activeFile || !extraction) return;
    if (selectedRows.length === 0) {
      showToast({
        kind: "error",
        title: "No transactions selected",
        description: "Select at least one valid transaction to unlock financial pages.",
      });
      return;
    }
    try {
      const record = await confirmImport({
        statement: {
          ...form,
          accountNumberMasked: maskedAccount(form.accountNumberMasked),
        },
        rows,
        fileName: activeFile.name,
        fileType: extraction.format,
        fileSize: activeFile.size,
      });
      showToast({
        kind: "success",
        title: "Import successful",
        description: `${record.transactionCount} transaction(s) were saved to your account and added to your dashboard.`,
      });
      setQueue((current) => current.filter((item) => item.file !== activeFile));
      setActiveFile(null);
      setExtraction(null);
      setRows([]);
      setWarnings([]);
      setForm(EMPTY_FORM);
      setProcessing({ step: "done", progress: 100, message: "Import complete" });
      setPhase("upload");
      setConfirmImportOpen(false);
      window.dispatchEvent(new CustomEvent("finsight:analyze", {
        detail: { statementId: record.id },
      }));
      navigate("/app/assistant", {
        state: { analyzeAfterImport: true, statementId: record.id },
      });
    } catch (error) {
      showToast({
        kind: "error",
        title: "Import could not be saved",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const removeStatement = () => {
    if (!deleteTarget) return;
    try {
      deleteStatement(deleteTarget.id);
      showToast({
        kind: "success",
        title: "Statement removed",
        description: "Imported transactions remain in your dashboard.",
      });
      setDeleteTarget(null);
    } catch (error) {
      showToast({
        kind: "error",
        title: "Could not remove statement",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const resetFinanceData = async () => {
    try {
      await financeStore.reset();
      setConfirmResetOpen(false);
      showToast({
        kind: "success",
        title: "Finance data reset",
        description: "You can now import a new statement.",
      });
    } catch (error) {
      showToast({
        kind: "error",
        title: "Could not reset finance data",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const statementStats = {
    total: snapshot.statements.length,
    imported: snapshot.statements.filter((statement) => statement.status === "completed").length,
    failed: snapshot.statements.filter((statement) => statement.status === "failed").length,
  };
  const selectableRows = validRows.filter((row) => !row.isDuplicate);
  const progressSteps = [
    ["validating", "Validate"],
    ["reading", "Read file"],
    ["extracting", "Extract"],
    ["normalizing", "Categorize"],
    ["validating-rows", "Validate rows"],
    ["duplicate-check", "Check duplicates"],
    ["review", "Review"],
  ] as const;
  const currentStepIndex = progressSteps.findIndex(([step]) => step === processing.step);

  return (
    <PageContainer className="space-y-7">
      <PageHeader
        eyebrow="Statements"
        title="Import a statement"
        description="Extract transactions from a bank statement, review every row, then choose what to add to your dashboard."
      />

      <Alert variant="info">
        Files are processed in this browser and are not uploaded. Only confirmed transaction details and statement metadata are saved to your account.
      </Alert>
      {getFinanceStoreWarning() && (
        <Alert variant="warning">{getFinanceStoreWarning()}</Alert>
      )}

      {isUploadLocked ? (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="p-8 text-center sm:p-10">
            <CheckCircleIcon className="mx-auto mb-4 size-12 text-success" aria-hidden="true" />
            <h2 className="text-xl font-bold text-ink">Statement successfully loaded</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink-muted">
              Your financial pages use the imported transactions from this statement. To prevent totals from being counted twice, another file can only be imported after resetting your finance data.
            </p>
            {loadedStatement && (
              <div className="mx-auto mt-5 max-w-sm rounded-xl border border-success/20 bg-surface px-4 py-3 text-left">
                <p className="truncate text-sm font-semibold" title={loadedStatement.fileName}>{loadedStatement.fileName}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {loadedStatement.transactionCount} transactions · {formatCurrencyINR(loadedStatement.incomeTotal)} income · {formatCurrencyINR(loadedStatement.expenseTotal)} expenses
                </p>
              </div>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button onClick={() => navigate("/app/overview")}>View dashboard</Button>
              <Button variant="outline" onClick={() => setConfirmResetOpen(true)}>Reset &amp; upload new</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
      <>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(19rem,0.85fr)]">
        <Card>
          <CardHeader>
            <CardTitle>1. Choose statement files</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <StatementUploadZone onFiles={addFiles} disabled={phase === "processing"} />
            {queue.length > 0 && (
              <ul className="space-y-2" aria-label="Upload queue">
                {queue.map(({ file, error, progress }, index) => (
                  <li key={`${file.name}-${file.size}-${index}`} className={`flex items-center gap-3 rounded-xl border p-3 ${error ? "border-error/40" : "border-border"}`}>
                    <DocumentTextIcon className={`size-5 shrink-0 ${error ? "text-error" : "text-accent-secondary"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-ink-muted">
                        {formatFileSize(file.size)}
                        {error && <span className="text-error"> · {error}</span>}
                      </p>
                      {!error && progress > 0 && progress < 100 && (
                        <div className="mt-2 h-1 overflow-hidden rounded bg-surface-secondary">
                          <div className="h-full bg-accent-primary transition-all" style={{ width: `${progress}%` }} />
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={phase === "processing"}
                      onClick={() => removeQueuedFile(file)}
                      aria-label={`Remove ${file.name}`}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Bank or institution"
                required
                value={form.bank}
                onChange={(event) => setField("bank", event.target.value)}
                placeholder="e.g. HDFC Bank"
                disabled={phase === "processing"}
              />
              <Input
                label="Account nickname (optional)"
                value={form.accountNickname}
                onChange={(event) => setField("accountNickname", event.target.value)}
                placeholder="e.g. Everyday account"
                disabled={phase === "processing"}
              />
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Account type
                <select
                  className="min-h-11 rounded-lg border border-border bg-surface px-3 text-sm"
                  value={form.accountType}
                  onChange={(event) => setField("accountType", event.target.value as StatementFormData["accountType"])}
                  disabled={phase === "processing"}
                >
                  <option value="savings">Savings</option>
                  <option value="current">Current</option>
                  <option value="credit">Credit card</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <Input
                label="Account number or last four digits"
                required
                value={form.accountNumberMasked}
                onChange={(event) => setField("accountNumberMasked", event.target.value)}
                onBlur={() => setField("accountNumberMasked", maskedAccount(form.accountNumberMasked))}
                placeholder="•••• 1234"
                hint="Only the last four digits are retained."
                disabled={phase === "processing"}
              />
              <Input
                label="Statement period from"
                type="date"
                value={form.periodFrom}
                onChange={(event) => setField("periodFrom", event.target.value)}
                disabled={phase === "processing"}
              />
              <Input
                label="Statement period to"
                type="date"
                value={form.periodTo}
                onChange={(event) => setField("periodTo", event.target.value)}
                disabled={phase === "processing"}
              />
            </div>

            {phase === "processing" && (
              <div className="space-y-3 rounded-xl border border-border bg-surface-secondary/40 p-4" aria-live="polite">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{processing.message}</p>
                  <span className="text-xs tabular-nums text-ink-muted">{processing.progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-secondary">
                  <div className="h-full bg-accent-primary transition-all" style={{ width: `${processing.progress}%` }} />
                </div>
                <ol className="flex flex-wrap gap-x-3 gap-y-2">
                  {progressSteps.map(([step, label], index) => {
                    const complete = currentStepIndex > index || processing.step === "review";
                    const active = step === processing.step;
                    return (
                      <li key={step} className={`text-xs ${complete || active ? "font-semibold text-ink" : "text-ink-muted"}`}>
                        <span className="mr-1">{complete ? "✓" : `${index + 1}.`}</span>{label}
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            {processing.step === "error" && (
              <Alert variant="error">{processing.error ?? "The file could not be processed."}</Alert>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <p className="text-xs text-ink-muted">Supported: {ALLOWED_EXTENSIONS.join(", ")} · 15 MB maximum</p>
              <Button
                onClick={startProcessing}
                disabled={phase === "processing" || !queue.some((item) => !item.error)}
                loading={phase === "processing"}
              >
                Process next file
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {[
                ["Statements", statementStats.total],
                ["Imported", statementStats.imported],
                ["Failed", statementStats.failed],
              ].map(([label, count]) => (
                <div key={label} className="rounded-xl bg-surface-secondary/50 p-3 text-center">
                  <p className="text-xl font-bold tabular-nums">{count}</p>
                  <p className="text-[11px] text-ink-muted">{label}</p>
                </div>
              ))}
            </div>
            {snapshot.statements.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
                <DocumentTextIcon className="mx-auto size-8 text-ink-muted" />
                <p className="mt-2 text-sm font-semibold">No statements yet</p>
                <p className="mt-1 text-xs text-ink-muted">Imported statements will appear here.</p>
              </div>
            ) : (
              <ul className="max-h-[34rem] space-y-3 overflow-y-auto pr-1">
                {snapshot.statements.map((statement) => (
                  <li key={statement.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-start gap-3">
                      <span className="rounded-lg bg-accent-primary/10 p-2 text-accent-secondary">
                        {statement.status === "failed"
                          ? <ExclamationTriangleIcon className="size-5" />
                          : <DocumentTextIcon className="size-5" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="max-w-full truncate text-sm font-semibold">{statement.fileName}</p>
                          <Badge variant={statement.status === "completed" ? "success" : "error"}>
                            {statement.status}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-ink-muted">
                          {statement.bank} · {statement.maskedAccount} · {statement.transactionCount} transactions
                        </p>
                        <p className="mt-1 text-[11px] text-ink-muted">
                          {new Date(statement.uploadedAt).toLocaleDateString("en-IN")} · {formatFileSize(statement.fileSize)}
                        </p>
                        {statement.errorMessage && (
                          <p className="mt-1 text-xs text-error">{statement.errorMessage}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Delete ${statement.fileName} from history`}
                        onClick={() => setDeleteTarget(statement)}
                      >
                        <TrashIcon className="size-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {phase === "review" && extraction && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-accent-secondary">Review before import</p>
                <CardTitle className="mt-1">{activeFile?.name}</CardTitle>
                <p className="mt-1 text-sm text-ink-muted">
                  {extraction.format.toUpperCase()} · {rows.length} extracted rows · select the transactions to import.
                </p>
              </div>
              <Button variant="outline" onClick={() => setConfirmImportOpen(true)} disabled={selectedRows.length === 0}>
                Import {selectedRows.length} selected
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {warnings.map((warning) => (
              <Alert key={warning} variant="warning">{warning}</Alert>
            ))}
            {totals.duplicates > 0 && (
              <Alert variant="warning">
                Possible duplicates are unchecked by default. Review the matching rows; select one only if you intentionally want to import it again.
              </Alert>
            )}
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {[
                ["Valid rows", totals.valid, "text-success"],
                ["Invalid", totals.invalid, "text-error"],
                ["Duplicates", totals.duplicates, "text-warning"],
                ["Income", formatCurrencyINR(totals.income), "text-success"],
                ["Expenses", formatCurrencyINR(totals.expenses), "text-ink"],
                ["Net", formatCurrencyINR(totals.net), "text-accent-secondary"],
              ].map(([label, value, tone]) => (
                <div key={label} className="rounded-xl border border-border p-3">
                  <p className="text-[11px] text-ink-muted">{label}</p>
                  <p className={`mt-1 text-sm font-bold tabular-nums ${tone}`}>{value}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                aria-label="Search transaction description"
                placeholder="Search descriptions…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-surface p-1">
                {(["all", "income", "expense", "invalid", "duplicate"] as RowFilter[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize ${
                      filter === value ? "bg-accent-primary text-white" : "text-ink-muted hover:bg-surface-secondary"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            {filteredRows.length === 0 ? (
              <p className="rounded-xl bg-surface-secondary/40 px-4 py-8 text-center text-sm text-ink-muted">
                No rows match this search or filter.
              </p>
            ) : (
              <>
                <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-secondary/60 text-[11px] uppercase tracking-wide text-ink-muted">
                      <tr>
                        <th className="px-3 py-3">
                          <input
                            type="checkbox"
                            aria-label="Select all valid transactions"
                            checked={selectableRows.length > 0 && selectableRows.every((row) => row.selected)}
                            onChange={(event) => toggleAllRows(event.target.checked)}
                          />
                        </th>
                        <th className="px-3 py-3">Date</th>
                        <th className="px-3 py-3">Description</th>
                        <th className="px-3 py-3">Category</th>
                        <th className="px-3 py-3 text-right">Amount</th>
                        <th className="px-3 py-3">Status</th>
                        <th className="px-3 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredRows.map((row) => (
                        <tr key={row.localId} className={row.validationErrors.length ? "bg-error/[0.04]" : row.isDuplicate ? "bg-warning/[0.04]" : ""}>
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={row.selected}
                              disabled={row.validationErrors.length > 0}
                              aria-label={`Select ${row.description}`}
                              onChange={() => toggleRow(row.localId)}
                            />
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-xs">{dateLabel(row.date)}</td>
                          <td className="max-w-xs px-3 py-3">
                            <p className="truncate text-xs font-medium" title={row.description}>{row.description || "Missing description"}</p>
                            {row.validationErrors.length > 0 && <p className="mt-1 text-[10px] text-error">{row.validationErrors.join(" · ")}</p>}
                            {row.isDuplicate && <p className="mt-1 text-[10px] text-warning">Possible duplicate; review before selecting.</p>}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-xs">{row.category}</td>
                          <td className={`whitespace-nowrap px-3 py-3 text-right text-xs tabular-nums ${row.type === "income" ? "text-success" : ""}`}>
                            {row.amount === null ? "—" : `${row.type === "income" ? "+" : "−"}${formatCurrencyINR(row.amount)}`}
                          </td>
                          <td className="px-3 py-3">
                            {row.isDuplicate
                              ? <Badge variant="warning">Duplicate</Badge>
                              : row.validationErrors.length
                                ? <Badge variant="error">Invalid</Badge>
                                : <Badge variant="success">Ready</Badge>}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <Button variant="ghost" size="sm" onClick={() => setEditing(row)} aria-label={`Edit ${row.description}`}>
                              <PencilSquareIcon className="size-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ul className="space-y-2 md:hidden">
                  {filteredRows.map((row) => (
                    <li key={row.localId} className="rounded-xl border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <label className="flex min-w-0 items-start gap-2">
                          <input
                            className="mt-1"
                            type="checkbox"
                            checked={row.selected}
                            disabled={row.validationErrors.length > 0}
                            onChange={() => toggleRow(row.localId)}
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">{row.description || "Missing description"}</span>
                            <span className="block text-xs text-ink-muted">{dateLabel(row.date)} · {row.category}</span>
                            {row.validationErrors.length > 0 && <span className="mt-1 block text-xs text-error">{row.validationErrors.join(" · ")}</span>}
                            {row.isDuplicate && <span className="mt-1 block text-xs text-warning">Possible duplicate</span>}
                          </span>
                        </label>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold tabular-nums">{row.amount === null ? "—" : formatCurrencyINR(row.amount)}</p>
                          <Button variant="ghost" size="sm" onClick={() => setEditing(row)}>Edit</Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div className="flex flex-wrap justify-between gap-3 border-t border-border pt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setPhase("upload");
                  setActiveFile(null);
                  setExtraction(null);
                  setRows([]);
                  setWarnings([]);
                }}
              >
                Cancel review
              </Button>
              <Button onClick={() => setConfirmImportOpen(true)} disabled={selectedRows.length === 0}>
                Import {selectedRows.length} selected transaction(s)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      </>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Edit transaction"
        description="Correct the extracted values. The row will be validated again when saved."
        size="md"
      >
        {editing && (
          <EditTransactionForm
            row={editing}
            categories={snapshot.categories.filter((category) => category.active).map((category) => category.name)}
            onCancel={() => setEditing(null)}
            onSave={saveEdit}
          />
        )}
      </Modal>

      <ConfirmationDialog
        open={confirmImportOpen}
        onClose={() => setConfirmImportOpen(false)}
        onConfirm={doImport}
        title="Confirm statement import"
        description={`Add ${selectedRows.length} selected transaction(s) to your dashboard? Invalid rows are excluded. Possible duplicates are unchecked by default; any duplicate you explicitly select will be imported. Only extracted data and masked account details are saved to your account.`}
        confirmLabel="Confirm import"
      />
      <ConfirmationDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={removeStatement}
        title="Delete statement history?"
        description="This removes the statement record only. Transactions already imported from it remain in your dashboard."
        confirmLabel="Delete record"
        destructive
      />
      <ConfirmationDialog
        open={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        onConfirm={resetFinanceData}
        title="Reset imported finance data?"
        description="This clears the imported statement, transactions, accounts, budgets, and goals saved to your account so you can import a different file."
        confirmLabel="Reset data"
        destructive
      />
    </PageContainer>
  );
}

function EditTransactionForm({
  row,
  categories,
  onCancel,
  onSave,
}: {
  row: ExtractedRow;
  categories: string[];
  onCancel: () => void;
  onSave: (row: ExtractedRow) => void;
}) {
  const [draft, setDraft] = useState(row);
  const update = <K extends keyof ExtractedRow>(key: K, value: ExtractedRow[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };
  const dateValue = draft.date ? draft.date.slice(0, 10) : "";

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const amount = draft.amount === null ? null : Number(draft.amount);
        onSave({
          ...draft,
          amount,
          date: draft.date ? new Date(`${dateValue}T12:00:00`).toISOString() : null,
          debit: draft.type === "expense" ? amount : null,
          credit: draft.type === "income" ? amount : null,
          merchant: draft.description.trim().slice(0, 80) || "Unknown",
        });
      }}
    >
      <Input
        label="Date"
        type="date"
        value={dateValue}
        onChange={(event) => update("date", event.target.value ? `${event.target.value}T12:00:00.000Z` : null)}
      />
      <Input
        label="Description"
        value={draft.description}
        onChange={(event) => update("description", event.target.value)}
        required
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Type
          <select
            className="min-h-11 rounded-lg border border-border bg-surface px-3"
            value={draft.type ?? ""}
            onChange={(event) => update("type", event.target.value ? event.target.value as ExtractedRow["type"] : null)}
          >
            <option value="">Choose type</option>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </label>
        <Input
          label="Amount"
          type="number"
          min="0.01"
          step="0.01"
          value={draft.amount ?? ""}
          onChange={(event) => update("amount", event.target.value === "" ? null : Number(event.target.value))}
          required
        />
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Category
        <select
          className="min-h-11 rounded-lg border border-border bg-surface px-3"
          value={draft.category}
          onChange={(event) => update("category", event.target.value)}
        >
          {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          {!categories.includes(draft.category) && <option value={draft.category}>{draft.category} (inactive)</option>}
        </select>
      </label>
      {draft.isDuplicate && (
        <Alert variant="warning">This row matches an existing or another imported transaction. It will remain flagged for your review.</Alert>
      )}
      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save changes</Button>
      </div>
    </form>
  );
}
