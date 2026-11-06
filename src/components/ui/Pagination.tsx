import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/20/solid";
import { Button } from "./Button";

export interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, pageCount, onPageChange, className }: PaginationProps) {
  const count = Math.max(1, Math.floor(pageCount));
  const current = Math.min(count, Math.max(1, Math.floor(page)));
  return (
    <nav aria-label="Pagination" className={`flex items-center justify-between gap-3 ${className ?? ""}`}>
      <Button
        variant="outline"
        size="sm"
        aria-label="Previous page"
        disabled={current === 1}
        onClick={() => onPageChange(current - 1)}
        leftIcon={<ChevronLeftIcon className="size-4" />}
      >
        <span className="hidden sm:inline">Previous</span>
      </Button>
      <span className="text-sm text-ink-muted" aria-live="polite">
        Page <strong className="tabular-nums text-ink">{current}</strong> of{" "}
        <strong className="tabular-nums text-ink">{count}</strong>
      </span>
      <Button
        variant="outline"
        size="sm"
        aria-label="Next page"
        disabled={current === count}
        onClick={() => onPageChange(current + 1)}
        rightIcon={<ChevronRightIcon className="size-4" />}
      >
        <span className="hidden sm:inline">Next</span>
      </Button>
    </nav>
  );
}