/* App principal — Router y Providers */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import theme from "./theme";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/Login";
import DashboardPage from "./pages/Dashboard";

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
          <BrowserRouter>
            <Routes>
              {/* Ruta pública */}
              <Route path="/login" element={<LoginPage />} />

              {/* Rutas protegidas (requieren autenticación) */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<DashboardPage />} />
                {/* Aquí se agregarán las demás páginas */}
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
