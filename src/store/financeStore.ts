import {
  TRANSACTION_CATEGORIES,
  type Account,
  type AccountType,
  type Budget,
  type Transaction,
} from "@/types/finance";
import type { BudgetPlan, GoalContribution, SavingsGoal } from "@/types/budget";
import { CATEGORY_COLORS } from "@/utils/financeCalculations";
import { apiFetch } from "@/lib/api";

export interface UserCategory {
  id: string;
  name: string;
  type: "income" | "expense";
  color: string;
  isSystem: boolean;
  active: boolean;
}

export interface UserCategoryRule {
  id: string;
  name: string;
  keyword: string;
  matchType: "contains" | "equals" | "startsWith";
  category: string;
  priority: number;
  active: boolean;
  createdAt: string;
}

export interface ImportedStatementRecord {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  bank: string;
  accountNickname: string;
  accountType: string;
  maskedAccount: string;
  periodFrom: string;
  periodTo: string;
  currency: string;
  uploadedAt: string;
  status: "completed" | "pending" | "failed";
  transactionCount: number;
  incomeTotal: number;
  expenseTotal: number;
  closingBalance?: number;
  balanceAsOf?: string;
  errorMessage?: string;
}

export interface FinanceSnapshot {
  transactions: Transaction[];
  accounts: Account[];
  budgets: Budget[];
  statements: ImportedStatementRecord[];
  categories: UserCategory[];
  userRules: UserCategoryRule[];
  budgetPlans: BudgetPlan[];
  savingsGoals: SavingsGoal[];
  dismissedAlerts: string[];
}

const STORAGE_KEY = "finsight_v100_store";
let storeWarning: string | null = null;

const INCOME_CATEGORIES = new Set([
  "Salary",
  "Freelance",
  "Business Income",
  "Interest",
  "Cashback",
  "Refund",
  "Other Income",
]);

function createId(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

function buildSeedCategories(): UserCategory[] {
  return TRANSACTION_CATEGORIES.map((name) => ({
    id: `sys-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name,
    type: INCOME_CATEGORIES.has(name) ? "income" : "expense",
    color: CATEGORY_COLORS[name] ?? "#94a3b8",
    isSystem: true,
    active: true,
  }));
}

function seed(): FinanceSnapshot {
  return {
    transactions: [],
    accounts: [],
    budgets: [],
    statements: [],
    categories: buildSeedCategories(),
    userRules: [],
    budgetPlans: [],
    savingsGoals: [],
    dismissedAlerts: [],
  };
}

export function getFinanceStoreWarning(): string | null {
  return storeWarning;
}

class FinanceStore {
  private snapshot: FinanceSnapshot;
  private listeners = new Set<() => void>();
  private activeStorageKey = STORAGE_KEY;
  private activeAccessToken: string | null = null;

  constructor() {
    try {
      const raw =
        typeof window !== "undefined"
          ? localStorage.getItem(STORAGE_KEY) || localStorage.getItem("finsight_finance_store_v4")
          : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        this.snapshot = {
          ...seed(),
          ...parsed,
          categories: parsed.categories?.length ? parsed.categories : buildSeedCategories(),
        };
      } else {
        this.snapshot = seed();
      }
    } catch {
      this.snapshot = seed();
    }
  }

  private persist() {
    // 🚨 Saves to browser instantly so navigating doesn't lose data
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.snapshot));
        if (this.activeStorageKey && this.activeStorageKey !== STORAGE_KEY) {
          localStorage.setItem(this.activeStorageKey, JSON.stringify(this.snapshot));
        }
      } catch (err) {
        console.error("Failed to persist to localStorage:", err);
      }
    }
    this.listeners.forEach((fn) => fn());
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  getSnapshot(): FinanceSnapshot {
    return this.snapshot;
  }

  addStatement(record: ImportedStatementRecord, newTransactions: Transaction[]) {
    const income = newTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expenses = newTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

    const accountId = `imported-${record.maskedAccount.replace(/\D/g, "") || "x"}`;
    const existing = this.snapshot.accounts.find((a) => a.id === accountId);

    const updatedAccount: Account = existing
      ? {
          ...existing,
          balance: (existing.balance ?? 0) + (income - expenses),
        }
      : {
          id: accountId,
          name: record.accountNickname || `${record.bank} Account`,
          type: (record.accountType as AccountType) || "savings",
          bank: record.bank,
          last4: record.maskedAccount.slice(-4) || "0000",
          balance: income - expenses,
        };

    this.snapshot = {
      ...this.snapshot,
      accounts: existing
        ? this.snapshot.accounts.map((a) => (a.id === accountId ? updatedAccount : a))
        : [...this.snapshot.accounts, updatedAccount],
      statements: [record, ...this.snapshot.statements.filter((s) => s.id !== record.id)],
      transactions: [...newTransactions, ...this.snapshot.transactions],
    };

    this.persist();
    console.log("✅ Data Saved Successfully! Total transactions:", this.snapshot.transactions.length);

    if (this.activeAccessToken) {
      this.saveRemote(this.snapshot);
    }
  }

  // Optional: Sync with backend SQLite database without blocking
  async syncWithDatabase() {
    try {
      const res = await fetch("/api/db/transactions");
      if (!res.ok) return;
      const data = await res.json();
      if (data.transactions && data.transactions.length > 0) {
        this.snapshot.transactions = data.transactions;
        this.persist();
      }
    } catch {
      console.log("Database not connected, using local storage.");
    }
  }

  private saveRemote(snapshot: FinanceSnapshot) {
    if (!this.activeAccessToken) return;
    const token = this.activeAccessToken;
    const body = JSON.stringify({ snapshot });
    apiFetch("/api/finance/snapshot", { method: "PUT", body }, token).catch((error) => {
      console.warn("Background remote sync error (local data preserved):", error);
    });
  }

  async loadFromDatabase(userId: string, accessToken: string) {
    this.activeStorageKey = `${STORAGE_KEY}:${userId}`;
    this.activeAccessToken = accessToken;
    try {
      const result = await apiFetch<{ snapshot: FinanceSnapshot | null }>(
        "/api/finance/snapshot",
        {},
        accessToken,
      );
      if (
        result?.snapshot &&
        Array.isArray(result.snapshot.transactions) &&
        result.snapshot.transactions.length > 0
      ) {
        this.snapshot = {
          ...seed(),
          ...result.snapshot,
        };
        this.persist();
      } else if (this.snapshot.transactions.length > 0) {
        // Sync local data to remote
        this.saveRemote(this.snapshot);
      }
    } catch (err) {
      console.log("Database load skipped, local storage retained:", err);
    }
  }

  deleteStatement(statementId: string) {
    this.snapshot = {
      ...this.snapshot,
      statements: this.snapshot.statements.filter((s) => s.id !== statementId),
    };
    this.persist();
  }

  markStatementFailed(record: ImportedStatementRecord) {
    this.snapshot = {
      ...this.snapshot,
      statements: [record, ...this.snapshot.statements],
    };
    this.persist();
  }

  updateTransaction(id: string, patch: Partial<Transaction>) {
    this.snapshot = {
      ...this.snapshot,
      transactions: this.snapshot.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    };
    this.persist();
  }

  updateManyTransactions(
    ids: string[],
    patch: Partial<Transaction> | ((transaction: Transaction) => Partial<Transaction>),
  ) {
    const idSet = new Set(ids);
    this.snapshot = {
      ...this.snapshot,
      transactions: this.snapshot.transactions.map((t) =>
        idSet.has(t.id) ? { ...t, ...(typeof patch === "function" ? patch(t) : patch) } : t,
      ),
    };
    this.persist();
  }

  deleteTransaction(id: string) {
    this.deleteTransactions([id]);
  }

  deleteTransactions(ids: string[]) {
    const idSet = new Set(ids);
    this.snapshot = {
      ...this.snapshot,
      transactions: this.snapshot.transactions.filter((t) => !idSet.has(t.id)),
    };
    this.persist();
  }

  addCategory(category: Omit<UserCategory, "id" | "isSystem">): UserCategory {
    const added = { ...category, name: category.name.trim(), id: createId("category"), isSystem: false };
    this.snapshot = { ...this.snapshot, categories: [...this.snapshot.categories, added] };
    this.persist();
    return added;
  }

  updateCategory(id: string, patch: Partial<Pick<UserCategory, "name" | "type" | "color" | "active">>) {
    this.snapshot = {
      ...this.snapshot,
      categories: this.snapshot.categories.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    };
    this.persist();
  }

  deleteCategory(id: string) {
    this.snapshot = {
      ...this.snapshot,
      categories: this.snapshot.categories.filter((item) => item.id !== id),
    };
    this.persist();
  }

  addRule(rule: Omit<UserCategoryRule, "id" | "createdAt">): UserCategoryRule {
    const added = { ...rule, keyword: rule.keyword.trim(), id: createId("rule"), createdAt: new Date().toISOString() };
    this.snapshot = { ...this.snapshot, userRules: [...this.snapshot.userRules, added] };
    this.persist();
    return added;
  }

  updateRule(id: string, patch: Partial<Omit<UserCategoryRule, "id" | "createdAt">>) {
    this.snapshot = {
      ...this.snapshot,
      userRules: this.snapshot.userRules.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    };
    this.persist();
  }

  deleteRule(id: string) {
    this.snapshot = {
      ...this.snapshot,
      userRules: this.snapshot.userRules.filter((r) => r.id !== id),
    };
    this.persist();
  }

  upsertBudgetPlan(plan: Omit<BudgetPlan, "createdAt" | "updatedAt"> & { createdAt?: string }) {
    const existing = this.snapshot.budgetPlans.find((item) => item.id === plan.id);
    const now = new Date().toISOString();
    const saved: BudgetPlan = {
      ...plan,
      createdAt: existing?.createdAt ?? plan.createdAt ?? now,
      updatedAt: now,
    };
    const budgetPlans = existing
      ? this.snapshot.budgetPlans.map((item) => (item.id === saved.id ? saved : item))
      : [...this.snapshot.budgetPlans, saved];
    const budgets = [
      ...this.snapshot.budgets.filter((item) => item.month !== undefined && item.month !== saved.month),
      ...saved.categoryAllocations.map((allocation) => ({
        category: allocation.category,
        limit: allocation.amount,
        spent: 0,
        color: CATEGORY_COLORS[allocation.category] ?? "#94a3b8",
        month: saved.month,
      })),
    ];
    this.snapshot = { ...this.snapshot, budgetPlans, budgets };
    this.persist();
  }

  deleteBudgetPlan(id: string) {
    const plan = this.snapshot.budgetPlans.find((item) => item.id === id);
    this.snapshot = {
      ...this.snapshot,
      budgetPlans: this.snapshot.budgetPlans.filter((item) => item.id !== id),
      budgets: plan ? this.snapshot.budgets.filter((item) => item.month !== plan.month) : this.snapshot.budgets,
    };
    this.persist();
  }

  addSavingsGoal(goal: Omit<SavingsGoal, "id" | "createdAt" | "updatedAt" | "contributions">): SavingsGoal {
    const now = new Date().toISOString();
    const saved: SavingsGoal = {
      ...goal,
      name: goal.name.trim(),
      id: createId("goal"),
      contributions: [],
      createdAt: now,
      updatedAt: now,
    };
    this.snapshot = { ...this.snapshot, savingsGoals: [...this.snapshot.savingsGoals, saved] };
    this.persist();
    return saved;
  }

  updateSavingsGoal(id: string, patch: Partial<SavingsGoal>) {
    this.snapshot = {
      ...this.snapshot,
      savingsGoals: this.snapshot.savingsGoals.map((item) =>
        item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item,
      ),
    };
    this.persist();
  }

  deleteSavingsGoal(id: string) {
    this.snapshot = {
      ...this.snapshot,
      savingsGoals: this.snapshot.savingsGoals.filter((g) => g.id !== id),
    };
    this.persist();
  }

  addContribution(goalId: string, contribution: Omit<GoalContribution, "id">) {
    const goal = this.snapshot.savingsGoals.find((item) => item.id === goalId);
    if (!goal) return;
    const currentAmount = goal.currentAmount + contribution.amount;
    const updatedGoal: SavingsGoal = {
      ...goal,
      currentAmount,
      status: currentAmount >= goal.targetAmount ? "completed" : goal.status,
      contributions: [...goal.contributions, { ...contribution, id: createId("contribution") }],
      updatedAt: new Date().toISOString(),
    };
    this.snapshot = {
      ...this.snapshot,
      savingsGoals: this.snapshot.savingsGoals.map((item) => (item.id === goalId ? updatedGoal : item)),
    };
    this.persist();
  }

  dismissAlert(alertId: string) {
    if (this.snapshot.dismissedAlerts.includes(alertId)) return;
    this.snapshot = {
      ...this.snapshot,
      dismissedAlerts: [...this.snapshot.dismissedAlerts, alertId],
    };
    this.persist();
  }

  resetDismissedAlerts() {
    this.snapshot = {
      ...this.snapshot,
      dismissedAlerts: [],
    };
    this.persist();
  }

  async reset() {
    this.snapshot = seed();
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
        if (this.activeStorageKey) localStorage.removeItem(this.activeStorageKey);
      } catch (e) {
        console.error("Local storage clear error:", e);
      }
    }
    this.listeners.forEach((fn) => fn());
    if (this.activeAccessToken) {
      apiFetch("/api/finance/snapshot", { method: "DELETE" }, this.activeAccessToken).catch(() => {});
    }
  }
}

export const financeStore = new FinanceStore();
