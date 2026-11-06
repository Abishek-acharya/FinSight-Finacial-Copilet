import { useMemo } from "react";
import type { Transaction } from "@/types/finance";
import {
  applyFilters,
  applySort,
  buildInsights,
  summarize,
  type SortKey,
  type TransactionFiltersState,
} from "@/services/transactionFilters";
import type { Account } from "@/types/finance";

export function useTransactions(
  transactions: Transaction[],
  accounts: Account[],
  filters: TransactionFiltersState,
  sort: SortKey,
  page: number,
  pageSize: number,
) {
  const filtered = useMemo(
    () => applyFilters(transactions, filters, accounts),
    [transactions, filters, accounts],
  );
  const sorted = useMemo(() => applySort(filtered, sort), [filtered, sort]);
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const summary = useMemo(() => summarize(filtered), [filtered]);
  const insights = useMemo(() => buildInsights(filtered), [filtered]);

  return {
    filtered,
    pageData: sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    pageCount,
    currentPage,
    summary,
    insights,
  };
}
