import type { ExtractedRow } from "@/types/statement";
import { financeStore } from "@/store/financeStore";
import { categorizeTransaction } from "@/services/categorization/categorizationService";

export function guessCategory(description: string): string {
  const { userRules, categories } = financeStore.getSnapshot();
  return categorizeTransaction(description, null, userRules, categories).category;
}

export function normalizeRows(rows: ExtractedRow[]): ExtractedRow[] {
  const { userRules, categories } = financeStore.getSnapshot();
  return rows.map((row) => {
    const type =
      row.type ??
      (row.credit && row.credit > 0 ? "income" : row.debit && row.debit > 0 ? "expense" : null);
    const result = categorizeTransaction(row.description, type, userRules, categories);
    return {
      ...row,
      merchant: result.merchant,
      type,
      category: result.category,
    };
  });
}
