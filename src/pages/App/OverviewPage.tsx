import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { AIInsightsPanel } from "@/components/dashboard/AIInsightsPanel";
import { BudgetOverview } from "@/components/dashboard/BudgetOverview";
import { BudgetSnapshotCard } from "@/components/budget/BudgetSnapshotCard";
import { ForecastSnapshotCard } from "@/components/forecast/ForecastSnapshotCard";
import { CashFlowSummary } from "@/components/dashboard/CashFlowSummary";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ExpenseCategoryChart } from "@/components/dashboard/ExpenseCategoryChart";
import { FinancialHealthCard } from "@/components/dashboard/FinancialHealthCard";
import { FinancialMetricCard } from "@/components/dashboard/FinancialMetricCard";
import { IncomeExpenseChart } from "@/components/dashboard/IncomeExpenseChart";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { RecurringPayments } from "@/components/dashboard/RecurringPayments";
import { SpendingTrendChart } from "@/components/dashboard/SpendingTrendChart";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardData } from "@/hooks/useDashboardData";
import type { DashboardRange } from "@/types/finance";
import { formatCurrencyINR } from "@/utils/financeCalculations";

export default function OverviewPage() {
  const { user } = useAuth();
  const [range, setRange] = useState<DashboardRange>("6M");
  const dashboard = useDashboardData(range);
  const currentMonth = dashboard.monthlyTrend[dashboard.monthlyTrend.length - 1];
  const previousMonth = dashboard.monthlyTrend[dashboard.monthlyTrend.length - 2];
  const getMonthChange = (current: number, previous: number) => previous > 0
    ? `${current >= previous ? "+" : ""}${(((current - previous) / previous) * 100).toFixed(1)}% vs last month`
    : "No prior data";
  const incomeChange = currentMonth && previousMonth
    ? getMonthChange(currentMonth.income, previousMonth.income)
    : "No prior data";
  const expensesChange = currentMonth && previousMonth
    ? getMonthChange(currentMonth.expenses, previousMonth.expenses)
    : "No prior data";

  const metrics = [
    { label: "Total balance", value: dashboard.totalBalance === null ? "Unavailable" : formatCurrencyINR(dashboard.totalBalance), delta: "Statement balance", tone: "neutral" as const },
    { label: "Monthly income", value: formatCurrencyINR(dashboard.income), delta: incomeChange, tone: "neutral" as const },
    { label: "Monthly expenses", value: formatCurrencyINR(dashboard.expenses), delta: expensesChange, tone: "neutral" as const },
    { label: "Monthly savings", value: formatCurrencyINR(dashboard.savings), delta: `${dashboard.savingsRate.toFixed(1)}% savings rate`, tone: "neutral" as const },
  ];

  return (
    <PageContainer className="space-y-8">
      <DashboardHeader name={user?.name?.split(" ")[0] ?? "there"} selectedRange={range} onSelectRange={setRange} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <FinancialMetricCard key={metric.label} label={metric.label} value={metric.value} delta={metric.delta} tone={metric.tone} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <IncomeExpenseChart data={dashboard.monthlyTrend} />
        <FinancialHealthCard score={dashboard.healthScore} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <ExpenseCategoryChart data={dashboard.categoryBreakdown} />
        <SpendingTrendChart data={dashboard.dailySpendTrend} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <RecentTransactions transactions={dashboard.recentTransactions} />
        <div className="space-y-6">
          <BudgetOverview budgetOverview={dashboard.budgetOverview} />
          <BudgetSnapshotCard />
          <ForecastSnapshotCard />
          <AIInsightsPanel insights={dashboard.insightCards} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CashFlowSummary cashFlow={dashboard.cashFlow} />
        <RecurringPayments payments={dashboard.recurringPayments} />
      </div>

      <QuickActions />
    </PageContainer>
  );
}
