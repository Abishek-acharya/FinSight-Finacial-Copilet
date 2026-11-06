import { useSyncExternalStore } from "react";
import { financeStore } from "@/store/financeStore";

export function useFinanceStore() {
  return useSyncExternalStore(
    financeStore.subscribe,
    financeStore.getSnapshot,
    financeStore.getSnapshot,
  );
}
