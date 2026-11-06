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

const STORAGE_KEY = "finsight_finance_store_v4";
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

function read(storageKey = STORAGE_KEY): FinanceSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (
      typeof value !== "object" ||
      value === null ||
      !Array.isArray((value as FinanceSnapshot).transactions) ||
      !Array.isArray((value as FinanceSnapshot).accounts) ||
      !Array.isArray((value as FinanceSnapshot).budgets) ||
      !Array.isArray((value as FinanceSnapshot).statements)
    ) {
      storeWarning = "Saved finance data has an unexpected format. Empty finance data is shown; the saved value was not changed.";
      return null;
    }
    const saved = value as Partial<FinanceSnapshot>;
    const existingCategories = Array.isArray(saved.categories) ? saved.categories : [];
    const categories = [
      ...buildSeedCategories().filter(
        (category) => !existingCategories.some((existing) => existing.name === category.name),
      ),
      ...existingCategories,
    ];
    const statements = saved.statements as ImportedStatementRecord[];
    const accounts = [...saved.accounts as Account[]];
    for (const statement of statements) {
      if (statement.status !== "completed" || !statement.maskedAccount || statement.maskedAccount === "—") continue;
      const digits = statement.maskedAccount.replace(/\D/g, "");
      const id = `imported-${digits || "x"}`;
      if (accounts.some((account) => account.id === id)) continue;
      accounts.push({
        id,
        name: statement.accountNickname || statement.bank || "Imported account",
        type: statement.accountType === "credit" || statement.accountType === "current"
          ? statement.accountType
          : "savings",
        last4: digits.slice(-4),
        balance: statement.closingBalance ?? null,
        ...(statement.balanceAsOf ? { balanceAsOf: statement.balanceAsOf } : {}),
      });
    }
    for (const transaction of saved.transactions as Transaction[]) {
      if (accounts.some((account) => account.id === transaction.accountId)) continue;
      accounts.push({
        id: transaction.accountId,
        name: transaction.accountId,
        type: "savings",
        last4: "",
        balance: null,
      });
    }
    storeWarning = null;
    return {
      transactions: saved.transactions as Transaction[],
      accounts,
      budgets: saved.budgets as Budget[],
      statements,
      categories,
      userRules: Array.isArray(saved.userRules) ? saved.userRules : [],
      budgetPlans: Array.isArray(saved.budgetPlans) ? saved.budgetPlans : [],
      savingsGoals: Array.isArray(saved.savingsGoals) ? saved.savingsGoals : [],
      dismissedAlerts: Array.isArray(saved.dismissedAlerts) ? saved.dismissedAlerts : [],
    };
  } catch {
    storeWarning = "Saved finance data could not be read. Empty finance data is shown; the saved value was not changed.";
    return null;
  }
}

export function getFinanceStoreWarning() {
  return storeWarning;
}

class FinanceStore {
  private snapshot = read() ?? seed();
  private listeners = new Set<() => void>();
  private activeStorageKey = STORAGE_KEY;
  private activeAccessToken: string | null = null;
  private remoteSaveQueue: Promise<void> = Promise.resolve();
  private syncErrorNotified = false;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("storage", this.handleStorage);
    }
  }

  private handleStorage = (event: StorageEvent) => {
    if (event.key !== this.activeStorageKey) return;
    this.snapshot = read(this.activeStorageKey) ?? seed();
    this.notify();
  };

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  private writeLocal(snapshot: FinanceSnapshot) {
    try {
      window.localStorage.setItem(this.activeStorageKey, JSON.stringify(snapshot));
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? `Could not save your finance data in this browser: ${error.message}`
          : "Could not save your finance data in this browser.",
      );
    }
  }

  private saveRemote(snapshot: FinanceSnapshot) {
    if (!this.activeAccessToken) return;
    const token = this.activeAccessToken;
    const body = JSON.stringify({ snapshot });
    this.remoteSaveQueue = this.remoteSaveQueue
      .then(async () => {
        await apiFetch("/api/finance/snapshot", { method: "PUT", body }, token);
        storeWarning = null;
        this.syncErrorNotified = false;
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Could not sync finance data with the database.";
        storeWarning = `Your latest changes are saved in this browser but could not be synced to the server: ${message}`;
        console.error(storeWarning);
        this.notify();
        if (!this.syncErrorNotified && typeof window !== "undefined") {
          this.syncErrorNotified = true;
          window.dispatchEvent(new CustomEvent("finsight:finance-sync-error", { detail: { message } }));
        }
      });
  }

  private commit(snapshot: FinanceSnapshot, syncRemote = true) {
    this.writeLocal(snapshot);
    this.snapshot = snapshot;
    this.notify();
    if (syncRemote) this.saveRemote(snapshot);
  }

  async loadFromDatabase(userId: string, accessToken: string) {
    this.activeStorageKey = `${STORAGE_KEY}:${userId}`;
    this.activeAccessToken = accessToken;
    const result = await apiFetch<{ snapshot: FinanceSnapshot | null }>(
      "/api/finance/snapshot",
      {},
      accessToken,
    );
    if (result.snapshot !== null && (
      !result.snapshot ||
      !Array.isArray(result.snapshot.transactions) ||
      !Array.isArray(result.snapshot.accounts) ||
      !Array.isArray(result.snapshot.statements) ||
      !Array.isArray(result.snapshot.budgets)
    )) {
      throw new Error("The server returned a finance snapshot with an invalid format.");
    }
    const loaded = result.snapshot ?? seed();
    storeWarning = null;
    this.writeLocal(loaded);
    this.snapshot = loaded;
    this.notify();
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;

  async addStatement(record: ImportedStatementRecord, newTransactions: Transaction[]) {
    if (
      this.snapshot.transactions.length > 0 ||
      this.snapshot.statements.some((statement) => statement.status === "completed")
    ) {
      throw new Error("A statement has already been imported. Reset your finance data before importing another file.");
    }

    const digits = record.maskedAccount.replace(/\D/g, "");
    const accountId = `imported-${digits || "x"}`;
    const accountType: AccountType = record.accountType === "credit" || record.accountType === "current"
      ? record.accountType
      : "savings";
    const existing = this.snapshot.accounts.find((account) => account.id === accountId);
    const shouldUpdateBalance = record.closingBalance !== undefined
      && (!existing?.balanceAsOf || !record.balanceAsOf || record.balanceAsOf >= existing.balanceAsOf);
    const account: Account = {
      id: accountId,
      name: record.accountNickname || record.bank || existing?.name || "Imported account",
      type: accountType,
      last4: digits.slice(-4) || existing?.last4 || "",
      balance: shouldUpdateBalance ? record.closingBalance ?? null : existing?.balance ?? null,
      ...(shouldUpdateBalance && record.balanceAsOf
        ? { balanceAsOf: record.balanceAsOf }
        : existing?.balanceAsOf
          ? { balanceAsOf: existing.balanceAsOf }
          : {}),
    };
    const nextSnapshot = {
      ...this.snapshot,
      accounts: existing
        ? this.snapshot.accounts.map((item) => item.id === accountId ? account : item)
        : [...this.snapshot.accounts, account],
      statements: [record, ...this.snapshot.statements],
      transactions: [...newTransactions, ...this.snapshot.transactions],
    };
    await this.remoteSaveQueue;
    if (!this.activeAccessToken) throw new Error("Your session expired. Sign in again before importing a statement.");
    await apiFetch("/api/finance/snapshot", {
      method: "PUT",
      body: JSON.stringify({ snapshot: nextSnapshot }),
    }, this.activeAccessToken);
    storeWarning = null;
    this.commit(nextSnapshot, false);
  }

  deleteStatement(statementId: string) {
    this.commit({
      ...this.snapshot,
      statements: this.snapshot.statements.filter((statement) => statement.id !== statementId),
    });
  }

  markStatementFailed(record: ImportedStatementRecord) {
    this.commit({ ...this.snapshot, statements: [record, ...this.snapshot.statements] });
  }

  updateTransaction(id: string, patch: Partial<Transaction>) {
    this.commit({
      ...this.snapshot,
      transactions: this.snapshot.transactions.map((transaction) =>
        transaction.id === id ? { ...transaction, ...patch } : transaction,
      ),
    });
  }

  updateManyTransactions(
    ids: string[],
    patch: Partial<Transaction> | ((transaction: Transaction) => Partial<Transaction>),
  ) {
    const idSet = new Set(ids);
    this.commit({
      ...this.snapshot,
      transactions: this.snapshot.transactions.map((transaction) =>
        idSet.has(transaction.id)
          ? {
              ...transaction,
              ...(typeof patch === "function" ? patch(transaction) : patch),
            }
          : transaction,
      ),
    });
  }

  deleteTransaction(id: string) {
    this.deleteTransactions([id]);
  }

  deleteTransactions(ids: string[]) {
    const idSet = new Set(ids);
    this.commit({
      ...this.snapshot,
      transactions: this.snapshot.transactions.filter((transaction) => !idSet.has(transaction.id)),
    });
  }

  addCategory(category: Omit<UserCategory, "id" | "isSystem">): UserCategory {
    if (this.snapshot.categories.some((item) => item.name.toLowerCase() === category.name.trim().toLowerCase())) {
      throw new Error("A category with this name already exists.");
    }
    const added = { ...category, name: category.name.trim(), id: createId("category"), isSystem: false };
    this.commit({ ...this.snapshot, categories: [...this.snapshot.categories, added] });
    return added;
  }

  updateCategory(id: string, patch: Partial<Pick<UserCategory, "name" | "type" | "color" | "active">>) {
    const category = this.snapshot.categories.find((item) => item.id === id);
    if (!category) throw new Error("Category was not found.");
    const name = patch.name?.trim();
    if (name && this.snapshot.categories.some(
      (item) => item.id !== id && item.name.toLowerCase() === name.toLowerCase(),
    )) {
      throw new Error("A category with this name already exists.");
    }
    const nextName = name ?? category.name;
    this.commit({
      ...this.snapshot,
      categories: this.snapshot.categories.map((item) =>
        item.id === id ? { ...item, ...patch, ...(name ? { name } : {}) } : item,
      ),
      transactions: category.name === nextName
        ? this.snapshot.transactions
        : this.snapshot.transactions.map((transaction) =>
            transaction.category === category.name
              ? { ...transaction, category: nextName, originalCategory: category.name }
              : transaction,
          ),
      userRules: category.name === nextName
        ? this.snapshot.userRules
        : this.snapshot.userRules.map((rule) =>
            rule.category === category.name ? { ...rule, category: nextName } : rule,
          ),
    });
  }

  deleteCategory(id: string, replacement?: string) {
    const category = this.snapshot.categories.find((item) => item.id === id);
    if (!category) throw new Error("Category was not found.");
    if (category.isSystem) throw new Error("System categories cannot be deleted.");
    const replacementCategory = replacement ?? (category.type === "income" ? "Other Income" : "Other Expenses");
    if (!this.snapshot.categories.some((item) => item.name === replacementCategory && item.active)) {
      throw new Error("Choose an active replacement category.");
    }
    this.commit({
      ...this.snapshot,
      categories: this.snapshot.categories.filter((item) => item.id !== id),
      userRules: this.snapshot.userRules.map((rule) =>
        rule.category === category.name ? { ...rule, category: replacementCategory } : rule,
      ),
      transactions: this.snapshot.transactions.map((transaction) =>
        transaction.category === category.name
          ? { ...transaction, category: replacementCategory, originalCategory: category.name }
          : transaction,
      ),
    });
  }

  addRule(rule: Omit<UserCategoryRule, "id" | "createdAt">): UserCategoryRule {
    const category = this.snapshot.categories.find((item) => item.name === rule.category && item.active);
    if (!category) throw new Error("Choose an active category for this rule.");
    if (!rule.keyword.trim()) throw new Error("A rule keyword is required.");
    const added = { ...rule, keyword: rule.keyword.trim(), id: createId("rule"), createdAt: new Date().toISOString() };
    this.commit({ ...this.snapshot, userRules: [...this.snapshot.userRules, added] });
    return added;
  }

  updateRule(id: string, patch: Partial<Omit<UserCategoryRule, "id" | "createdAt">>) {
    const rule = this.snapshot.userRules.find((item) => item.id === id);
    if (!rule) throw new Error("Rule was not found.");
    const nextCategory = patch.category ?? rule.category;
    if (!this.snapshot.categories.some((item) => item.name === nextCategory && item.active)) {
      throw new Error("Choose an active category for this rule.");
    }
    this.commit({
      ...this.snapshot,
      userRules: this.snapshot.userRules.map((item) =>
        item.id === id ? { ...item, ...patch, ...(patch.keyword ? { keyword: patch.keyword.trim() } : {}) } : item,
      ),
    });
  }

  deleteRule(id: string) {
    this.commit({
      ...this.snapshot,
      userRules: this.snapshot.userRules.filter((rule) => rule.id !== id),
    });
  }

  upsertBudgetPlan(plan: Omit<BudgetPlan, "createdAt" | "updatedAt"> & { createdAt?: string }) {
    if (!plan.name.trim() || !/^\d{4}-\d{2}$/.test(plan.month) || !Number.isFinite(plan.totalAmount) || plan.totalAmount <= 0) {
      throw new Error("Budget name, month, and a positive total are required.");
    }
    if (plan.categoryAllocations.some((item) => !item.category || !Number.isFinite(item.amount) || item.amount <= 0)) {
      throw new Error("Category allocations must have a category and a positive amount.");
    }
    if (plan.categoryAllocations.reduce((sum, item) => sum + item.amount, 0) > plan.totalAmount) {
      throw new Error("Category allocations cannot exceed the total budget.");
    }
    const existing = this.snapshot.budgetPlans.find((item) => item.id === plan.id);
    const now = new Date().toISOString();
    const saved: BudgetPlan = {
      ...plan,
      createdAt: existing?.createdAt ?? plan.createdAt ?? now,
      updatedAt: now,
    };
    const budgetPlans = existing
      ? this.snapshot.budgetPlans.map((item) => item.id === saved.id ? saved : item)
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
    this.commit({ ...this.snapshot, budgetPlans, budgets });
  }

  deleteBudgetPlan(id: string) {
    const plan = this.snapshot.budgetPlans.find((item) => item.id === id);
    this.commit({
      ...this.snapshot,
      budgetPlans: this.snapshot.budgetPlans.filter((item) => item.id !== id),
      budgets: plan
        ? this.snapshot.budgets.filter((item) => item.month !== plan.month)
        : this.snapshot.budgets,
    });
  }

  addSavingsGoal(goal: Omit<SavingsGoal, "id" | "createdAt" | "updatedAt" | "contributions">): SavingsGoal {
    if (!goal.name.trim() || !Number.isFinite(goal.targetAmount) || goal.targetAmount <= 0 ||
      !Number.isFinite(goal.currentAmount) || goal.currentAmount < 0) {
      throw new Error("Goal name and valid target/current amounts are required.");
    }
    const now = new Date().toISOString();
    const saved: SavingsGoal = {
      ...goal,
      name: goal.name.trim(),
      id: createId("goal"),
      contributions: [],
      createdAt: now,
      updatedAt: now,
    };
    this.commit({ ...this.snapshot, savingsGoals: [...this.snapshot.savingsGoals, saved] });
    return saved;
  }

  updateSavingsGoal(id: string, patch: Partial<SavingsGoal>) {
    if (!this.snapshot.savingsGoals.some((item) => item.id === id)) {
      throw new Error("Savings goal was not found.");
    }
    if (patch.targetAmount !== undefined && (!Number.isFinite(patch.targetAmount) || patch.targetAmount <= 0)) {
      throw new Error("Goal target must be greater than zero.");
    }
    if (patch.currentAmount !== undefined && (!Number.isFinite(patch.currentAmount) || patch.currentAmount < 0)) {
      throw new Error("Current savings cannot be negative.");
    }
    this.commit({
      ...this.snapshot,
      savingsGoals: this.snapshot.savingsGoals.map((item) =>
        item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item,
      ),
    });
  }

  deleteSavingsGoal(id: string) {
    this.commit({ ...this.snapshot, savingsGoals: this.snapshot.savingsGoals.filter((goal) => goal.id !== id) });
  }

  addContribution(goalId: string, contribution: Omit<GoalContribution, "id">) {
    if (!Number.isFinite(contribution.amount) || contribution.amount <= 0 || !Number.isFinite(Date.parse(contribution.date))) {
      throw new Error("Contribution requires a positive amount and valid date.");
    }
    const goal = this.snapshot.savingsGoals.find((item) => item.id === goalId);
    if (!goal) throw new Error("Savings goal was not found.");
    const currentAmount = goal.currentAmount + contribution.amount;
    const updatedGoal: SavingsGoal = {
      ...goal,
      currentAmount,
      status: currentAmount >= goal.targetAmount ? "completed" : goal.status,
      contributions: [...goal.contributions, { ...contribution, id: createId("contribution") }],
      updatedAt: new Date().toISOString(),
    };
    this.commit({
      ...this.snapshot,
      savingsGoals: this.snapshot.savingsGoals.map((item) => item.id === goalId ? updatedGoal : item),
    });
  }

  dismissAlert(alertId: string) {
    if (this.snapshot.dismissedAlerts.includes(alertId)) return;
    this.commit({ ...this.snapshot, dismissedAlerts: [...this.snapshot.dismissedAlerts, alertId] });
  }

  resetDismissedAlerts() {
    this.commit({ ...this.snapshot, dismissedAlerts: [] });
  }

  async reset() {
    if (!this.activeAccessToken) throw new Error("Your session expired. Sign in again before resetting finance data.");
    await this.remoteSaveQueue;
    await apiFetch("/api/finance/snapshot", { method: "DELETE" }, this.activeAccessToken);
    const snapshot = seed();
    storeWarning = null;
    this.syncErrorNotified = false;
    try {
      window.localStorage.removeItem(this.activeStorageKey);
    } catch (error) {
      this.snapshot = snapshot;
      this.notify();
      throw new Error(
        error instanceof Error
          ? `Could not reset your finance data: ${error.message}`
          : "Could not reset your finance data.",
      );
    }
    this.snapshot = snapshot;
    this.notify();
  }
}

export const financeStore = new FinanceStore();
