import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

export type ToastKind = "success" | "error" | "info";
export interface ToastOptions {
  title: string;
  description?: string;
  kind?: ToastKind;
  duration?: number;
}
interface ToastItem extends ToastOptions { id: number }
type ToastContextValue = { showToast: (toast: ToastOptions) => number; dismissToast: (id: number) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

const toastStyles: Record<ToastKind, string> = {
  success: "border-[#cfe6d6]",
  error: "border-[#f1d0cc]",
  info: "border-border",
};
const toastIcons = {
  success: CheckCircleIcon,
  error: ExclamationCircleIcon,
  info: InformationCircleIcon,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismissToast = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback((toast: ToastOptions) => {
    const id = ++nextId.current;
    const item = { ...toast, id, kind: toast.kind ?? "info" };
    setToasts((items) => [...items, item].slice(-5));
    if (toast.duration !== 0) {
      timers.current.set(id, setTimeout(() => dismissToast(id), toast.duration ?? 4000));
    }
    return id;
  }, [dismissToast]);

  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <div
        className="fixed right-4 top-4 z-[var(--z-toast)] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 sm:right-6 sm:top-6"
        aria-label="Notifications"
      >
        {toasts.map((toast) => {
          const Icon = toastIcons[toast.kind ?? "info"];
          return (
            <div
              key={toast.id}
              role={toast.kind === "error" ? "alert" : "status"}
              className={cn("flex items-start gap-3 rounded-xl border bg-surface p-4 shadow-lg", toastStyles[toast.kind ?? "info"])}
            >
              <Icon className={cn("mt-0.5 size-5 shrink-0", toast.kind === "error" ? "text-error" : toast.kind === "success" ? "text-success" : "text-accent-secondary")} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{toast.title}</p>
                {toast.description && <p className="mt-1 text-sm text-ink-muted">{toast.description}</p>}
              </div>
              <Button variant="ghost" size="icon" aria-label="Dismiss notification" onClick={() => dismissToast(toast.id)} className="-mr-2 -mt-2 size-8">
                <XMarkIcon className="size-4" />
              </Button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used within a ToastProvider.");
  return value;
}