import type { Transaction } from "@/types/finance";
import { financeStore } from "@/store/financeStore";

export function updateTransaction(id: string, patch: Partial<Transaction>) {
  financeStore.updateTransaction(id, patch);
}

export function updateTransactions(
  ids: string[],
  patch: Partial<Transaction> | ((transaction: Transaction) => Partial<Transaction>),
) {
  financeStore.updateManyTransactions(ids, patch);
}

export function deleteTransaction(id: string) {
  financeStore.deleteTransaction(id);
}

export function deleteTransactions(ids: string[]) {
  financeStore.deleteTransactions(ids);
}
