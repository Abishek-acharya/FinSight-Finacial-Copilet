import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { Transaction } from "@/types/finance";
import type { UserCategory } from "@/store/financeStore";
import { formatINR } from "@/utils/financeCalculations";

export function TransactionDetailDrawer({
  transaction,
  categories,
  onClose,
  onSave,
  onDelete,
}: {
  transaction: Transaction | null;
  categories: UserCategory[];
  onClose: () => void;
  onSave: (id: string, patch: Partial<Transaction>) => void;
  onDelete: (transaction: Transaction) => void;
}) {
  const [draft, setDraft] = useState<Transaction | null>(transaction);
  useEffect(() => setDraft(transaction), [transaction]);
  const update = <K extends keyof Transaction>(key: K, value: Transaction[K]) => {
    setDraft((current) => current ? { ...current, [key]: value } : current);
  };

  return (
    <Drawer
      open={transaction !== null}
      onClose={onClose}
      title="Transaction details"
      description="Edit the transaction and record whether it needs follow-up."
    >
      {draft && transaction && (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSave(transaction.id, {
              merchant: draft.merchant.trim(),
              description: draft.description?.trim() || draft.merchant.trim(),
              category: draft.category,
              type: draft.type,
              amount: Number(draft.amount),
              date: new Date(`${draft.date.slice(0, 10)}T12:00:00`).toISOString(),
              note: draft.note?.trim() || "",
              categorizationSource: "manual",
              reviewStatus: draft.reviewStatus ?? "reviewed",
              originalCategory: draft.originalCategory ?? (draft.category !== transaction.category ? transaction.category : undefined),
            });
          }}
        >
          <div className="rounded-xl bg-surface-secondary/50 p-4">
            <p className="text-xs text-ink-muted">{transaction.id}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{formatINR(transaction.amount)}</p>
            <p className="text-xs text-ink-muted">
              {transaction.categorizationSource ?? "import"} categorization
              {transaction.confidence !== undefined ? ` · ${Math.round(transaction.confidence * 100)}% rule confidence` : ""}
            </p>
          </div>
          {transaction.confidence !== undefined && (
            <div>
              <div className="mb-1 flex justify-between text-xs text-ink-muted">
                <span>Deterministic rule confidence</span>
                <span>{Math.round(transaction.confidence * 100)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-secondary">
                <div className="h-full rounded-full bg-accent-primary" style={{ width: `${Math.min(100, Math.max(0, transaction.confidence * 100))}%` }} />
              </div>
              <p className="mt-1 text-[10px] text-ink-muted">This score comes from matching text rules, not an AI model.</p>
            </div>
          )}
          <Input label="Merchant" value={draft.merchant} onChange={(event) => update("merchant", event.target.value)} required />
          <Input
            label="Description"
            value={draft.description ?? ""}
            onChange={(event) => update("description", event.target.value)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Date"
              type="date"
              value={draft.date.slice(0, 10)}
              onChange={(event) => update("date", event.target.value ? `${event.target.value}T12:00:00.000Z` : draft.date)}
              required
            />
            <Input
              label="Amount"
              type="number"
              min="0.01"
              step="0.01"
              value={draft.amount}
              onChange={(event) => update("amount", Number(event.target.value))}
              required
            />
          </div>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Transaction type
            <select className="min-h-11 rounded-lg border border-border bg-surface px-3" value={draft.type} onChange={(event) => update("type", event.target.value as Transaction["type"])}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Category
            <select className="min-h-11 rounded-lg border border-border bg-surface px-3" value={draft.category} onChange={(event) => update("category", event.target.value)}>
              {categories.filter((category) => category.active).map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
              {!categories.some((category) => category.name === draft.category && category.active) && (
                <option value={draft.category}>{draft.category} (inactive or legacy)</option>
              )}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Review status
            <select className="min-h-11 rounded-lg border border-border bg-surface px-3" value={draft.reviewStatus ?? ((draft.confidence ?? 1) < 0.6 ? "pending" : "reviewed")} onChange={(event) => update("reviewStatus", event.target.value as Transaction["reviewStatus"])}>
              <option value="pending">Needs review</option>
              <option value="reviewed">Reviewed</option>
              <option value="flagged">Flagged</option>
            </select>
          </label>
          <Textarea label="Note" rows={3} value={draft.note ?? ""} onChange={(event) => update("note", event.target.value)} placeholder="Add a personal note…" />
          {transaction.originalCategory && transaction.originalCategory !== transaction.category && (
            <Alert variant="info">Previously categorized as {transaction.originalCategory}.</Alert>
          )}
          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-between">
            <Button type="button" variant="destructive" onClick={() => onDelete(transaction)}>Delete</Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit">Save changes</Button>
            </div>
          </div>
        </form>
      )}
    </Drawer>
  );
}
