import { useSyncExternalStore } from "react";
import { financeStore } from "@/store/financeStore";

export function useFinanceStore() {
  return useSyncExternalStore(
    (callback) => financeStore.subscribe(callback),
    () => financeStore.getSnapshot(),
    () => financeStore.getSnapshot(),
  );
}
