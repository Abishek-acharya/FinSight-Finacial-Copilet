import { useMemo } from "react";
import { getDashboardData } from "@/services/dashboardService";
import type { DashboardRange } from "@/types/finance";
import { useFinanceStore } from "@/hooks/useFinanceStore";

export function useDashboardData(range: DashboardRange = "6M") {
  const snapshot = useFinanceStore();
  return useMemo(
    () => getDashboardData(range, snapshot.transactions, snapshot.accounts, snapshot.budgetPlans),
    [range, snapshot.transactions, snapshot.accounts, snapshot.budgetPlans],
  );
}
