/* App principal — Router y Providers */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import theme from "./theme";
import ProtectedRoute from "./components/ProtectedRoute";
import { MainLayout } from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import LoginPage from "./pages/Login";
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
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ErrorBoundary>
          <BrowserRouter>
            <Routes>
              {/* Rutas públicas */}
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />

              {/* Rutas protegidas con layout (Sidebar + Navbar) */}
              <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/proyectos" element={<ProjectsPage />} />
                  <Route path="/empleados" element={<EmployeesPage />} />
                  <Route path="/nominas" element={<PayrollPage />} />
                  <Route path="/nominas/empleado/:id" element={<EmployeeDetailPage />} />
                  <Route path="/finanzas" element={<FinancePage />} />
                  <Route path="/finanzas/recursos" element={<ResourcesPage />} />
                  <Route path="/kpis" element={<KpisPage />} />
                  <Route path="/habilidades" element={<SkillsPage />} />
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
