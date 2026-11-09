import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowDownTrayIcon,
  AdjustmentsHorizontalIcon,
  TagIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { TransactionSummaryCards } from "@/components/transactions/TransactionSummaryCards";
import { TransactionInsights } from "@/components/transactions/TransactionInsights";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { TransactionCards, TransactionTable } from "@/components/transactions/TransactionRows";
import { TransactionDetailDrawer } from "@/components/transactions/TransactionDetailDrawer";
import { BulkActionsBar } from "@/components/transactions/BulkActionsBar";
import { CategoryManagerDialog } from "@/components/transactions/CategoryManagerDialog";
import { RulesManagerDialog } from "@/components/transactions/RulesManagerDialog";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { Pagination } from "@/components/ui/Pagination";
import { useFinanceStore } from "@/hooks/useFinanceStore";
import { useTransactions } from "@/hooks/useTransactions";
import { useToast } from "@/components/ui/Toast";
import { DEFAULT_FILTERS, type SortKey, type TransactionFiltersState } from "@/services/transactionFilters";
import { downloadTransactionsCsv } from "@/services/transactionExport";
import {
  deleteTransaction as removeTransaction,
  deleteTransactions as removeTransactions,
  updateTransaction,
  updateTransactions,
} from "@/services/transactionService";
import type { Account, Transaction } from "@/types/finance";
import type { UserCategory, UserCategoryRule } from "@/store/financeStore";
import { financeStore, getFinanceStoreWarning } from "@/store/financeStore";
import { detectUnusualTransactions } from "@/services/transactionAnomalies";

const PAGE_SIZE_OPTIONS = [20, 50, 100];

export default function TransactionsPage() {
  const snapshot = useFinanceStore();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<TransactionFiltersState>(() => ({
    ...DEFAULT_FILTERS,
    search: searchParams.get("search") ?? "",
  }));
  const [sort, setSort] = useState<SortKey>("date-desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deleteSelectedOpen, setDeleteSelectedOpen] = useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [rulesManagerOpen, setRulesManagerOpen] = useState(false);

  useEffect(() => {
    const search = searchParams.get("search") ?? "";
    setFilters((current) => current.search === search ? current : { ...current, search });
  }, [searchParams]);

  const selectedTransactions = useMemo(
    () => snapshot.transactions.filter((transaction) => selectedIds.has(transaction.id)),
    [snapshot.transactions, selectedIds],
  );
  const unusualIds = useMemo(
    () => detectUnusualTransactions(snapshot.transactions),
    [snapshot.transactions],
  );
  const accounts = useMemo(() => {
    const accountsById = new Map(snapshot.accounts.map((account) => [account.id, account]));
    for (const statement of snapshot.statements) {
      if (statement.status !== "completed" || !statement.maskedAccount || statement.maskedAccount === "—") continue;
      const digits = statement.maskedAccount.replace(/\D/g, "");
      const id = `imported-${digits || "x"}`;
      const type = statement.accountType === "credit" || statement.accountType === "current"
        ? statement.accountType
        : "savings";
      const account: Account = {
        id,
        name: statement.accountNickname && statement.accountNickname !== "—"
          ? statement.accountNickname
          : statement.bank,
        type,
        last4: digits.slice(-4),
        balance: null,
      };
      if (!accountsById.has(id)) accountsById.set(id, account);
    }
    return [...accountsById.values()];
  }, [snapshot.accounts, snapshot.statements]);
  const {
    filtered,
    pageData,
    pageCount,
    currentPage,
    summary,
    insights,
  } = useTransactions(snapshot.transactions, accounts, filters, sort, page, pageSize);

  const notifyError = (title: string, error: unknown) => {
    showToast({
      kind: "error",
      title,
      description: error instanceof Error ? error.message : "Please try again.",
    });
  };

  const saveTransaction = (id: string, patch: Partial<Transaction>) => {
    const current = snapshot.transactions.find((transaction) => transaction.id === id);
    if (!current) {
      showToast({ kind: "error", title: "Transaction not found", description: "Refresh the page and try again." });
      return;
    }
    try {
      updateTransaction(id, {
        ...patch,
        originalCategory:
          patch.category && patch.category !== current.category
            ? current.originalCategory ?? current.category
            : current.originalCategory,
      });
      showToast({ kind: "success", title: "Transaction updated", description: "Your dashboard uses the updated transaction data." });
      setDetail(null);
    } catch (error) {
      notifyError("Could not save transaction", error);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePageSelection = (selected: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      pageData.forEach((transaction) => {
        if (selected) next.add(transaction.id);
        else next.delete(transaction.id);
      });
      return next;
    });
  };

  const bulkPatch = (patch: Partial<Transaction>, title: string) => {
    if (!selectedIds.size) return;
    try {
      if (patch.category) {
        updateTransactions(
          [...selectedIds],
          (transaction) => ({
            ...patch,
            originalCategory:
              transaction.category === patch.category
                ? transaction.originalCategory
                : transaction.originalCategory ?? transaction.category,
          }),
        );
      } else {
        updateTransactions([...selectedIds], patch);
      }
      showToast({ kind: "success", title, description: `${selectedTransactions.length} selected transaction(s) updated.` });
      setSelectedIds(new Set());
    } catch (error) {
      notifyError("Could not update selected transactions", error);
    }
  };

  const handleBulkCategory = (category: string) => {
    bulkPatch(
      { category, categorizationSource: "manual", confidence: 1, reviewStatus: "reviewed" },
      "Category updated",
    );
  };

  const handleBulkReviewed = () => bulkPatch({ reviewStatus: "reviewed" }, "Marked as reviewed");

  const handleExport = (transactions: Transaction[], filename: string) => {
    try {
      downloadTransactionsCsv(transactions, accounts, filename);
      showToast({ kind: "success", title: "CSV exported", description: `${transactions.length} transaction(s) exported.` });
    } catch (error) {
      notifyError("Could not export transactions", error);
    }
  };

  const deleteSelected = () => {
    try {
      removeTransactions([...selectedIds]);
      showToast({ kind: "success", title: "Transactions deleted", description: `${selectedIds.size} transaction(s) removed.` });
      setSelectedIds(new Set());
      setDeleteSelectedOpen(false);
    } catch (error) {
      notifyError("Could not delete transactions", error);
    }
  };

  const deleteSingle = () => {
    if (!deleteTarget) return;
    try {
      removeTransaction(deleteTarget.id);
      showToast({ kind: "success", title: "Transaction deleted", description: "The dashboard has been updated." });
      setDeleteTarget(null);
      setDetail(null);
    } catch (error) {
      notifyError("Could not delete transaction", error);
    }
  };

  const toggleFlag = (transaction: Transaction) => {
    const nextStatus = transaction.reviewStatus === "flagged" ? "reviewed" : "flagged";
    try {
      updateTransaction(transaction.id, { reviewStatus: nextStatus });
      showToast({
        kind: "success",
        title: nextStatus === "flagged" ? "Transaction flagged" : "Flag removed",
        description: transaction.merchant,
      });
    } catch (error) {
      notifyError("Could not update review status", error);
    }
  };

  const addCategory = (category: Omit<UserCategory, "id" | "isSystem">) => {
    try {
      financeStore.addCategory(category);
      showToast({ kind: "success", title: "Category added", description: category.name });
    } catch (error) {
      notifyError("Could not add category", error);
      throw error;
    }
  };

  const updateCategory = (
    id: string,
    patch: Partial<Pick<UserCategory, "name" | "type" | "color" | "active">>,
  ) => {
    try {
      financeStore.updateCategory(id, patch);
    } catch (error) {
      notifyError("Could not update category", error);
      throw error;
    }
  };

  const removeCategory = (category: UserCategory) => {
    try {
      financeStore.deleteCategory(category.id);
      showToast({
        kind: "success",
        title: "Category deleted",
        description: `${category.name} transactions moved to Other ${category.type === "income" ? "Income" : "Expenses"}.`,
      });
    } catch (error) {
      notifyError("Could not delete category", error);
    }
  };

  const addRule = (rule: Omit<UserCategoryRule, "id" | "createdAt">) => {
    try {
      financeStore.addRule(rule);
      showToast({ kind: "success", title: "Rule added", description: rule.name });
    } catch (error) {
      notifyError("Could not add rule", error);
      throw error;
    }
  };

  const updateRule = (id: string, patch: Partial<Omit<UserCategoryRule, "id" | "createdAt">>) => {
    try {
      financeStore.updateRule(id, patch);
    } catch (error) {
      notifyError("Could not update rule", error);
      throw error;
    }
  };

  const applyRule = (rule: UserCategoryRule, matches: Transaction[]) => {
    try {
      updateTransactions(matches.map((transaction) => transaction.id), (transaction) => ({
          category: rule.category,
          categorizationSource: "user",
          confidence: 1,
          reviewStatus: "reviewed",
          originalCategory: transaction.originalCategory ?? transaction.category,
        }));
      showToast({
        kind: "success",
        title: "Rule applied",
        description: `${matches.length} transaction(s) categorized as ${rule.category}.`,
      });
    } catch (error) {
      notifyError("Could not apply rule", error);
    }
  };

  return (
    <PageContainer className="space-y-6 pb-28">
      <PageHeader
        eyebrow="Transactions"
        title="Transaction center"
        description="Review activity, refine categories, and find patterns across your imported and demo transactions."
        actions={
          <>
            <Button variant="outline" onClick={() => setCategoryManagerOpen(true)} leftIcon={<TagIcon className="size-4" />}>
              Categories
            </Button>
            <Button variant="outline" onClick={() => setRulesManagerOpen(true)} leftIcon={<WrenchScrewdriverIcon className="size-4" />}>
              Rules
            </Button>
            <Button
              onClick={() => handleExport(filtered, "transactions-filtered.csv")}
              leftIcon={<ArrowDownTrayIcon className="size-4" />}
              disabled={!filtered.length}
            >
              Export CSV
            </Button>
          </>
        }
      />

      <Alert variant="info">
        Categorization is based on transparent text-matching rules, not an AI model. Review low-confidence matches before relying on them.
      </Alert>
      {getFinanceStoreWarning() && <Alert variant="warning">{getFinanceStoreWarning()}</Alert>}

      <TransactionSummaryCards summary={summary} />
      <TransactionInsights insights={insights} />

      <TransactionFilters
        filters={filters}
        onChange={(next) => {
          setFilters(next);
          setPage(1);
        }}
        sort={sort}
        onSortChange={(next) => {
          setSort(next);
          setPage(1);
        }}
        accounts={accounts}
        categories={snapshot.categories}
        onClear={() => {
          setFilters(DEFAULT_FILTERS);
          setPage(1);
        }}
      />

      <section className="space-y-3" aria-label="Transactions">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">All transactions</h2>
            <p className="text-xs text-ink-muted">
              {filtered.length} result(s) · {summary.reviewCount} need review
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs text-ink-muted">
            Rows per page
            <select
              className="min-h-9 rounded-lg border border-border bg-surface px-2 text-sm text-ink"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
            >
              {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
        </div>

        {pageData.length ? (
          <>
            <div className="hidden md:block">
              <TransactionTable
                transactions={pageData}
                accounts={accounts}
                categories={snapshot.categories}
                selectedIds={selectedIds}
                onToggle={toggleSelection}
                onToggleAll={togglePageSelection}
                onOpen={setDetail}
                onToggleFlag={toggleFlag}
                unusualIds={unusualIds}
              />
            </div>
            <div className="md:hidden">
              <TransactionCards
                transactions={pageData}
                accounts={accounts}
                selectedIds={selectedIds}
                onToggle={toggleSelection}
                onOpen={setDetail}
                onToggleFlag={toggleFlag}
                unusualIds={unusualIds}
              />
            </div>
            <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-surface px-5 py-12 text-center">
            <AdjustmentsHorizontalIcon className="mx-auto size-8 text-ink-muted" />
            <h3 className="mt-3 text-base font-semibold">No transactions match</h3>
            <p className="mt-1 text-sm text-ink-muted">Try adjusting your search or clearing one or more filters.</p>
            <Button className="mt-4" variant="outline" onClick={() => setFilters(DEFAULT_FILTERS)}>Clear filters</Button>
          </div>
        )}
      </section>

      <BulkActionsBar
        count={selectedIds.size}
        categories={snapshot.categories}
        onCategory={handleBulkCategory}
        onMarkReviewed={handleBulkReviewed}
        onExport={() => handleExport(selectedTransactions, "transactions-selected.csv")}
        onDelete={() => setDeleteSelectedOpen(true)}
        onClear={() => setSelectedIds(new Set())}
      />

      <TransactionDetailDrawer
        transaction={detail}
        categories={snapshot.categories}
        onClose={() => setDetail(null)}
        onSave={saveTransaction}
        onDelete={(transaction) => {
          setDetail(null);
          setDeleteTarget(transaction);
        }}
      />
      <ConfirmationDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteSingle}
        title="Delete transaction?"
        description={`Delete ${deleteTarget?.merchant ?? "this transaction"}? This change also updates the dashboard and cannot be undone.`}
        confirmLabel="Delete transaction"
        destructive
      />
      <ConfirmationDialog
        open={deleteSelectedOpen}
        onClose={() => setDeleteSelectedOpen(false)}
        onConfirm={deleteSelected}
        title={`Delete ${selectedIds.size} transactions?`}
        description="This removes the selected transactions from your local finance data and updates the dashboard. This cannot be undone."
        confirmLabel="Delete selected"
        destructive
      />
      <CategoryManagerDialog
        open={categoryManagerOpen}
        onClose={() => setCategoryManagerOpen(false)}
        categories={snapshot.categories}
        onAdd={addCategory}
        onUpdate={updateCategory}
        onDelete={removeCategory}
      />
      <RulesManagerDialog
        open={rulesManagerOpen}
        onClose={() => setRulesManagerOpen(false)}
        rules={snapshot.userRules}
        transactions={snapshot.transactions}
        categories={snapshot.categories}
        onAdd={addRule}
        onUpdate={updateRule}
        onDelete={(id) => {
          try {
            financeStore.deleteRule(id);
            showToast({ kind: "success", title: "Rule deleted" });
          } catch (error) {
            notifyError("Could not delete rule", error);
          }
        }}
        onApply={applyRule}
      />
    </PageContainer>
  );
}
