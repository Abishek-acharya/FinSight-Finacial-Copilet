import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusIcon, WalletIcon } from "@heroicons/react/24/outline";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/layout/PageHeader";
import { Progress } from "@/components/ui/Progress";
import { useBudgetData } from "@/hooks/useBudgetData";
import { useFinanceStore } from "@/hooks/useFinanceStore";
import { useToast } from "@/components/ui/Toast";
import { calculateScenario, formatProjection, goalProgress } from "@/services/budget/savingsCalculations";
import { suggestAllocation } from "@/services/budget/budgetCalculations";
import { financeStore } from "@/store/financeStore";
import type { BudgetPlan, GoalCategory, GoalPriority, SavingsGoal } from "@/types/budget";
import { formatINR } from "@/utils/financeCalculations";

type PlannerTab = "budget" | "goals" | "planner";
type GoalForm = {
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  category: GoalCategory;
  priority: GoalPriority;
  description: string;
};

const EMPTY_GOAL: GoalForm = {
  name: "",
  targetAmount: 0,
  currentAmount: 0,
  targetDate: "",
  category: "Emergency Fund",
  priority: "medium",
  description: "",
};

const GOAL_CATEGORIES: GoalCategory[] = [
  "Emergency Fund", "Education", "Travel", "Vehicle", "Home Purchase", "Debt Repayment", "Gadget", "Custom",
];

function monthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function Metric({ label, value, note, tone }: { label: string; value: string; note: string; tone?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">{label}</p>
        <p className={`mt-1 text-lg font-bold tabular-nums ${tone ?? "text-ink"}`}>{value}</p>
        <p className="mt-1 text-xs text-ink-muted">{note}</p>
      </CardContent>
    </Card>
  );
}

function BudgetEditor({
  open,
  onClose,
  plan,
  month,
  categories,
  transactions,
}: {
  open: boolean;
  onClose: () => void;
  plan: BudgetPlan | null;
  month: string;
  categories: string[];
  transactions: ReturnType<typeof useFinanceStore>["transactions"];
}) {
  const [name, setName] = useState(plan?.name ?? `Monthly Budget · ${month}`);
  const [total, setTotal] = useState(plan?.totalAmount ?? 0);
  const [description, setDescription] = useState(plan?.description ?? "");
  const [allocations, setAllocations] = useState<Record<string, number>>(
    Object.fromEntries(plan?.categoryAllocations.map((item) => [item.category, item.amount]) ?? []),
  );
  const [error, setError] = useState("");

  const selectedPlan: BudgetPlan = {
    id: plan?.id ?? `plan-${month}`,
    name,
    month,
    totalAmount: total,
    currency: "INR",
    categoryAllocations: Object.entries(allocations)
      .filter(([, amount]) => amount > 0)
      .map(([category, amount]) => ({ category, amount })),
    createdAt: plan?.createdAt ?? "",
    updatedAt: plan?.updatedAt ?? "",
    description: description.trim() || undefined,
  };
  const categoriesToShow = [...new Set([
    ...categories,
    ...(plan?.categoryAllocations.map((allocation) => allocation.category) ?? []),
  ])];
  const allocated = selectedPlan.categoryAllocations.reduce((sum, item) => sum + item.amount, 0);
  const suggestions = useMemo(() => plan ? suggestAllocation(plan, transactions) : [], [plan, transactions]);

  const save = () => {
    setError("");
    try {
      financeStore.upsertBudgetPlan(selectedPlan);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save budget.");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={plan ? "Edit budget" : "Create budget"} description="Allocate a monthly spending plan by category." size="lg">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">Budget name
            <input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </label>
          <label className="text-sm font-medium">Month
            <input type="month" value={month} readOnly className="mt-1 h-10 w-full rounded-lg border border-border bg-surface-secondary px-3 text-sm" />
          </label>
          <label className="text-sm font-medium sm:col-span-2">Total budget (₹)
            <input type="number" min="1" step="1" value={total || ""} onChange={(event) => setTotal(Number(event.target.value) || 0)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </label>
        </div>
        <label className="block text-sm font-medium">Description (optional)
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </label>
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Category allocations</h3>
            <p className={`text-xs ${allocated > total ? "text-error" : "text-ink-muted"}`}>
              {formatINR(allocated)} allocated · {formatINR(total - allocated)} remaining
            </p>
          </div>
          <div className="max-h-60 space-y-2 overflow-auto rounded-lg border border-border p-3">
            {categoriesToShow.map((category) => (
              <label key={category} className="flex items-center justify-between gap-3 text-sm">
                <span>{category}</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  aria-label={`${category} allocation`}
                  value={allocations[category] || ""}
                  onChange={(event) => setAllocations((current) => ({ ...current, [category]: Math.max(0, Number(event.target.value) || 0) }))}
                  className="h-9 w-32 rounded-md border border-border bg-background px-2 text-right tabular-nums"
                />
              </label>
            ))}
          </div>
          {plan && suggestions.length > 0 && (
            <div className="mt-3 rounded-lg bg-surface-secondary/50 p-3">
              <p className="text-xs font-semibold">3-month spending averages · suggestion only</p>
              <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                {suggestions.map((item) => (
                  <li key={item.category} className="flex justify-between gap-2 text-xs text-ink-muted">
                    <span>{item.category}</span><span>{formatINR(item.suggested)}</span>
                  </li>
                ))}
              </ul>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => setAllocations(Object.fromEntries(suggestions.map((item) => [item.category, item.suggested]).filter(([, amount]) => Number(amount) > 0)))}>
                Use suggested amounts
              </Button>
            </div>
          )}
        </div>
        {error && <p role="alert" className="text-sm text-error">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!name.trim() || total <= 0 || allocated > total}>{plan ? "Save changes" : "Create budget"}</Button>
        </div>
      </div>
    </Modal>
  );
}

function GoalEditor({
  open,
  initial,
  onClose,
}: {
  open: boolean;
  initial: SavingsGoal | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState<GoalForm>(initial ? {
    name: initial.name,
    targetAmount: initial.targetAmount,
    currentAmount: initial.currentAmount,
    targetDate: initial.targetDate?.slice(0, 10) ?? "",
    category: initial.category,
    priority: initial.priority,
    description: initial.description ?? "",
  } : EMPTY_GOAL);
  const [error, setError] = useState("");
  const change = <K extends keyof GoalForm>(key: K, value: GoalForm[K]) => setForm((current) => ({ ...current, [key]: value }));

  const save = () => {
    setError("");
    const goal = {
      name: form.name.trim(),
      targetAmount: form.targetAmount,
      currentAmount: form.currentAmount,
      targetDate: form.targetDate ? new Date(`${form.targetDate}T12:00:00`).toISOString() : null,
      category: form.category,
      priority: form.priority,
      status: form.currentAmount >= form.targetAmount ? "completed" : initial?.status ?? "active",
      description: form.description.trim() || undefined,
    };
    try {
      if (initial) financeStore.updateSavingsGoal(initial.id, goal);
      else financeStore.addSavingsGoal(goal);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save goal.");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit savings goal" : "Create savings goal"} size="md">
      <div className="space-y-3">
        <label className="block text-sm font-medium">Goal name
          <input value={form.name} onChange={(event) => change("name", event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-medium">Target (₹)
            <input type="number" min="1" value={form.targetAmount || ""} onChange={(event) => change("targetAmount", Number(event.target.value) || 0)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </label>
          <label className="text-sm font-medium">Already saved (₹)
            <input type="number" min="0" value={form.currentAmount || ""} onChange={(event) => change("currentAmount", Number(event.target.value) || 0)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </label>
          <label className="text-sm font-medium">Target date
            <input type="date" value={form.targetDate} onChange={(event) => change("targetDate", event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </label>
          <label className="text-sm font-medium">Priority
            <select value={form.priority} onChange={(event) => change("priority", event.target.value as GoalPriority)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
          </label>
        </div>
        <label className="block text-sm font-medium">Category
          <select value={form.category} onChange={(event) => change("category", event.target.value as GoalCategory)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
            {GOAL_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium">Description (optional)
          <textarea value={form.description} onChange={(event) => change("description", event.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </label>
        {error && <p role="alert" className="text-sm text-error">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!form.name.trim() || form.targetAmount <= 0 || form.currentAmount < 0}>{initial ? "Save changes" : "Create goal"}</Button>
        </div>
      </div>
    </Modal>
  );
}

function ContributionDialog({ goal, onClose }: { goal: SavingsGoal | null; onClose: () => void }) {
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const add = () => {
    if (!goal) return;
    try {
      financeStore.addContribution(goal.id, { amount, date: new Date(`${date}T12:00:00`).toISOString(), note: note.trim() || undefined });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add contribution.");
    }
  };
  return (
    <Modal open={goal !== null} onClose={onClose} title={goal ? `Add contribution · ${goal.name}` : "Add contribution"} size="sm">
      {goal && <div className="space-y-3">
        <p className="text-xs text-ink-muted">{formatINR(goal.currentAmount)} of {formatINR(goal.targetAmount)} saved</p>
        <label className="block text-sm font-medium">Amount (₹)
          <input type="number" min="1" value={amount || ""} onChange={(event) => setAmount(Number(event.target.value) || 0)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
        </label>
        <label className="block text-sm font-medium">Date
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
        </label>
        <label className="block text-sm font-medium">Note (optional)
          <input value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
        </label>
        {error && <p role="alert" className="text-sm text-error">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={add} disabled={amount <= 0 || !date}>Add contribution</Button>
        </div>
      </div>}
    </Modal>
  );
}

export default function BudgetGoalsPage() {
  const snapshot = useFinanceStore();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(monthKey());
  const [tab, setTab] = useState<PlannerTab>("budget");
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [contributionGoalId, setContributionGoalId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: "goal" | "budget"; id: string; name: string } | null>(null);
  const [monthlySavings, setMonthlySavings] = useState(5000);
  const [scenarioGoalId, setScenarioGoalId] = useState("");
  const [scenarioTarget, setScenarioTarget] = useState(100000);
  const [scenarioCurrent, setScenarioCurrent] = useState(0);
  const [scenarioDate, setScenarioDate] = useState("");

  const data = useBudgetData(selectedMonth);
  const goals = snapshot.savingsGoals;
  const activeExpenseCategories = snapshot.categories
    .filter((category) => category.active && category.type === "expense")
    .map((category) => category.name);
  const budgetPlan = data.plan;
  const editingGoal = goals.find((goal) => goal.id === editingGoalId) ?? null;
  const contributionGoal = goals.find((goal) => goal.id === contributionGoalId) ?? null;
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const scenario = useMemo(() => calculateScenario({
    monthlySavings,
    targetAmount: scenarioTarget,
    currentAmount: scenarioCurrent,
    targetDate: scenarioDate ? new Date(`${scenarioDate}T12:00:00`).toISOString() : null,
  }), [monthlySavings, scenarioTarget, scenarioCurrent, scenarioDate]);

  const onError = (title: string, cause: unknown) => showToast({
    kind: "error",
    title,
    description: cause instanceof Error ? cause.message : "Please try again.",
  });
  const confirmDelete = () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.kind === "budget") financeStore.deleteBudgetPlan(deleteTarget.id);
      else financeStore.deleteSavingsGoal(deleteTarget.id);
      showToast({ kind: "success", title: deleteTarget.kind === "budget" ? "Budget deleted" : "Goal deleted" });
      setDeleteTarget(null);
      setConfirmDeleteOpen(false);
    } catch (cause) {
      onError("Could not delete item", cause);
    }
  };
  const selectScenarioGoal = (id: string) => {
    setScenarioGoalId(id);
    const goal = goals.find((item) => item.id === id);
    if (!goal) return;
    setScenarioTarget(goal.targetAmount);
    setScenarioCurrent(goal.currentAmount);
    setScenarioDate(goal.targetDate?.slice(0, 10) ?? "");
    const progress = goalProgress(goal);
    if (progress.requiredMonthly) setMonthlySavings(Math.round(progress.requiredMonthly));
  };

  const tabs: Array<{ id: PlannerTab; label: string }> = [
    { id: "budget", label: "Budget" },
    { id: "goals", label: "Savings goals" },
    { id: "planner", label: "Planner" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Planning"
        title="Budget & Goals"
        description="Plan category spending, track savings goals, and review transparent, data-based suggestions."
        actions={<Badge variant="outline">Calculated locally · Not financial advice</Badge>}
      />
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="budget-month" className="text-sm font-medium">Planning month</label>
        <input id="budget-month" type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="h-10 rounded-lg border border-border bg-surface px-3 text-sm" />
        {tab === "budget" && <Button size="sm" onClick={() => setBudgetOpen(true)}><WalletIcon className="size-4" />{budgetPlan ? "Edit budget" : "Create budget"}</Button>}
        {tab === "goals" && <Button size="sm" onClick={() => { setEditingGoalId(null); setGoalOpen(true); }}><PlusIcon className="size-4" />New goal</Button>}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Metric label="Total budget" value={formatINR(data.summary.totalBudget)} note={selectedMonth} />
        <Metric label="Amount spent" value={formatINR(data.summary.totalSpentThisMonth)} note="Excludes transfers" />
        <Metric label="Remaining" value={formatINR(data.summary.totalRemaining)} note="Against selected budget" tone={data.summary.totalRemaining < 0 ? "text-error" : "text-success"} />
        <Metric label="Utilization" value={`${data.summary.utilizationPct.toFixed(0)}%`} note="Of selected budget" />
        <Metric label="Savings goals" value={`${data.summary.totalGoals}`} note={`${formatINR(data.summary.totalGoalSaved)} saved so far`} />
        <Metric label="Goal progress" value={`${data.summary.goalProgressPct.toFixed(0)}%`} note={`of ${formatINR(data.summary.totalGoalTarget)} target`} />
      </div>
      <div className="flex gap-2 overflow-x-auto border-b border-border" role="tablist" aria-label="Budget and goals sections">
        {tabs.map((item) => <button key={item.id} role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)} className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium ${tab === item.id ? "border-accent-primary text-ink" : "border-transparent text-ink-muted hover:text-ink"}`}>{item.label}</button>)}
      </div>

      {tab === "budget" && (
        <div className="space-y-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle>{budgetPlan?.name ?? "No budget for this month"}</CardTitle>
                  <p className="mt-1 text-xs text-ink-muted">{budgetPlan ? `${formatINR(budgetPlan.totalAmount)} planned` : "Create a plan to track category spending."}</p>
                </div>
                <div className="flex gap-2">
                  {budgetPlan && <Button size="sm" variant="ghost" onClick={() => { setDeleteTarget({ kind: "budget", id: budgetPlan.id, name: budgetPlan.name }); setConfirmDeleteOpen(true); }}>Delete</Button>}
                  <Button size="sm" variant="outline" onClick={() => setBudgetOpen(true)}>{budgetPlan ? "Edit" : "Create budget"}</Button>
                </div>
              </CardHeader>
              <CardContent>
                {!data.utilization ? <div className="py-8 text-center text-sm text-ink-muted">No budget plan for {selectedMonth}.</div>
                  : data.utilization.categories.length === 0 ? <div className="py-8 text-center text-sm text-ink-muted">Add category allocations to this plan.</div>
                    : <div className="space-y-3">
                      {data.utilization.categories.map((category) => (
                        <button key={category.category} onClick={() => navigate(`/app/transactions?category=${encodeURIComponent(category.category)}`)} className="w-full rounded-xl border border-border p-3 text-left hover:bg-surface-secondary/40">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">{category.category}</span>
                            <Badge variant={category.status === "over" ? "error" : category.status === "warning" ? "warning" : "success"}>{category.utilization.toFixed(0)}%</Badge>
                          </div>
                          <Progress value={category.utilization} className="mt-2" indicatorClassName={category.status === "over" ? "bg-error" : category.status === "warning" ? "bg-warning" : undefined} />
                          <div className="mt-1 flex justify-between gap-2 text-xs text-ink-muted">
                            <span>{formatINR(category.spent)} / {formatINR(category.allocated)} · {category.transactionCount} transactions</span>
                            <span className={category.remaining < 0 ? "text-error" : "text-success"}>{category.remaining >= 0 ? `${formatINR(category.remaining)} left` : `${formatINR(-category.remaining)} over`}</span>
                          </div>
                        </button>
                      ))}
                    </div>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Budget alerts</CardTitle>
                <Badge variant={data.alerts.length ? "warning" : "outline"}>{data.alerts.length}</Badge>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-xs text-ink-muted">Local-only threshold alerts at 70%, 85%, and 100%. No notifications are sent externally.</p>
                {data.alerts.length === 0 ? <p className="py-4 text-sm text-ink-muted">No active alerts for this month.</p>
                  : <ul className="space-y-2">{data.alerts.slice(0, 6).map((alert) => <li key={alert.id} className={`flex items-start gap-2 rounded-lg border p-3 text-xs ${alert.severity === "error" ? "border-error/30 bg-error/5" : alert.severity === "warning" ? "border-warning/30 bg-warning/5" : "border-border"}`}>
                    <p className="min-w-0 flex-1">{alert.message}</p><button aria-label={`Dismiss ${alert.category} alert`} onClick={() => { try { financeStore.dismissAlert(alert.id); } catch (cause) { onError("Could not dismiss alert", cause); } }} className="text-ink-muted hover:text-ink">×</button>
                  </li>)}</ul>}
                {snapshot.dismissedAlerts.length > 0 && <Button variant="ghost" size="sm" className="mt-2" onClick={() => { try { financeStore.resetDismissedAlerts(); } catch (cause) { onError("Could not restore alerts", cause); } }}>Restore dismissed alerts</Button>}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle>Budget history</CardTitle><p className="text-sm text-ink-muted">Planned versus actual consumption for saved plans.</p></CardHeader>
            <CardContent>
              {data.history.length === 0 ? <p className="py-3 text-sm text-ink-muted">No saved budget history yet.</p> : <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead><tr className="border-b border-border text-left text-xs text-ink-muted">
                    <th className="pb-2">Month</th><th className="pb-2 text-right">Planned</th><th className="pb-2 text-right">Actual</th><th className="pb-2 text-right">Remaining</th><th className="pb-2 text-right">Over-budget categories</th><th className="pb-2 text-right">Net savings</th>
                  </tr></thead>
                  <tbody className="divide-y divide-border">{data.history.map((row) => <tr key={row.monthKey}>
                    <th scope="row" className="py-3 text-left font-medium">{row.monthLabel}</th><td className="py-3 text-right tabular-nums">{formatINR(row.planned)}</td><td className="py-3 text-right tabular-nums">{formatINR(row.actual)}</td><td className={`py-3 text-right tabular-nums ${row.remaining < 0 ? "text-error" : "text-success"}`}>{formatINR(row.remaining)}</td><td className="py-3 text-right">{row.overBudgetCategories}</td><td className="py-3 text-right tabular-nums">{formatINR(row.savingsAchieved)}</td>
                  </tr>)}</tbody>
                </table>
              </div>}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "goals" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.goalProgress.map((progress) => {
            const goal = progress.goal;
            return <Card key={goal.id}>
              <CardHeader className="flex-row items-start justify-between gap-2">
                <div><CardTitle>{goal.name}</CardTitle><p className="mt-1 text-xs text-ink-muted">{goal.category} · {goal.priority} priority</p></div>
                <Badge variant={goal.status === "completed" ? "success" : goal.status === "paused" ? "outline" : progress.isOverdue ? "error" : "accent"}>{goal.status === "active" && progress.isOverdue ? "overdue" : goal.status}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm"><span>{formatINR(goal.currentAmount)} saved</span><span className="text-ink-muted">of {formatINR(goal.targetAmount)}</span></div>
                <Progress value={progress.percent} showValue label="Progress" />
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div><dt className="text-ink-muted">Remaining</dt><dd className="mt-0.5 font-medium">{formatINR(progress.remaining)}</dd></div>
                  <div><dt className="text-ink-muted">At current pace</dt><dd className="mt-0.5 font-medium">{formatProjection(progress.monthsToGoal, progress.projectedCompletionDate)}</dd></div>
                  <div><dt className="text-ink-muted">Needed monthly</dt><dd className="mt-0.5 font-medium">{progress.requiredMonthly === null ? "—" : formatINR(progress.requiredMonthly)}</dd></div>
                  <div><dt className="text-ink-muted">Target date</dt><dd className="mt-0.5 font-medium">{goal.targetDate ? new Date(goal.targetDate).toLocaleDateString("en-IN") : "Not set"}</dd></div>
                </dl>
                {goal.description && <p className="text-xs text-ink-muted">{goal.description}</p>}
                <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                  {goal.status !== "completed" && <Button size="sm" onClick={() => setContributionGoalId(goal.id)}>Add contribution</Button>}
                  <Button size="sm" variant="outline" onClick={() => { setEditingGoalId(goal.id); setGoalOpen(true); }}>Edit</Button>
                  {goal.status === "active" && <Button size="sm" variant="ghost" onClick={() => financeStore.updateSavingsGoal(goal.id, { status: "paused" })}>Pause</Button>}
                  {goal.status === "paused" && <Button size="sm" variant="ghost" onClick={() => financeStore.updateSavingsGoal(goal.id, { status: "active" })}>Resume</Button>}
                  {goal.status !== "completed" && <Button size="sm" variant="ghost" onClick={() => financeStore.updateSavingsGoal(goal.id, { status: "completed" })}>Complete</Button>}
                  <Button size="sm" variant="ghost" onClick={() => { setDeleteTarget({ kind: "goal", id: goal.id, name: goal.name }); setConfirmDeleteOpen(true); }}>Delete</Button>
                </div>
                {goal.contributions.length > 0 && <details className="text-xs">
                  <summary className="cursor-pointer font-medium text-ink-muted">Contribution history ({goal.contributions.length})</summary>
                  <ul className="mt-2 space-y-1">{[...goal.contributions].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).map((item) => <li key={item.id} className="flex justify-between gap-2"><span>{new Date(item.date).toLocaleDateString("en-IN")}{item.note ? ` · ${item.note}` : ""}</span><span>{formatINR(item.amount)}</span></li>)}</ul>
                </details>}
              </CardContent>
            </Card>;
          })}
          {goals.length === 0 && <Card className="md:col-span-2 xl:col-span-3"><CardContent className="py-10 text-center">
            <p className="font-semibold">No savings goals yet</p><p className="mt-1 text-sm text-ink-muted">Create a goal and record contributions to track its progress.</p>
            <Button className="mt-4" onClick={() => { setEditingGoalId(null); setGoalOpen(true); }}><PlusIcon className="size-4" />Create your first goal</Button>
          </CardContent></Card>}
        </div>
      )}

      {tab === "planner" && (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Recommendations</CardTitle><p className="text-sm text-ink-muted">Deterministic comparisons using your three most recent completed months. Not financial advice.</p></CardHeader>
              <CardContent>{data.recommendations.length === 0 ? <p className="text-sm text-ink-muted">More transaction history is needed for recommendations.</p>
                : <ul className="space-y-3">{data.recommendations.map((item) => <li key={item.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="text-sm font-semibold">{item.title}</h3>{item.monthlyAmount !== null && <Badge variant="outline">{formatINR(item.monthlyAmount)}/mo</Badge>}</div>
                  <p className="mt-1 text-xs text-ink-muted">{item.explanation}</p><p className="mt-1 text-[11px] text-ink-muted">Evidence: {item.evidence}</p>
                  {item.actionHref && <button className="mt-2 text-xs font-medium text-accent-secondary hover:underline" onClick={() => navigate(item.actionHref!)}>{item.actionLabel ?? "Review"} →</button>}
                </li>)}</ul>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Savings opportunities</CardTitle><p className="text-sm text-ink-muted">Potential spending outliers, not guaranteed savings.</p></CardHeader>
              <CardContent>{data.opportunities.length === 0 ? <p className="text-sm text-ink-muted">No significant outliers detected from the available history.</p>
                : <ul className="space-y-3">{data.opportunities.map((item) => <li key={item.id} className="rounded-lg border border-border p-3">
                  <h3 className="text-sm font-semibold">{item.title}</h3><p className="mt-1 text-xs text-ink-muted">{item.evidence}</p><p className="mt-1 text-xs text-ink-muted">{item.action}</p>
                </li>)}</ul>}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle>Scenario planner</CardTitle><p className="text-sm text-ink-muted">Hypothetical estimate assuming consistent contributions and no withdrawals.</p></CardHeader>
            <CardContent className="space-y-3">
              {goals.length > 0 && <label className="block text-sm font-medium">Load a goal
                <select value={scenarioGoalId} onChange={(event) => selectScenarioGoal(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
                  <option value="">Custom scenario</option>{goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.name}</option>)}
                </select>
              </label>}
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-medium">Monthly savings (₹)<input type="number" min="0" value={monthlySavings || ""} onChange={(event) => setMonthlySavings(Number(event.target.value) || 0)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
                <label className="text-sm font-medium">Target amount (₹)<input type="number" min="0" value={scenarioTarget || ""} onChange={(event) => setScenarioTarget(Number(event.target.value) || 0)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
                <label className="text-sm font-medium">Current savings (₹)<input type="number" min="0" value={scenarioCurrent || ""} onChange={(event) => setScenarioCurrent(Number(event.target.value) || 0)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
                <label className="text-sm font-medium">Target date<input type="date" value={scenarioDate} onChange={(event) => setScenarioDate(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label>
              </div>
              <div className="rounded-xl bg-surface-secondary/50 p-4">
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div><dt className="text-xs text-ink-muted">Time to target</dt><dd className="mt-1 font-semibold">{formatProjection(scenario.monthsToGoal, scenario.projectedCompletionDate)}</dd></div>
                  <div><dt className="text-xs text-ink-muted">Required per month</dt><dd className="mt-1 font-semibold">{scenario.requiredMonthly === null ? "Set a target date" : formatINR(scenario.requiredMonthly)}</dd></div>
                  <div><dt className="text-xs text-ink-muted">Target feasibility</dt><dd className="mt-1"><Badge variant={scenario.feasible ? "success" : "warning"}>{scenario.feasible ? "On track" : "More savings needed"}</Badge></dd></div>
                  <div><dt className="text-xs text-ink-muted">{scenario.shortfall !== null ? "Monthly shortfall" : "Monthly surplus"}</dt><dd className="mt-1 font-semibold">{scenario.shortfall !== null ? formatINR(scenario.shortfall) : scenario.surplus !== null ? formatINR(scenario.surplus) : "—"}</dd></div>
                </dl>
                <p className="mt-3 text-xs text-ink-muted">No investment returns, missed contributions, or withdrawals are modeled.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <BudgetEditor
        key={`${selectedMonth}-${budgetOpen ? "open" : "closed"}-${budgetPlan?.updatedAt ?? "new"}`}
        open={budgetOpen}
        onClose={() => setBudgetOpen(false)}
        plan={budgetPlan}
        month={selectedMonth}
        categories={activeExpenseCategories}
        transactions={snapshot.transactions}
      />
      <GoalEditor
        key={`${editingGoalId ?? "new"}-${goalOpen ? "open" : "closed"}`}
        open={goalOpen}
        initial={editingGoal}
        onClose={() => { setGoalOpen(false); setEditingGoalId(null); }}
      />
      <ContributionDialog key={contributionGoalId ?? "no-goal"} goal={contributionGoal} onClose={() => setContributionGoalId(null)} />
      <ConfirmationDialog
        open={confirmDeleteOpen}
        onClose={() => { setConfirmDeleteOpen(false); setDeleteTarget(null); }}
        onConfirm={confirmDelete}
        title={deleteTarget?.kind === "budget" ? "Delete budget?" : "Delete savings goal?"}
        description={`This will permanently remove “${deleteTarget?.name ?? "this item"}” from this browser's saved finance data.`}
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
