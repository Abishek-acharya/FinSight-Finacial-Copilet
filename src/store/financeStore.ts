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
import type { DemoUser } from "@/lib/auth/types";
import { deleteOfflineFinanceData, saveOfflineFinanceData } from "@/services/offlineFinanceCache";

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
  fileHash?: string;
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

function normalizeTransaction(transaction: Transaction): Transaction {
  const amount = Number(transaction.amount);
  const type = String(transaction.type).trim().toLowerCase();
  return {
    ...transaction,
    amount: Number.isFinite(amount) ? Math.abs(amount) : 0,
    type: type === "income" ? "income" : "expense",
    category: String(transaction.category || "Other").trim() || "Other",
  };
}

function normalizeSnapshot(snapshot: Partial<FinanceSnapshot>): FinanceSnapshot {
  return {
    ...seed(),
    ...snapshot,
    transactions: Array.isArray(snapshot.transactions)
      ? snapshot.transactions.map(normalizeTransaction)
      : [],
    categories: snapshot.categories?.length ? snapshot.categories : buildSeedCategories(),
  };
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
  private activeUser: DemoUser | null = null;
  private offlineReadOnly = false;
  private offlineSnapshot: FinanceSnapshot | null = null;
  private remoteSaveQueue: Promise<void> = Promise.resolve();

  constructor() {
    try {
      const raw =
        typeof window !== "undefined"
          ? localStorage.getItem(STORAGE_KEY) || localStorage.getItem("finsight_finance_store_v4")
          : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        this.snapshot = normalizeSnapshot(parsed);
      } else {
        this.snapshot = seed();
      }
    } catch {
      this.snapshot = seed();
    }
  }

  private persist(syncRemote = false) {
    if (this.offlineReadOnly) {
      if (this.offlineSnapshot) this.snapshot = this.offlineSnapshot;
      this.listeners.forEach((fn) => fn());
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("finsight-finance-updated"));
        window.dispatchEvent(new CustomEvent("finsight:offline-write-blocked"));
      }
      throw new Error("Offline mode is read-only. Reconnect before saving changes.");
    }

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(this.activeStorageKey, JSON.stringify(this.snapshot));
      } catch (err) {
        console.error("Failed to persist to localStorage:", err);
      }
    }
    this.listeners.forEach((fn) => fn());
    if (typeof window !== "undefined") window.dispatchEvent(new Event("finsight-finance-updated"));
    if (syncRemote) this.saveRemote(this.snapshot);
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

  private cacheValidatedSnapshot(snapshot: FinanceSnapshot, user = this.activeUser) {
    if (!user) return;
    void saveOfflineFinanceData(user, snapshot).catch((error: unknown) => {
      this.notifyOfflineCacheError(error);
    });
  }

  async addManualExpense(input: {
    amount: number;
    category: string;
    date: string;
    accountId: string;
    note: string;
  }): Promise<void> {
    if (this.offlineReadOnly) throw new Error("Manual expenses cannot be saved while offline. Reconnect and try again.");
    await this.remoteSaveQueue;
    const optimisticId = createId("pending-expense");
    const existingAccount = this.snapshot.accounts.find((account) => account.id === input.accountId);
    const optimisticAccount: Account = existingAccount
      ? {
          ...existingAccount,
          balance: existingAccount.balance === null ? null : existingAccount.balance - input.amount,
        }
      : {
          id: "manual-cash",
          name: "Cash",
          type: "savings",
          last4: "",
          balance: -input.amount,
        };
    const optimisticTransaction: Transaction = {
      id: optimisticId,
      merchant: input.note || input.category,
      description: input.note,
      note: input.note,
      category: input.category,
      type: "expense",
      accountId: input.accountId,
      date: input.date,
      amount: input.amount,
      categorizationSource: "manual",
    };
    this.snapshot = {
      ...this.snapshot,
      transactions: [optimisticTransaction, ...this.snapshot.transactions],
      accounts: existingAccount
        ? this.snapshot.accounts.map((account) => account.id === existingAccount.id ? optimisticAccount : account)
        : [...this.snapshot.accounts, optimisticAccount],
    };
    this.persist();
    this.cacheValidatedSnapshot(this.snapshot);
    try {
      const saved = await apiFetch<{ transaction: Transaction; account: Account }>(
        "/api/finance/transactions",
        { method: "POST", body: JSON.stringify(input) },
        this.activeAccessToken ?? undefined,
      );
      const accountExists = this.snapshot.accounts.some((account) => account.id === saved.account.id);
      const transactionsWithoutOptimistic = this.snapshot.transactions.filter(
        (transaction) => transaction.id !== optimisticId,
      );
      this.snapshot = {
        ...this.snapshot,
        transactions: transactionsWithoutOptimistic.some((transaction) => transaction.id === saved.transaction.id)
          ? transactionsWithoutOptimistic
          : [saved.transaction, ...transactionsWithoutOptimistic],
        accounts: accountExists
          ? this.snapshot.accounts.map((account) => account.id === saved.account.id ? saved.account : account)
          : [...this.snapshot.accounts.filter((account) => account.id !== optimisticAccount.id), saved.account],
      };
      this.persist();
    } catch (error) {
      this.snapshot = {
        ...this.snapshot,
        transactions: this.snapshot.transactions.filter((transaction) => transaction.id !== optimisticId),
        accounts: existingAccount
          ? this.snapshot.accounts.map((account) => account.id === existingAccount.id
            ? {
                ...account,
                balance: account.balance === null ? null : account.balance + input.amount,
              }
            : account)
          : this.snapshot.accounts.filter((account) => account.id !== optimisticAccount.id),
      };
      this.persist();
      throw error;
    }
  }

  async clearLocalData() {
    this.snapshot = seed();
    this.offlineSnapshot = null;
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem("finsight_finance_store_v4");
        if (this.activeStorageKey) localStorage.removeItem(this.activeStorageKey);
      } catch (error) {
        console.error("Could not clear the local finance cache:", error);
        throw error;
      }
      if (this.activeUser) {
        await deleteOfflineFinanceData(this.activeUser.id);
      }
    }
    this.listeners.forEach((fn) => fn());
    if (typeof window !== "undefined") window.dispatchEvent(new Event("finsight-finance-updated"));
  }

  addStatement(record: ImportedStatementRecord, newTransactions: Transaction[]) {
    if (record.fileHash && this.snapshot.statements.some((statement) => statement.fileHash === record.fileHash)) {
      throw new Error("This statement has already been uploaded.");
    }

    const normalizedTransactions = newTransactions.map(normalizeTransaction);
    const income = normalizedTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expenses = normalizedTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

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
      transactions: [...normalizedTransactions, ...this.snapshot.transactions],
    };

    this.persist(true);
    console.log("✅ Data Saved Successfully! Total transactions:", this.snapshot.transactions.length);
  }

  // Optional: Sync with backend SQLite database without blocking
  async syncWithDatabase() {
    if (!this.activeAccessToken) throw new Error("Sign in to sync financial data.");
    const result = await apiFetch<{ snapshot: FinanceSnapshot | null }>(
      "/api/finance/snapshot",
      {},
      this.activeAccessToken,
    );
    if (result.snapshot) {
      this.snapshot = normalizeSnapshot(result.snapshot);
      this.persist();
      this.cacheValidatedSnapshot(this.snapshot);
    }
  }

  private saveRemote(snapshot: FinanceSnapshot) {
    if (!this.activeAccessToken) return;
    const token = this.activeAccessToken;
    const user = this.activeUser;
    const body = JSON.stringify({ snapshot });
    this.remoteSaveQueue = this.remoteSaveQueue.then(async () => {
      try {
        await apiFetch("/api/finance/snapshot", { method: "PUT", body }, token);
        this.cacheValidatedSnapshot(snapshot, user);
      } catch (error) {
        console.warn("Background remote sync error (local data preserved):", error);
      }
    });
  }

  async loadFromDatabase(userId: string, accessToken: string, user?: DemoUser) {
    this.activeStorageKey = `${STORAGE_KEY}:${userId}`;
    this.activeAccessToken = accessToken;
    this.activeUser = user ?? null;
    this.offlineReadOnly = false;
    this.offlineSnapshot = null;
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(this.activeStorageKey);
        this.snapshot = cached
          ? normalizeSnapshot(JSON.parse(cached) as Partial<FinanceSnapshot>)
          : seed();
      } catch (error) {
        console.error("Could not read the user's local finance snapshot:", error);
        this.snapshot = seed();
      }
    }
    try {
      const result = await apiFetch<{ snapshot: FinanceSnapshot | null }>(
        "/api/finance/snapshot",
        {},
        accessToken,
      );
      if (
        result?.snapshot &&
        Array.isArray(result.snapshot.transactions)
      ) {
        this.snapshot = normalizeSnapshot(result.snapshot);
        this.persist();
      } else if (this.snapshot.transactions.length > 0) {
        this.saveRemote(this.snapshot);
      }
      if (user) {
        await saveOfflineFinanceData(user, this.snapshot).catch((error: unknown) => {
          this.notifyOfflineCacheError(error);
        });
      }
    } catch (error) {
      console.error("Could not load finance data from the database:", error);
      throw error;
    }
  }

  loadOfflineSnapshot(userId: string, snapshot: FinanceSnapshot, user?: DemoUser) {
    this.activeStorageKey = `${STORAGE_KEY}:${userId}`;
    this.activeAccessToken = null;
    this.activeUser = user?.id === userId
      ? user
      : this.activeUser?.id === userId ? this.activeUser : null;
    this.offlineReadOnly = true;
    this.snapshot = normalizeSnapshot(snapshot);
    this.offlineSnapshot = this.snapshot;
    this.listeners.forEach((fn) => fn());
    if (typeof window !== "undefined") window.dispatchEvent(new Event("finsight-finance-updated"));
  }

  enterOfflineMode(userId: string) {
    this.loadOfflineSnapshot(userId, seed(), this.activeUser ?? undefined);
  }

  deactivateSession() {
    this.activeAccessToken = null;
    this.activeUser = null;
    this.offlineReadOnly = false;
    this.offlineSnapshot = null;
    this.snapshot = seed();
    this.activeStorageKey = STORAGE_KEY;
    this.listeners.forEach((fn) => fn());
    if (typeof window !== "undefined") window.dispatchEvent(new Event("finsight-finance-updated"));
  }

  isOfflineReadOnly() {
    return this.offlineReadOnly;
  }

  activateOnlineSession(accessToken: string, user: DemoUser) {
    this.activeAccessToken = accessToken;
    this.activeUser = user;
    this.offlineReadOnly = false;
    this.offlineSnapshot = null;
  }

  notifyOfflineCacheError(error: unknown) {
    console.error("Offline finance cache operation failed:", error);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("finsight:offline-cache-error", {
        detail: { message: error instanceof Error ? error.message : "Offline data could not be loaded." },
      }));
    }
  }

  deleteStatement(statementId: string) {
    this.snapshot = {
      ...this.snapshot,
      statements: this.snapshot.statements.filter((s) => s.id !== statementId),
    };
    this.persist(true);
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
    this.persist(true);
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
    this.persist(true);
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
    this.persist(true);
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
    this.persist(true);
  }

  deleteBudgetPlan(id: string) {
    const plan = this.snapshot.budgetPlans.find((item) => item.id === id);
    this.snapshot = {
      ...this.snapshot,
      budgetPlans: this.snapshot.budgetPlans.filter((item) => item.id !== id),
      budgets: plan ? this.snapshot.budgets.filter((item) => item.month !== plan.month) : this.snapshot.budgets,
    };
    this.persist(true);
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
    if (this.activeAccessToken) {
      await apiFetch("/api/finance/snapshot", { method: "DELETE" }, this.activeAccessToken);
    }
    await this.clearLocalData();
  }
}

export const financeStore = new FinanceStore();
