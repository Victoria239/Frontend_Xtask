/* Tema personalizado de MUI para XTask */

import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  /* Paleta de colores */
  palette: {
    primary: {
      main: "#1976d2",      /* Azul principal */
      light: "#42a5f5",
      dark: "#1565c0",
    },
    secondary: {
      main: "#9c27b0",      /* Púrpura para acentos */
      light: "#ba68c8",
      dark: "#7b1fa2",
    },
    background: {
      default: "#f5f5f5",   /* Fondo general gris claro */
      paper: "#ffffff",
    },
    success: { main: "#2e7d32" },
    warning: { main: "#ed6c02" },
    error: { main: "#d32f2f" },
    info: { main: "#0288d1" },
  },

  /* Tipografía */
  typography: {
    fontFamily: "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },

  /* Forma de los componentes */
  shape: {
    borderRadius: 8,
  },

  /* Personalización de componentes */
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { boxShadow: "0 1px 3px rgba(0,0,0,0.12)" },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { boxShadow: "0 1px 3px rgba(0,0,0,0.12)" },
      },
    },
  },
});

export default theme;
