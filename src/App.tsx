/* App principal — Router y Providers */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sileo";
import "sileo/styles.css";
import { AuthProvider } from "./context/AuthContext";
import theme from "./theme";
import ProtectedRoute from "./components/ProtectedRoute";
import { MainLayout } from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import LoginPage from "./pages/Login";
import AuthCallbackPage from "./pages/AuthCallback";
import LandingPage from "./pages/Landing";
import DashboardPage from "./pages/Dashboard";
import ProjectsPage from "./pages/Projects";
import EmployeesPage from "./pages/Employees";
import PayrollPage from "./pages/Payroll";
import EmployeeDetailPage from "./pages/Payroll/EmployeeDetail";
import FinancePage from "./pages/Finance";
import ResourcesPage from "./pages/Finance/Resources";
import KpisPage from "./pages/Kpis";
import SkillsPage from "./pages/Skills";
import DocumentsPage from "./pages/Documents";
import AssistantPage from "./pages/Assistant";
import OrgChartPage from "./pages/OrgChart";
import OnboardingPage from "./pages/Onboarding";
import DocGenPage from "./pages/DocGen";
import OkrsPage from "./pages/Okrs";
import ContractsPage from "./pages/Contracts";
import PlansPage from "./pages/Plans";
import LeavesPage from "./pages/Leaves";
import RecruitingPage from "./pages/Recruiting";
import ActivitiesPage from "./pages/Activities";
import PayoutsPage from "./pages/Payouts";
import ApprovalsPage from "./pages/Approvals";
import ForecastingPage from "./pages/Forecasting";
import MockSignPage from "./pages/MockSign";
import SettingsPage from "./pages/Settings";
import AdminPage from "./pages/Admin";
import BenefitsPage from "./pages/Benefits";
import VaultPage from "./pages/Vault";
import AttritionPage from "./pages/Attrition";
import PeopleAnalyticsPage from "./pages/PeopleAnalytics";
import BIPage from "./pages/BI";
import ReviewsPage from "./pages/Reviews";
import CompAnalyticsPage from "./pages/CompAnalytics";
import MySpacePage from "./pages/MySpace";

/* Cliente de React Query (cache global) */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000, /* 30s antes de refetch */
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Toaster position="top-right" theme="light" offset={{ top: 24, right: 24 }} />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ErrorBoundary>
          <BrowserRouter>
            <Routes>
              {/* Rutas públicas */}
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />

              {/* Rutas protegidas con layout (Sidebar + Navbar) */}
              <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/proyectos" element={<ProjectsPage />} />
                  <Route path="/actividades" element={<ActivitiesPage />} />
                  <Route path="/empleados" element={<EmployeesPage />} />
                  <Route path="/nominas" element={<PayrollPage />} />
                  <Route path="/nominas/empleado/:id" element={<EmployeeDetailPage />} />
                  <Route path="/finanzas" element={<FinancePage />} />
                  <Route path="/finanzas/recursos" element={<ResourcesPage />} />
                  <Route path="/kpis" element={<KpisPage />} />
                  <Route path="/habilidades" element={<SkillsPage />} />
                  <Route path="/documentos" element={<DocumentsPage />} />
                  <Route path="/asistente" element={<AssistantPage />} />
                  <Route path="/organigrama" element={<OrgChartPage />} />
                  <Route path="/onboarding" element={<OnboardingPage />} />
                  <Route path="/generador" element={<DocGenPage />} />
                  <Route path="/okrs" element={<OkrsPage />} />
                  <Route path="/contratos" element={<ContractsPage />} />
                  <Route path="/comisiones" element={<PlansPage />} />
                  <Route path="/ausencias" element={<LeavesPage />} />
                  <Route path="/recruiting" element={<RecruitingPage />} />
                  <Route path="/pagos" element={<PayoutsPage />} />
                  <Route path="/aprobaciones" element={<ApprovalsPage />} />
                  <Route path="/forecast" element={<ForecastingPage />} />
                  <Route path="/contratos/:id/mock-sign" element={<MockSignPage />} />
                  <Route path="/configuracion" element={<SettingsPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="/beneficios" element={<BenefitsPage />} />
                  <Route path="/boveda" element={<VaultPage />} />
                  <Route path="/retencion" element={<AttritionPage />} />
                  <Route path="/people-analytics" element={<PeopleAnalyticsPage />} />
                  <Route path="/bi" element={<BIPage />} />
                  <Route path="/reviews" element={<ReviewsPage />} />
                  <Route path="/comp-analytics" element={<CompAnalyticsPage />} />
                  <Route path="/yo" element={<MySpacePage />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
          </ErrorBoundary>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
