import type { TransactionType } from "@/types/finance";
import type { UserCategory, UserCategoryRule } from "@/store/financeStore";
import { SYSTEM_RULES, type CategoryRule } from "./categoryRules";
import { normalizeDescription, recognizeMerchant } from "./merchantRecognition";
import { requiresReview, scoreConfidence } from "./categoryConfidence";

export interface CategorizationResult {
  category: string;
  merchant: string;
  confidence: number;
  source: "rule" | "user" | "import";
  reviewRequired: boolean;
}

function isIncomeCategory(category: UserCategory | undefined): boolean {
  return category?.type === "income";
}

function matchUserRule(description: string, rules: UserCategoryRule[]): UserCategoryRule | null {
  const value = normalizeDescription(description).toLocaleLowerCase();
  for (const rule of [...rules].filter((item) => item.active).sort((a, b) => a.priority - b.priority)) {
    const keyword = normalizeDescription(rule.keyword).toLocaleLowerCase();
    if (!keyword) continue;
    if (
      (rule.matchType === "contains" && value.includes(keyword)) ||
      (rule.matchType === "equals" && value === keyword) ||
      (rule.matchType === "startsWith" && value.startsWith(keyword))
    ) {
      return rule;
    }
  }
  return null;
}

function containsKeyword(description: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, "i").test(description);
}

function findSystemRule(
  description: string,
  type: TransactionType | null,
  categories: UserCategory[],
): { rule: CategoryRule; keyword: string } | null {
  const normalized = normalizeDescription(description).toLocaleLowerCase();
  let best: { rule: CategoryRule; keyword: string; score: number; exact: boolean } | null = null;
  for (const rule of SYSTEM_RULES) {
    const matchedCategory = categories.find((category) => category.name === rule.category);
    if (matchedCategory && !matchedCategory.active) continue;
    const isIncomeRule = matchedCategory?.type === "income";
    if (type && rule.appliesTo !== "both" && rule.appliesTo !== type) {
      const oppositeRuleType = rule.appliesTo === "income" ? "expense" : "income";
      if (type !== oppositeRuleType) continue;
    }
    for (const keyword of rule.keywords) {
      const phrase = keyword.toLocaleLowerCase();
      if (!containsKeyword(normalized, phrase)) continue;
      const exact = normalized === phrase || normalized.startsWith(`${phrase} `) || normalized.includes(` ${phrase}`);
      const mismatch = type !== null && isIncomeRule !== (type === "income");
      const score =
        (rule.strength === "strong" ? 3 : rule.strength === "medium" ? 2 : 1) -
        (mismatch ? 0.5 : 0);
      if (!best || (exact && !best.exact) || (exact === best.exact && score > best.score)) {
        best = { rule, keyword, score, exact };
      }
    }
  }
  return best;
}

export function categorizeTransaction(
  description: string,
  type: TransactionType | null,
  userRules: UserCategoryRule[] = [],
  categories: UserCategory[] = [],
): CategorizationResult {
  const merchant = recognizeMerchant(description);
  const customMatch = matchUserRule(description, userRules);
  if (customMatch && categories.some((category) => category.name === customMatch.category && category.active)) {
    return {
      category: customMatch.category,
      merchant,
      confidence: scoreConfidence(null, false, false, true),
      source: "user",
      reviewRequired: false,
    };
  }

  const match = findSystemRule(description, type, categories);
  if (match) {
    const category = categories.find((item) => item.name === match.rule.category);
    const mismatch = type !== null && isIncomeCategory(category) !== (type === "income");
    const confidence = scoreConfidence(match.rule.strength, match.keyword === merchant.toLowerCase(), mismatch, false);
    return {
      category: match.rule.category,
      merchant,
      confidence,
      source: "rule",
      reviewRequired: requiresReview(confidence),
    };
  }

  return {
    category: type === "income" ? "Other Income" : "Other Expenses",
    merchant,
    confidence: 0,
    source: "import",
    reviewRequired: true,
  };
}
