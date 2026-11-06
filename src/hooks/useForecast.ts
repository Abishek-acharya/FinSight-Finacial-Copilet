import { useMemo } from "react";
import { buildForecast } from "@/services/forecast/forecastingService";
import type { ForecastFilters } from "@/types/forecast";
import { useFinanceStore } from "@/hooks/useFinanceStore";

export function useForecast(filters: ForecastFilters) {
  const snapshot = useFinanceStore();
  return useMemo(() => {
    const accountsById = new Map(snapshot.accounts.map((account) => [account.id, account]));
    for (const transaction of snapshot.transactions) {
      if (!accountsById.has(transaction.accountId)) {
        accountsById.set(transaction.accountId, {
          id: transaction.accountId,
          name: transaction.accountId,
          type: "savings",
          last4: "",
          balance: null,
        });
      }
    }
    for (const statement of snapshot.statements) {
      if (statement.status !== "completed" || !statement.maskedAccount || statement.maskedAccount === "—") continue;
      const digits = statement.maskedAccount.replace(/\D/g, "");
      const id = `imported-${digits || "x"}`;
      if (!accountsById.has(id)) {
        accountsById.set(id, {
          id,
          name: statement.accountNickname || statement.bank || "Imported account",
          type: statement.accountType === "credit" || statement.accountType === "current" ? statement.accountType : "savings",
          last4: digits.slice(-4),
          balance: null,
        });
      }
    }
    return buildForecast(snapshot.transactions, [...accountsById.values()], snapshot.budgetPlans, filters);
  }, [snapshot.transactions, snapshot.accounts, snapshot.statements, snapshot.budgetPlans, filters]);
}
