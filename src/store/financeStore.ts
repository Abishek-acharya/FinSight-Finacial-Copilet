import { demoAccounts } from "@/data/demoAccounts";
import { demoBudgets } from "@/data/demoBudgets";
import { demoTransactions } from "@/data/demoTransactions";
import {
  TRANSACTION_CATEGORIES,
  type Account,
  type Budget,
  type Transaction,
} from "@/types/finance";
import type { BudgetPlan, GoalContribution, SavingsGoal } from "@/types/budget";
import { CATEGORY_COLORS } from "@/utils/financeCalculations";

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

const STORAGE_KEY = "finsight_finance_store_v1";
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

function currentMonthKey(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function seedBudgetPlans(): BudgetPlan[] {
  const month = currentMonthKey();
  const now = new Date().toISOString();
  const categoryAllocations = demoBudgets.map(({ category, limit }) => ({ category, amount: limit }));
  return [{
    id: `plan-${month}`,
    name: `Monthly Budget · ${month}`,
    month,
    totalAmount: categoryAllocations.reduce((sum, item) => sum + item.amount, 0),
    categoryAllocations,
    currency: "INR",
    createdAt: now,
    updatedAt: now,
  }];
}

function seedSavingsGoals(): SavingsGoal[] {
  const now = new Date();
  const iso = (monthOffset: number) => {
    const date = new Date(now.getFullYear(), now.getMonth() + monthOffset, now.getDate());
    return date.toISOString();
  };
  const timestamp = now.toISOString();
  return [
    {
      id: "goal-emergency",
      name: "Emergency Fund",
      targetAmount: 200000,
      currentAmount: 65000,
      targetDate: iso(7),
      category: "Emergency Fund",
      priority: "high",
      status: "active",
      contributions: [
        { id: "seed-emergency-1", date: iso(-2), amount: 25000 },
        { id: "seed-emergency-2", date: iso(-1), amount: 20000 },
        { id: "seed-emergency-3", date: timestamp, amount: 20000 },
      ],
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "goal-laptop",
      name: "New Laptop",
      targetAmount: 85000,
      currentAmount: 32000,
      targetDate: iso(5),
      category: "Gadget",
      priority: "medium",
      status: "active",
      contributions: [
        { id: "seed-laptop-1", date: iso(-1), amount: 15000 },
        { id: "seed-laptop-2", date: timestamp, amount: 17000 },
      ],
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
}

function seed(): FinanceSnapshot {
  return {
    transactions: [...demoTransactions],
    accounts: [...demoAccounts],
    budgets: demoBudgets.map((budget) => ({ ...budget, spent: 0 })),
    statements: [],
    categories: buildSeedCategories(),
    userRules: [],
    budgetPlans: seedBudgetPlans(),
    savingsGoals: seedSavingsGoals(),
    dismissedAlerts: [],
  };
}

function read(): FinanceSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
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
      storeWarning = "Saved finance data has an unexpected format. Demo data is shown; the saved value was not changed.";
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
    storeWarning = null;
    return {
      transactions: saved.transactions as Transaction[],
      accounts: saved.accounts as Account[],
      budgets: saved.budgets as Budget[],
      statements: saved.statements as ImportedStatementRecord[],
      categories,
      userRules: Array.isArray(saved.userRules) ? saved.userRules : [],
      budgetPlans: Array.isArray(saved.budgetPlans) ? saved.budgetPlans : seedBudgetPlans(),
      savingsGoals: Array.isArray(saved.savingsGoals) ? saved.savingsGoals : seedSavingsGoals(),
      dismissedAlerts: Array.isArray(saved.dismissedAlerts) ? saved.dismissedAlerts : [],
    };
  } catch {
    storeWarning = "Saved finance data could not be read. Demo data is shown; the saved value was not changed.";
    return null;
  }
}

export function getFinanceStoreWarning() {
  return storeWarning;
}

class FinanceStore {
  private snapshot = read() ?? seed();
  private listeners = new Set<() => void>();

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("storage", this.handleStorage);
    }
  }

  private handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    this.snapshot = read() ?? seed();
    this.notify();
  };

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  private commit(snapshot: FinanceSnapshot) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? `Could not save your finance data in this browser: ${error.message}`
          : "Could not save your finance data in this browser.",
      );
    }
    this.snapshot = snapshot;
    this.notify();
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;

  addStatement(record: ImportedStatementRecord, newTransactions: Transaction[]) {
    this.commit({
      ...this.snapshot,
      statements: [record, ...this.snapshot.statements],
      transactions: [...newTransactions, ...this.snapshot.transactions],
    });
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

  reset() {
    const snapshot = seed();
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
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
