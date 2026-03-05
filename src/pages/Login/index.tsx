/* Página de Login — split-screen con branding + formulario */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  CheckCircle as CheckIcon,
} from "@mui/icons-material";
import { useAuth } from "../../context/AuthContext";
import { brand } from "../../theme";

/* Features que se muestran en el panel izquierdo */
const features = [
  {
    title: "Gestión integral",
    description: "Administra todas las áreas de tu empresa desde una única plataforma integrada.",
  },
  {
    title: "Análisis avanzado",
    description: "Obtén informes detallados y visualizaciones para tomar mejores decisiones de negocio.",
  },
  {
    title: "Seguridad de datos",
    description: "Protección de nivel empresarial para mantener tus datos seguros y cumplir con las normativas.",
  },
];

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

    if (!identifier.trim() || !password.trim()) {
      setError("Por favor completa todos los campos");
      return;
    }

    setLoading(true);
    try {
      await login({ identifier: identifier.trim(), password });
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } } };
      setError(axiosError.response?.data?.error || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* ── Panel izquierdo: branding ───────────────────────── */}
      <Box
        sx={{
          flex: 1,
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          justifyContent: "center",
          px: { md: 6, lg: 10 },
          py: 6,
          background: `linear-gradient(135deg, ${brand.navy} 0%, #16213e 50%, ${brand.purpleDark} 100%)`,
          color: "white",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Círculos decorativos de fondo */}
        <Box
          sx={{
            position: "absolute",
            top: -100,
            right: -100,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${brand.purple}33, transparent)`,
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -60,
            left: -60,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${brand.accent}22, transparent)`,
          }}
        />

        {/* Logo */}
        <Typography variant="h4" fontWeight={800} mb={6} sx={{ color: "white", position: "relative" }}>
          XTask
        </Typography>

        {/* Título principal */}
        <Typography variant="h3" fontWeight={800} mb={2} lineHeight={1.2} sx={{ position: "relative" }}>
          Plataforma de gestión empresarial
        </Typography>

        <Typography variant="body1" mb={5} sx={{ opacity: 0.8, maxWidth: 480, position: "relative", lineHeight: 1.7 }}>
          Accede a nuestra completa plataforma de gestión empresarial. Administra proyectos, finanzas, recursos humanos y más en un solo lugar.
        </Typography>

        {/* Features */}
        <Box sx={{ position: "relative" }}>
          {features.map((feature) => (
            <Box key={feature.title} display="flex" gap={2} mb={3}>
              <CheckIcon sx={{ color: brand.accent, fontSize: 28, mt: 0.2 }} />
              <Box>
                <Typography variant="subtitle1" fontWeight={700} sx={{ color: brand.accent }}>
                  {feature.title}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.7, color: "white", mt: 0.3 }}>
                  {feature.description}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── Panel derecho: formulario ───────────────────────── */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          px: { xs: 3, sm: 6 },
          py: 4,
          bgcolor: "white",
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 420 }}>
          {/* Título del formulario */}
          <Typography variant="h4" fontWeight={700} mb={1}>
            Iniciar sesión
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={4}>
            Introduce tus credenciales para acceder a la plataforma
          </Typography>

          {/* Error */}
          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {/* Formulario */}
          <Box component="form" onSubmit={handleSubmit}>
            {/* Campo: identificador */}
            <Typography variant="body2" fontWeight={600} mb={0.5} color="text.primary">
              Usuario o Email
            </Typography>
            <TextField
              fullWidth
              placeholder="admin@xtask.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoFocus
              autoComplete="username"
              disabled={loading}
              size="medium"
              sx={{ mb: 2.5 }}
            />

            {/* Campo: contraseña */}
            <Typography variant="body2" fontWeight={600} mb={0.5} color="text.primary">
              Contraseña
            </Typography>
            <TextField
              fullWidth
              placeholder="••••••••"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
              size="medium"
              sx={{ mb: 3 }}
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

            {/* Botón submit */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                py: 1.5,
                fontSize: "1rem",
                background: `linear-gradient(135deg, ${brand.navy} 0%, ${brand.purple} 100%)`,
                "&:hover": {
                  background: `linear-gradient(135deg, ${brand.navy} 0%, ${brand.purpleLight} 100%)`,
                },
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "Iniciar sesión"}
            </Button>
          </Box>

          {/* Footer */}
          <Typography variant="caption" color="text.secondary" display="block" textAlign="center" mt={4}>
            © 2026 XTask. Todos los derechos reservados.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
