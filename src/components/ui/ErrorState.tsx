import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { Button } from "./Button";

export interface ErrorStateProps {
  title?: string;
  description: string;
  onRetry?: () => void;
}

export function ErrorState({ title = "Something went wrong", description, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <ExclamationTriangleIcon aria-hidden="true" className="mb-3 size-8 text-error" />
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-ink-muted">{description}</p>
      {onRetry && <Button variant="outline" size="sm" onClick={onRetry} className="mt-5">Try again</Button>}
    </div>
  );
}