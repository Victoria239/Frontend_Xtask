/* Página de Login — formulario de autenticación */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Visibility, VisibilityOff, Login as LoginIcon } from "@mui/icons-material";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  /* Estado del formulario */
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /* Si ya está autenticado, redirigir al dashboard */
  if (isAuthenticated) {
    navigate("/", { replace: true });
    return null;
  }

  /* Enviar formulario de login */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    /* Validación básica */
    if (!identifier.trim() || !password.trim()) {
      setError("Por favor completa todos los campos");
      return;
    }

    setLoading(true);
    try {
      await login({ identifier: identifier.trim(), password });
      navigate("/", { replace: true });
    } catch (err: unknown) {
      /* Extraer mensaje de error del backend */
      const axiosError = err as { response?: { data?: { error?: string } } };
      setError(axiosError.response?.data?.error || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      sx={{ bgcolor: "background.default" }}
    >
      <Card sx={{ width: 400, maxWidth: "90vw" }}>
        <CardContent sx={{ p: 4 }}>
          {/* Título */}
          <Box textAlign="center" mb={3}>
            <Typography variant="h4" color="primary" fontWeight={700}>
              XTask
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={1}>
              Inicia sesión para continuar
            </Typography>
          </Box>

          {/* Error */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Formulario */}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Usuario o email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              margin="normal"
              autoFocus
              autoComplete="username"
              disabled={loading}
            />

            <TextField
              fullWidth
              label="Contraseña"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              autoComplete="current-password"
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
              sx={{ mt: 3, mb: 1 }}
            >
              {loading ? "Ingresando..." : "Iniciar sesión"}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
