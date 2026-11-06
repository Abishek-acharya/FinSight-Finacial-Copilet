import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import type { Transaction } from "@/types/finance";
import type { UserCategory, UserCategoryRule } from "@/store/financeStore";
import { previewRuleMatches } from "@/services/categorization/userRulesService";

export function RulesManagerDialog({
  open,
  onClose,
  rules,
  transactions,
  categories,
  onAdd,
  onUpdate,
  onDelete,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  rules: UserCategoryRule[];
  transactions: Transaction[];
  categories: UserCategory[];
  onAdd: (rule: Omit<UserCategoryRule, "id" | "createdAt">) => void;
  onUpdate: (id: string, patch: Partial<Omit<UserCategoryRule, "id" | "createdAt">>) => void;
  onDelete: (id: string) => void;
  onApply: (rule: UserCategoryRule, matches: Transaction[]) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");
  const [matchType, setMatchType] = useState<UserCategoryRule["matchType"]>("contains");
  const [pendingRule, setPendingRule] = useState<UserCategoryRule | null>(null);
  const [error, setError] = useState("");
  const activeCategories = categories.filter((item) => item.active);
  const draftRule = useMemo<UserCategoryRule>(() => ({
    id: "preview",
    name: keyword.trim() ? `Matches “${keyword.trim()}”` : "New rule",
    keyword,
    category,
    matchType,
    priority: 1,
    active: true,
    createdAt: "",
  }), [category, keyword, matchType]);
  const preview = keyword.trim() && category
    ? previewRuleMatches(draftRule, transactions)
    : [];
  const pendingMatches = pendingRule ? previewRuleMatches(pendingRule, transactions) : [];

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (!keyword.trim() || !category) throw new Error("Enter a match keyword and choose a category.");
      onAdd({
        name: `Matches “${keyword.trim()}”`,
        keyword: keyword.trim(),
        category,
        matchType,
        priority: rules.length + 1,
        active: true,
      });
      setKeyword("");
      setError("");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not add rule.");
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title="Categorization rules" description="Custom rules take priority over built-in text rules. Matching is deterministic and happens locally." size="lg">
        <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
          <form onSubmit={submit} className="space-y-3 rounded-xl border border-border p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-muted">
                Match text
                <input className="min-h-11 rounded-lg border border-border bg-surface px-3 text-sm text-ink" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="e.g. SWIGGY" />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-muted">
                Match type
                <select className="min-h-11 rounded-lg border border-border bg-surface px-3 text-sm text-ink" value={matchType} onChange={(event) => setMatchType(event.target.value as UserCategoryRule["matchType"])}>
                  <option value="contains">Contains</option>
                  <option value="equals">Equals</option>
                  <option value="startsWith">Starts with</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-muted sm:col-span-2">
                Assign category
                <select className="min-h-11 rounded-lg border border-border bg-surface px-3 text-sm text-ink" value={category} onChange={(event) => setCategory(event.target.value)}>
                  <option value="">Choose category</option>
                  {activeCategories.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
                </select>
              </label>
            </div>
            {keyword.trim() && category && (
              <p className="text-xs text-ink-muted" aria-live="polite">
                Preview: {preview.length} matching transaction(s) will be categorized as <strong>{category}</strong>.
              </p>
            )}
            {error && <p className="text-xs text-error" role="alert">{error}</p>}
            <Button type="submit" size="sm">Add rule</Button>
          </form>

          <ul className="space-y-2">
            {rules.length === 0 && <li className="rounded-lg bg-surface-secondary/40 p-4 text-sm text-ink-muted">No custom rules yet.</li>}
            {rules.map((rule) => {
              const matches = previewRuleMatches(rule, transactions);
              return (
                <li key={rule.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{rule.name}</p>
                    <p className="text-xs text-ink-muted">{rule.matchType} “{rule.keyword}” → {rule.category} · {matches.length} match(es)</p>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                    <input type="checkbox" checked={rule.active} onChange={(event) => onUpdate(rule.id, { active: event.target.checked })} />
                    Active
                  </label>
                  {rule.active && matches.length > 0 && (
                    <Button size="sm" variant="outline" onClick={() => setPendingRule(rule)}>Apply</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => onDelete(rule.id)}>Delete</Button>
                </li>
              );
            })}
          </ul>
          <div className="flex justify-end border-t border-border pt-3">
            <Button variant="outline" onClick={onClose}>Done</Button>
          </div>
        </div>
      </Modal>
      <ConfirmationDialog
        open={pendingRule !== null}
        onClose={() => setPendingRule(null)}
        onConfirm={() => {
          if (pendingRule) onApply(pendingRule, pendingMatches);
          setPendingRule(null);
        }}
        title="Apply this rule?"
        description={`Apply “${pendingRule?.keyword ?? ""}” to ${pendingMatches.length} matching transaction(s)?`}
        confirmLabel="Apply to matches"
      />
    </>
  );
}
