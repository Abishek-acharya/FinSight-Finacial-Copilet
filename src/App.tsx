import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "@/components/app/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PublicRoute } from "@/components/auth/PublicRoute";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import ForgotPasswordPage from "@/pages/Auth/ForgotPasswordPage";
import LoginPage from "@/pages/Auth/LoginPage";
import RegisterPage from "@/pages/Auth/RegisterPage";
import AssistantPage from "@/pages/App/AssistantPage";
import OverviewPage from "@/pages/App/OverviewPage";
import ReportsPage from "@/pages/App/ReportsPage";
import SettingsPage from "@/pages/App/SettingsPage";
import DemoDashboardPage from "@/pages/Demo/DemoDashboardPage";
import LandingPage from "@/pages/Landing/LandingPage";

const StatementsPage = lazy(() => import("@/pages/App/StatementsPage"));
const TransactionsPage = lazy(() => import("@/pages/App/TransactionsPage"));
const AnalyticsPage = lazy(() => import("@/pages/App/AnalyticsPage"));
const BudgetGoalsPage = lazy(() => import("@/pages/App/BudgetGoalsPage"));
const ForecastPage = lazy(() => import("@/pages/App/ForecastPage"));
const ActivityHistoryPage = lazy(() => import("@/pages/App/ActivityHistoryPage"));

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-4 px-6 py-10" aria-label="Loading page">
      <div className="h-8 w-1/3 rounded-lg bg-border/50" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-32 rounded-2xl bg-border/50" />
        <div className="h-32 rounded-2xl bg-border/50" />
        <div className="h-32 rounded-2xl bg-border/50" />
      </div>
      <div className="h-64 rounded-2xl bg-border/50" />
    </div>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
        <Route path="/demo" element={<DemoDashboardPage />} />

        <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<OverviewPage />} />
          <Route
            path="statements"
            element={
              <Suspense fallback={<PageSkeleton />}>
                <StatementsPage />
              </Suspense>
            }
          />
          <Route
            path="transactions"
            element={
              <Suspense fallback={<PageSkeleton />}>
                <TransactionsPage />
              </Suspense>
            }
          />
          <Route
            path="analytics"
            element={
              <Suspense fallback={<PageSkeleton />}>
                <AnalyticsPage />
              </Suspense>
            }
          />
          <Route
            path="budget-goals"
            element={
              <Suspense fallback={<PageSkeleton />}>
                <BudgetGoalsPage />
              </Suspense>
            }
          />
          <Route
            path="forecast"
            element={
              <Suspense fallback={<PageSkeleton />}>
                <ForecastPage />
              </Suspense>
            }
          />
          <Route path="assistant" element={<AssistantPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route
            path="activity"
            element={
              <Suspense fallback={<PageSkeleton />}>
                <ActivityHistoryPage />
              </Suspense>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}