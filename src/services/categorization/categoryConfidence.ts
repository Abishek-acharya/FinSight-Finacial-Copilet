import type { RuleStrength } from "./categoryRules";

const STRENGTH_SCORE: Record<RuleStrength, number> = {
  strong: 0.92,
  medium: 0.72,
  weak: 0.5,
};

export function scoreConfidence(
  strength: RuleStrength | null,
  exactMerchantMatch: boolean,
  typeMismatch: boolean,
  userRule: boolean,
): number {
  if (userRule) return 1;
  if (strength === null) return 0;
  let score = STRENGTH_SCORE[strength];
  if (exactMerchantMatch) score = Math.min(1, score + 0.05);
  if (typeMismatch) score = Math.max(0, score - 0.3);
  return Math.round(score * 100) / 100;
}

export function requiresReview(confidence: number): boolean {
  return confidence < 0.6;
}
