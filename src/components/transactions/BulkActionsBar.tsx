import { ArrowDownTrayIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import type { UserCategory } from "@/store/financeStore";

export function BulkActionsBar({
  count,
  categories,
  onCategory,
  onMarkReviewed,
  onExport,
  onDelete,
  onClear,
}: {
  count: number;
  categories: UserCategory[];
  onCategory: (category: string) => void;
  onMarkReviewed: () => void;
  onExport: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  if (!count) return null;
  return (
    <aside className="fixed inset-x-3 bottom-3 z-30 mx-auto max-w-5xl rounded-2xl border border-border bg-surface p-3 shadow-xl sm:inset-x-6 sm:p-4" aria-label="Bulk transaction actions">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">{count} selected</p>
          <Button variant="ghost" size="sm" onClick={onClear} aria-label="Clear selection">
            <XMarkIcon className="size-4" />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Change category for selected transactions"
            className="min-h-9 min-w-36 rounded-lg border border-border bg-surface px-2 text-xs"
            value=""
            onChange={(event) => {
              if (event.target.value) onCategory(event.target.value);
            }}
          >
            <option value="">Change category…</option>
            {categories.filter((category) => category.active).map((category) => (
              <option key={category.id} value={category.name}>{category.name}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={onMarkReviewed}>Mark reviewed</Button>
          <Button variant="outline" size="sm" onClick={onExport} leftIcon={<ArrowDownTrayIcon className="size-4" />}>
            Export
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete} leftIcon={<TrashIcon className="size-4" />}>
            Delete
          </Button>
        </div>
      </div>
    </aside>
  );
}
