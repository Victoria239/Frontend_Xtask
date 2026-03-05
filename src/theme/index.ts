/* Tema personalizado de MUI para XTask — paleta dark purple / navy */

import { createTheme } from "@mui/material/styles";

/* Colores base de la marca */
export const brand = {
  navy: "#1a1a2e",         /* Fondo oscuro principal */
  purple: "#6c3ce0",       /* Púrpura vibrante (acciones) */
  purpleLight: "#8b5cf6",  /* Púrpura claro (hover) */
  purpleDark: "#5628c4",   /* Púrpura oscuro (pressed) */
  accent: "#00d4aa",       /* Verde-turquesa para checks e indicadores */
  surface: "#f8f9fc",      /* Fondo de contenido */
  white: "#ffffff",
};

const theme = createTheme({
  /* Paleta de colores */
  palette: {
    primary: {
      main: brand.purple,
      light: brand.purpleLight,
      dark: brand.purpleDark,
      contrastText: "#ffffff",
    },
    secondary: {
      main: brand.accent,
      light: "#33debb",
      dark: "#00b893",
      contrastText: "#1a1a2e",
    },
    background: {
      default: brand.surface,
      paper: brand.white,
    },
    text: {
      primary: "#1a1a2e",
      secondary: "#6b7280",
    },
    success: { main: "#10b981" },
    warning: { main: "#f59e0b" },
    error: { main: "#ef4444" },
    info: { main: "#3b82f6" },
    divider: "#e5e7eb",
  },

  /* Tipografía */
  typography: {
    fontFamily: "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
    h4: { fontWeight: 700, color: "#1a1a2e" },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    body2: { color: "#6b7280" },
  },

  /* Forma de los componentes */
  shape: {
    borderRadius: 10,
  },

  /* Personalización de componentes */
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 10,
          padding: "10px 24px",
        },
        contained: {
          boxShadow: "0 2px 8px rgba(108, 60, 224, 0.3)",
          "&:hover": { boxShadow: "0 4px 16px rgba(108, 60, 224, 0.4)" },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
          borderRadius: 14,
          border: "1px solid #f0f0f5",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          borderBottom: "1px solid #e5e7eb",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: { "& .MuiOutlinedInput-root": { borderRadius: 10 } },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500 },
      },
    },
  },
});

export default theme;
