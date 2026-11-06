import { useMemo } from "react";
import { getDashboardData } from "@/services/dashboardService";
import type { DashboardRange } from "@/types/finance";
import { useFinanceStore } from "@/hooks/useFinanceStore";

export function useDashboardData(range: DashboardRange = "6M") {
  const { transactions } = useFinanceStore();
  return useMemo(() => getDashboardData(range, transactions), [range, transactions]);
}
