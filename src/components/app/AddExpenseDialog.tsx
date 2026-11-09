import { PlusIcon } from "@heroicons/react/24/outline";
import { useMemo, useState, type FormEvent } from "react";
import { useFinanceStore } from "@/hooks/useFinanceStore";
import { financeStore } from "@/store/financeStore";
import { TRANSACTION_CATEGORIES } from "@/types/finance";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";

const incomeCategories = new Set([
  "Salary",
  "Freelance",
  "Business Income",
  "Interest",
  "Cashback",
  "Refund",
  "Other Income",
  "Transfers",
]);

function localDateValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function AddExpenseDialog() {
  const snapshot = useFinanceStore();
  const { status } = useAuth();
  const { showToast } = useToast();
  const categories = useMemo(() => TRANSACTION_CATEGORIES.filter((category) => !incomeCategories.has(category)), []);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food & Dining");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(localDateValue);
  const [accountId, setAccountId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const offline = status === "offline";

  const selectedAccountId = accountId || snapshot.accounts[0]?.id || "manual-cash";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await financeStore.addManualExpense({
        amount: parsedAmount,
        category,
        date,
        accountId: selectedAccountId,
        note: note.trim(),
      });
      setOpen(false);
      setAmount("");
      setNote("");
      setDate(localDateValue());
      setAccountId("");
      showToast({ kind: "success", title: "Expense added", description: "Your dashboard and financial ledger have been updated." });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The expense could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        disabled={offline}
        title={offline ? "Reconnect to add an expense" : undefined}
        leftIcon={<PlusIcon className="size-4" />}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="whitespace-nowrap px-2.5 sm:px-3"
        aria-label="Add expense"
      >
        <span className="hidden sm:inline">Add expense</span>
      </Button>
      <Modal
        open={open}
        onClose={() => {
          if (!saving) setOpen(false);
        }}
        title="Add an expense"
        description="Record a purchase in your ledger and sync it to your account."
        size="sm"
      >
        <form className="space-y-4" onSubmit={(event) => void submit(event)}>
          <label className="block text-sm font-medium text-ink">
            Amount (₹)
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="mt-1.5 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-ink"
              placeholder="250.00"
              autoFocus
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            Category
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-ink">
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-ink">
            Note
            <input
              type="text"
              maxLength={500}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="mt-1.5 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-ink"
              placeholder="Chai and snacks"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-ink">
              Date
              <input type="date" required value={date} onChange={(event) => setDate(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-ink" />
            </label>
            <label className="block text-sm font-medium text-ink">
              Account
              <select value={selectedAccountId} onChange={(event) => setAccountId(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-ink">
                {snapshot.accounts.length === 0 ? (
                  <option value="manual-cash">Cash wallet</option>
                ) : snapshot.accounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.name}{account.last4 ? ` ··${account.last4}` : ""}</option>
                ))}
              </select>
            </label>
          </div>
          {error && <p role="alert" className="text-sm text-error">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" disabled={saving} onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save expense</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
