import { PencilSquareIcon, FlagIcon } from "@heroicons/react/24/outline";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Account, Transaction } from "@/types/finance";
import type { UserCategory } from "@/store/financeStore";
import { formatINR } from "@/utils/financeCalculations";

function getStatus(transaction: Transaction) {
  return transaction.reviewStatus ?? ((transaction.confidence ?? 1) < 0.6 ? "pending" : "reviewed");
}

function statusBadge(transaction: Transaction) {
  const status = getStatus(transaction);
  if (status === "flagged") return <Badge variant="error">Flagged</Badge>;
  if (status === "pending") return <Badge variant="warning">Needs review</Badge>;
  return <Badge variant="success">Reviewed</Badge>;
}

function confidenceLabel(transaction: Transaction) {
  if (transaction.confidence === undefined) return "Imported";
  return `${Math.round(transaction.confidence * 100)}% rule confidence`;
}

export function TransactionTable({
  transactions,
  accounts,
  categories,
  selectedIds,
  onToggle,
  onToggleAll,
  onOpen,
  onToggleFlag,
}: {
  transactions: Transaction[];
  accounts: Account[];
  categories: UserCategory[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (selected: boolean) => void;
  onOpen: (transaction: Transaction) => void;
  onToggleFlag: (transaction: Transaction) => void;
}) {
  const selectable = transactions.filter((transaction) => transaction.reviewStatus !== "flagged");
  const allSelected = selectable.length > 0 && selectable.every((transaction) => selectedIds.has(transaction.id));
  const categoryColors = new Map(categories.map((category) => [category.name, category.color]));
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="bg-surface-secondary/60 text-[11px] uppercase tracking-wide text-ink-muted">
          <tr>
            <th className="w-10 px-3 py-3">
              <input
                type="checkbox"
                aria-label="Select all transactions on this page"
                checked={allSelected}
                onChange={(event) => onToggleAll(event.target.checked)}
              />
            </th>
            <th className="px-3 py-3">Date / Merchant</th>
            <th className="px-3 py-3">Category</th>
            <th className="px-3 py-3">Account</th>
            <th className="px-3 py-3 text-right">Amount</th>
            <th className="px-3 py-3">Review</th>
            <th className="px-3 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {transactions.map((transaction) => {
            const account = accounts.find((item) => item.id === transaction.accountId);
            return (
              <tr
                key={transaction.id}
                className={`transition-colors hover:bg-surface-secondary/30 ${getStatus(transaction) === "flagged" ? "bg-error/[0.03]" : ""}`}
              >
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    aria-label={`Select ${transaction.merchant}`}
                    checked={selectedIds.has(transaction.id)}
                    onChange={() => onToggle(transaction.id)}
                  />
                </td>
                <td className="max-w-[18rem] px-3 py-3">
                  <button type="button" className="block max-w-full text-left" onClick={() => onOpen(transaction)}>
                    <span className="block truncate text-xs text-ink-muted">
                      {new Date(transaction.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                    <span className="block truncate text-sm font-semibold text-ink">{transaction.merchant}</span>
                    <span className="block truncate text-xs text-ink-muted">{transaction.description ?? transaction.originalDescription ?? "—"}</span>
                  </button>
                </td>
                <td className="px-3 py-3">
                  <span className="inline-flex items-center gap-2 whitespace-nowrap text-xs">
                    <span className="size-2 rounded-full" style={{ backgroundColor: categoryColors.get(transaction.category) ?? "#94a3b8" }} />
                    {transaction.category}
                  </span>
                </td>
                <td className="px-3 py-3 text-xs text-ink-muted">{account?.name ?? transaction.accountId}</td>
                <td className={`whitespace-nowrap px-3 py-3 text-right text-sm font-semibold tabular-nums ${transaction.type === "income" ? "text-success" : "text-ink"}`}>
                  {transaction.type === "income" ? "+" : "−"}{formatINR(transaction.amount)}
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-col items-start gap-1">
                    {statusBadge(transaction)}
                    <span className="text-[10px] text-ink-muted">{confidenceLabel(transaction)}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-right">
                  <div className="inline-flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => onToggleFlag(transaction)} aria-label={getStatus(transaction) === "flagged" ? "Unflag transaction" : "Flag transaction"}>
                      <FlagIcon className={`size-4 ${getStatus(transaction) === "flagged" ? "text-error" : ""}`} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onOpen(transaction)} aria-label={`Edit ${transaction.merchant}`}>
                      <PencilSquareIcon className="size-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function TransactionCards({
  transactions,
  accounts,
  selectedIds,
  onToggle,
  onOpen,
  onToggleFlag,
}: {
  transactions: Transaction[];
  accounts: Account[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onOpen: (transaction: Transaction) => void;
  onToggleFlag: (transaction: Transaction) => void;
}) {
  return (
    <ul className="space-y-3">
      {transactions.map((transaction) => {
        const status = getStatus(transaction);
        const account = accounts.find((item) => item.id === transaction.accountId);
        return (
          <li key={transaction.id} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-start gap-3">
              <input
                className="mt-1"
                type="checkbox"
                aria-label={`Select ${transaction.merchant}`}
                checked={selectedIds.has(transaction.id)}
                onChange={() => onToggle(transaction.id)}
              />
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpen(transaction)}>
                <span className="block truncate text-sm font-semibold">{transaction.merchant}</span>
                <span className="mt-0.5 block truncate text-xs text-ink-muted">{transaction.description ?? "—"}</span>
                <span className="mt-1 block text-xs text-ink-muted">
                  {new Date(transaction.date).toLocaleDateString("en-IN")} · {transaction.category} · {account?.name ?? transaction.accountId}
                </span>
              </button>
              <div className="shrink-0 text-right">
                <p className={`text-sm font-bold tabular-nums ${transaction.type === "income" ? "text-success" : "text-ink"}`}>
                  {transaction.type === "income" ? "+" : "−"}{formatINR(transaction.amount)}
                </p>
                <Button variant="ghost" size="sm" onClick={() => onToggleFlag(transaction)} aria-label={status === "flagged" ? "Unflag transaction" : "Flag transaction"}>
                  <FlagIcon className={`size-4 ${status === "flagged" ? "text-error" : ""}`} />
                </Button>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              {statusBadge(transaction)}
              <span className="text-[10px] text-ink-muted">{confidenceLabel(transaction)}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
