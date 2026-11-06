import type { Transaction } from "@/types/finance";
import type { UserCategory, UserCategoryRule } from "@/store/financeStore";
import { categorizeTransaction } from "./categorizationService";

export function previewRuleMatches(rule: UserCategoryRule, transactions: Transaction[]): Transaction[] {
  const keyword = rule.keyword.trim().toLocaleLowerCase();
  if (!keyword) return [];
  return transactions.filter((transaction) => {
    const description = (transaction.description ?? transaction.merchant).toLocaleLowerCase();
    if (rule.matchType === "equals") return description === keyword;
    if (rule.matchType === "startsWith") return description.startsWith(keyword);
    return description.includes(keyword);
  });
}

export function categorizeWithRules(
  transaction: Transaction,
  rules: UserCategoryRule[],
  categories: UserCategory[],
): Transaction {
  const result = categorizeTransaction(
    transaction.description ?? transaction.merchant,
    transaction.type,
    rules,
    categories,
  );
  return {
    ...transaction,
    merchant: result.merchant,
    category: result.category,
    categorizationSource: result.source,
    confidence: result.confidence,
    reviewStatus: result.reviewRequired ? "pending" : "reviewed",
    originalDescription: transaction.originalDescription ?? transaction.description ?? transaction.merchant,
    originalCategory: result.category !== transaction.category
      ? transaction.originalCategory ?? transaction.category
      : transaction.originalCategory,
  };
}
