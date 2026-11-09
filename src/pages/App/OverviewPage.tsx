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
import { TiltCard } from "@/components/ui/TiltCard";
import { IncomeExpenseChart } from "@/components/dashboard/IncomeExpenseChart";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { ExpenseHeatmap } from "@/components/dashboard/ExpenseHeatmap";
import { CashFlowPaceWarning } from "@/components/dashboard/CashFlowPaceWarning";
import { SubscriptionDetectorCard } from "@/components/dashboard/SubscriptionDetectorCard";
import { TrialBalanceCard } from "@/components/dashboard/TrialBalanceCard";
import { LoanEmiSimulator } from "@/components/dashboard/LoanEmiSimulator";
import { AchievementBadgesCard } from "@/components/dashboard/AchievementBadgesCard";
import { LiveMLForecastCard } from "@/components/dashboard/LiveMLForecastCard";
import { SpendingPersonaCard } from "@/components/dashboard/SpendingPersonaCard";
import { MonteCarloGoalsCard } from "@/components/dashboard/MonteCarloGoalsCard";
import { CashFlowWaterfall } from "@/components/dashboard/CashFlowWaterfall";
import { TaxSummaryCard } from "@/components/dashboard/TaxSummaryCard";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardData } from "@/hooks/useDashboardData";
import type { DashboardRange } from "@/types/finance";
import { useFinanceStore } from "@/hooks/useFinanceStore";
import { buildTrialBalance, getFinancialAchievements } from "@/services/financialEngine";
import { formatCurrencyINR } from "@/utils/financeCalculations";

export default function OverviewPage() {
  const { user } = useAuth();
  const [range, setRange] = useState<DashboardRange>("6M");
  const dashboard = useDashboardData(range);
  const snapshot = useFinanceStore();
  const trialBalance = buildTrialBalance(snapshot.transactions, snapshot.accounts);
  const achievements = getFinancialAchievements(snapshot.transactions, snapshot.budgetPlans);
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
    { label: "Total balance", value: dashboard.totalBalance === null ? "Unavailable" : formatCurrencyINR(dashboard.totalBalance), numericValue: dashboard.totalBalance ?? undefined, delta: "Statement balance", tone: "neutral" as const },
    { label: "Monthly income", value: formatCurrencyINR(dashboard.income), numericValue: dashboard.income, delta: incomeChange, tone: "neutral" as const },
    { label: "Monthly expenses", value: formatCurrencyINR(dashboard.expenses), numericValue: dashboard.expenses, delta: expensesChange, tone: "neutral" as const },
    { label: "Monthly savings", value: formatCurrencyINR(dashboard.savings), numericValue: dashboard.savings, delta: `${dashboard.savingsRate.toFixed(1)}% savings rate`, tone: "neutral" as const },
  ];

  return (
    <PageContainer className="space-y-8">
      <DashboardHeader name={user?.name?.split(" ")[0] ?? "there"} selectedRange={range} onSelectRange={setRange} />

      <div className="grid gap-4 md:grid-cols-4">
        {metrics.map((metric, index) => (
          <TiltCard key={metric.label} className={index === 0 ? "md:col-span-2 md:row-span-2" : index === 3 ? "md:col-span-2" : ""}>
            <FinancialMetricCard
              label={metric.label}
              value={metric.value}
              numericValue={metric.numericValue}
              delta={metric.delta}
              tone={metric.tone}
              className="h-full"
            />
          </TiltCard>
        ))}
      </div>

      <CashFlowPaceWarning income={dashboard.income} expenses={dashboard.expenses} />

      <TrialBalanceCard trialBalance={trialBalance} />
      <AchievementBadgesCard achievements={achievements} />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <IncomeExpenseChart data={dashboard.monthlyTrend} />
        <FinancialHealthCard score={dashboard.healthScore} details={dashboard.healthScoreDetails} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CashFlowWaterfall transactions={snapshot.transactions} />
        <TaxSummaryCard transactions={snapshot.transactions} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <ExpenseCategoryChart data={dashboard.categoryBreakdown} />
        <ExpenseHeatmap transactions={snapshot.transactions} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <RecentTransactions transactions={dashboard.recentTransactions} />
        <div className="space-y-6">
          <BudgetOverview budgetOverview={dashboard.budgetOverview} />
          <BudgetSnapshotCard />
          <ForecastSnapshotCard />
          <MonteCarloGoalsCard />
          <SpendingPersonaCard />
          <LiveMLForecastCard />
          <AIInsightsPanel insights={dashboard.insightCards} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CashFlowSummary cashFlow={dashboard.cashFlow} />
        <SubscriptionDetectorCard transactions={snapshot.transactions} />
      </div>

      <LoanEmiSimulator monthlyCashFlow={dashboard.income - dashboard.expenses} />
      <QuickActions />
    </PageContainer>
  );
}
