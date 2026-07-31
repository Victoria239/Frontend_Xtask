/* Ruta protegida: redirige a /login si no está autenticado */

import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { CircularProgress, Box } from "@mui/material";

interface ProtectedRouteProps {
  requiredRole?: "admin" | "manager";
}

export default function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin, isManager, loading } = useAuth();

  /* Mostrar spinner mientras carga la sesión */
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  /* No autenticado → login */
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  /* Verificar rol requerido */
  if (requiredRole === "admin" && !isAdmin) {
    return <Navigate to="/" replace />;
  }
  if (requiredRole === "manager" && !isManager) {
    return <Navigate to="/" replace />;
  }

  /* Renderizar rutas hijas */
  return <Outlet />;
}
