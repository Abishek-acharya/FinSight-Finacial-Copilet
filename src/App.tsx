import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "@/components/app/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PublicRoute } from "@/components/auth/PublicRoute";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import ForgotPasswordPage from "@/pages/Auth/ForgotPasswordPage";
import LoginPage from "@/pages/Auth/LoginPage";
import RegisterPage from "@/pages/Auth/RegisterPage";
import AnalyticsPage from "@/pages/App/AnalyticsPage";
import AssistantPage from "@/pages/App/AssistantPage";
import BudgetGoalsPage from "@/pages/App/BudgetGoalsPage";
import OverviewPage from "@/pages/App/OverviewPage";
import ReportsPage from "@/pages/App/ReportsPage";
import SettingsPage from "@/pages/App/SettingsPage";
import StatementsPage from "@/pages/App/StatementsPage";
import TransactionsPage from "@/pages/App/TransactionsPage";
import DemoDashboardPage from "@/pages/Demo/DemoDashboardPage";
import LandingPage from "@/pages/Landing/LandingPage";

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
          <Route path="statements" element={<StatementsPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="budget-goals" element={<BudgetGoalsPage />} />
          <Route path="assistant" element={<AssistantPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}