import { FunnelIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TRANSACTION_CATEGORIES } from "@/types/finance";
import type { DatePreset, SortKey, TransactionFiltersState } from "@/services/transactionFilters";
import type { Account } from "@/types/finance";
import type { UserCategory } from "@/store/financeStore";

interface Props {
  filters: TransactionFiltersState;
  onChange: (filters: TransactionFiltersState) => void;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  accounts: Account[];
  categories: UserCategory[];
  onClear: () => void;
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-ink-muted">
      {label}
      <select
        className="min-h-10 rounded-lg border border-border bg-surface px-2.5 text-sm text-ink"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

export function TransactionFilters({
  filters,
  onChange,
  sort,
  onSortChange,
  accounts,
  categories,
  onClear,
}: Props) {
  const update = <K extends keyof TransactionFiltersState>(key: K, value: TransactionFiltersState[K]) =>
    onChange({ ...filters, [key]: value });
  const customCategories = categories.filter((category) => category.active).map((category) => category.name);
  const categoryOptions = [...new Set([...TRANSACTION_CATEGORIES, ...customCategories])];
  const hasFilters = Object.entries(filters).some(([key, value]) =>
    key === "search" || key === "datePreset" || key === "dateFrom" || key === "dateTo"
      ? key === "search" ? Boolean(value) : key === "datePreset" ? value !== "all" : Boolean(value)
      : key === "type" || key === "category" || key === "accountId" || key === "review"
        ? value !== "all"
        : Boolean(value),
  );

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface p-4" aria-label="Transaction filters">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FunnelIcon className="size-4 text-accent-secondary" aria-hidden="true" />
          <h2 className="text-sm font-semibold">Find transactions</h2>
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={onClear} leftIcon={<XMarkIcon className="size-4" />}>
            Clear filters
          </Button>
        )}
      </div>
      <Input
        aria-label="Search transactions"
        placeholder="Search merchant, description, category, account, or ID"
        value={filters.search}
        onChange={(event) => update("search", event.target.value)}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField label="Date" value={filters.datePreset} onChange={(value) => update("datePreset", value as DatePreset)}>
          <option value="all">All time</option>
          <option value="this-month">This month</option>
          <option value="last-month">Last month</option>
          <option value="last-3-months">Last 3 months</option>
          <option value="custom">Custom range</option>
        </SelectField>
        <SelectField label="Type" value={filters.type} onChange={(value) => update("type", value as TransactionFiltersState["type"])}>
          <option value="all">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </SelectField>
        <SelectField label="Category" value={filters.category} onChange={(value) => update("category", value)}>
          <option value="all">All categories</option>
          {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
        </SelectField>
        <SelectField label="Account" value={filters.accountId} onChange={(value) => update("accountId", value)}>
          <option value="all">All accounts</option>
          {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
        </SelectField>
        <SelectField label="Review status" value={filters.review} onChange={(value) => update("review", value as TransactionFiltersState["review"])}>
          <option value="all">All statuses</option>
          <option value="pending">Needs review</option>
          <option value="reviewed">Reviewed</option>
          <option value="flagged">Flagged</option>
        </SelectField>
        <Input
          label="Minimum amount"
          type="number"
          min="0"
          step="0.01"
          value={filters.minAmount}
          onChange={(event) => update("minAmount", event.target.value)}
          placeholder="₹0"
        />
        <Input
          label="Maximum amount"
          type="number"
          min="0"
          step="0.01"
          value={filters.maxAmount}
          onChange={(event) => update("maxAmount", event.target.value)}
          placeholder="No limit"
        />
        <SelectField label="Sort by" value={sort} onChange={(value) => onSortChange(value as SortKey)}>
          <option value="date-desc">Newest first</option>
          <option value="date-asc">Oldest first</option>
          <option value="amount-desc">Highest amount</option>
          <option value="amount-asc">Lowest amount</option>
          <option value="merchant-asc">Merchant A–Z</option>
        </SelectField>
      </div>
      {filters.datePreset === "custom" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="From" type="date" value={filters.dateFrom} onChange={(event) => update("dateFrom", event.target.value)} />
          <Input label="To" type="date" value={filters.dateTo} onChange={(event) => update("dateTo", event.target.value)} />
        </div>
      )}
    </section>
  );
}
