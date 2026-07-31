/* Tema MUI XTask v2 — alineado con DESIGN.md (dark + sienna)
 * - Mode: dark
 * - Acento: warm sienna #C76A3F (no indigo de AI-tool)
 * - Tipografía: Geist con caída a Inter
 * - Sin gradient text, sin ghost-card shadows, sin radii > 16px
 * - Botones con scale(0.97) en :active
 *
 * El export `brand` mantiene las claves antiguas (purple, navy, etc.)
 * remapeadas a los nuevos colores para compatibilidad con páginas
 * existentes que hagan referencia directa.
 */

import { createTheme, alpha } from "@mui/material/styles";

/* Tokens — Xtask v5: content area en LIGHT mode (sidebar mantiene dark).
 * Acento cyan + aguamarina del brandbook.
 * Aubergine sigue presente en el sidebar y como hint en accents.
 */
const tokens = {
  /* Surfaces light */
  bg:        "#FFFFFF",   /* white puro — body principal */
  bg2:       "#F7F7F9",   /* light grey muy sutil — page bg secundario / hover */
  surface:   "#FFFFFF",   /* cards */
  surface2:  "#F2F2F5",   /* card hover */
  rule:      "#E5E5EA",   /* borde default */
  rule2:     "#D1D1D6",   /* borde emphasized */

  /* Texto: dark sobre white */
  ink:       "#1A1726",   /* casi negro con hint aubergine — body principal */
  text2:     "#605C70",   /* muted — contraste 7:1 sobre bg blanco */
  text3:     "#8E8A99",   /* low emphasis — contraste 4.5:1 */
  text4:     "#C4C2CC",   /* disabled */

  /* Brand accents — cyan funciona bien sobre blanco con un toque más profundo */
  accent:    "#02BDEA",   /* cyan signature */
  accent2:   "#01E3D5",   /* aguamarina */
  accentD:   "#0A4D70",   /* deep cyan para text-on-light cuando hace falta contraste */

  /* Brand aubergine — usado en chips, badges, sidebar */
  brand:     "#251948",   /* aubergine institucional */
  brand2:    "#3B2A6E",   /* tint claro */

  /* Secundarios */
  purple:    "#623BA6",
  amber:     "#FFA41B",

  success:   "#01B89E",   /* aguamarina ligeramente más oscura para contraste sobre blanco */
  warning:   "#E08A0E",   /* amber profundo para legibilidad sobre blanco */
  danger:    "#D14040",   /* red para errores */
  info:      "#0496BA",   /* cyan más profundo para texto sobre blanco */

  easeOut:   "cubic-bezier(0.23, 1, 0.32, 1)",
  easePress: "cubic-bezier(0.32, 0.72, 0, 1)",
  easeMove:  "cubic-bezier(0.77, 0, 0.175, 1)",
};

/* Claves legacy mapeadas al nuevo sistema para no romper páginas existentes */
export const brand = {
  navy:        tokens.bg,
  purple:      tokens.accent,
  purpleLight: tokens.accent2,
  purpleDark:  tokens.accentD,
  accent:      tokens.accent2,
  surface:     tokens.bg,
  white:       tokens.ink,
  /* alias nuevos */
  bg:          tokens.bg,
  surfaceDark: tokens.surface,
  rule:        tokens.rule,
  ink:         tokens.ink,
  text2:       tokens.text2,
  text3:       tokens.text3,
  ease:        tokens.easeOut,
};

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main:         tokens.accent,
      light:        tokens.accent2,
      dark:         tokens.accentD,
      contrastText: "#FFFFFF",
    },
    secondary: {
      main:         tokens.brand,
      light:        tokens.brand2,
      dark:         "#1A1235",
      contrastText: "#FFFFFF",
    },
    background: {
      default: tokens.bg,
      paper:   tokens.surface,
    },
    text: {
      primary:   tokens.ink,
      secondary: tokens.text2,
      disabled:  tokens.text4,
    },
    divider: tokens.rule,
    success: { main: tokens.success, contrastText: "#FFFFFF" },
    warning: { main: tokens.warning, contrastText: "#FFFFFF" },
    error:   { main: tokens.danger,  contrastText: "#FFFFFF" },
    info:    { main: tokens.info,    contrastText: "#FFFFFF" },
    action: {
      active:           tokens.ink,
      hover:            alpha(tokens.ink, 0.04),
      selected:         alpha(tokens.accent, 0.10),
      disabled:         tokens.text4,
      disabledBackground: alpha(tokens.ink, 0.06),
      focus:            alpha(tokens.accent, 0.18),
    },
  },

  typography: {
    fontFamily: "'Gilroy', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 14,
    htmlFontSize: 16,
    h1: { fontFamily: "'Bermont', 'Gilroy', 'Inter', sans-serif", fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.02 },
    h2: { fontFamily: "'Gilroy', 'Inter', sans-serif", fontWeight: 500, letterSpacing: "-0.02em",  lineHeight: 1.08 },
    h3: { fontFamily: "'Gilroy', 'Inter', sans-serif", fontWeight: 500, letterSpacing: "-0.018em", lineHeight: 1.15 },
    h4: { fontFamily: "'Gilroy', 'Inter', sans-serif", fontWeight: 500, letterSpacing: "-0.015em", lineHeight: 1.2 },
    h5: { fontFamily: "'Gilroy', 'Inter', sans-serif", fontWeight: 500, letterSpacing: "-0.012em", lineHeight: 1.25 },
    h6: { fontFamily: "'Gilroy', 'Inter', sans-serif", fontWeight: 500, letterSpacing: "-0.01em",  lineHeight: 1.3 },
    subtitle1: { fontWeight: 500, letterSpacing: "-0.005em" },
    subtitle2: { fontWeight: 500, letterSpacing: "-0.005em", color: tokens.text2 },
    body1:     { lineHeight: 1.55 },
    body2:     { lineHeight: 1.55, color: tokens.text2 },
    button:    { textTransform: "none", fontWeight: 500, letterSpacing: "-0.005em" },
    caption:   { color: tokens.text3, letterSpacing: 0 },
    overline:  { textTransform: "none", letterSpacing: 0, fontWeight: 500, color: tokens.text3 },
  },

  shape: { borderRadius: 10 },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        "html, body": {
          backgroundColor: tokens.bg,
          color: tokens.ink,
        },
        "::selection": { background: tokens.accentD, color: tokens.ink },
        "::-webkit-scrollbar": { width: 10, height: 10 },
        "::-webkit-scrollbar-track": { background: tokens.bg },
        "::-webkit-scrollbar-thumb": {
          background: tokens.rule2,
          borderRadius: 999,
          border: `2px solid ${tokens.bg}`,
        },
        "::-webkit-scrollbar-thumb:hover": { background: tokens.text4 },
      },
    },

    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 500,
          borderRadius: 8,
          padding: "10px 18px",
          letterSpacing: "-0.005em",
          transition: `background 160ms ${tokens.easeOut}, border-color 160ms ${tokens.easeOut}, color 160ms ${tokens.easeOut}, transform 120ms ${tokens.easePress}`,
          "&:active": { transform: "scale(0.97)" },
        },
        contained: {
          backgroundColor: tokens.ink,
          color: "#FFFFFF",
          boxShadow: "none",
          "&:hover": { backgroundColor: "#2A2540", boxShadow: "none" },
        },
        containedPrimary: {
          backgroundColor: tokens.accent,
          color: "#FFFFFF",
          "&:hover": { backgroundColor: tokens.info },   /* cyan más profundo en hover */
        },
        outlined: {
          borderColor: tokens.rule2,
          color: tokens.ink,
          "&:hover": { borderColor: tokens.text3, backgroundColor: tokens.bg2 },
        },
        text: {
          color: tokens.text2,
          "&:hover": { color: tokens.ink, backgroundColor: "transparent" },
        },
        sizeSmall:  { padding: "7px 14px", fontSize: 13 },
        sizeLarge:  { padding: "14px 26px", fontSize: 15 },
      },
    },

    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: tokens.bg2,
        },
        outlined: { borderColor: tokens.rule },
      },
    },

    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundColor: tokens.bg2,
          border: `1px solid ${tokens.rule}`,
          borderRadius: 12,
          boxShadow: "none",
          transition: `border-color 240ms ${tokens.easeOut}`,
          "&:hover": { borderColor: tokens.rule2 },
        },
      },
    },

    MuiCardContent: {
      styleOverrides: { root: { padding: "24px 28px", "&:last-child": { paddingBottom: "24px" } } },
    },

    MuiAppBar: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundColor: alpha(tokens.bg, 0.72),
          backdropFilter: "saturate(140%) blur(16px)",
          WebkitBackdropFilter: "saturate(140%) blur(16px)",
          boxShadow: "none",
          borderBottom: `1px solid ${tokens.rule}`,
          color: tokens.ink,
        },
      },
    },

    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: tokens.bg2,
          borderRight: `1px solid ${tokens.rule}`,
          backgroundImage: "none",
        },
      },
    },

    MuiToolbar: { styleOverrides: { root: { minHeight: 64 } } },

    MuiTextField: {
      defaultProps: { variant: "outlined", size: "medium" },
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 8,
            backgroundColor: tokens.surface,
            "& fieldset": { borderColor: tokens.rule, transition: `border-color 160ms ${tokens.easeOut}` },
            "&:hover fieldset": { borderColor: tokens.rule2 },
            "&.Mui-focused fieldset": { borderColor: tokens.accent, borderWidth: 1 },
          },
          "& .MuiInputLabel-root": { color: tokens.text2 },
          "& .MuiInputLabel-root.Mui-focused": { color: tokens.accent },
        },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: tokens.surface,
          "& .MuiOutlinedInput-notchedOutline": { borderColor: tokens.rule },
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          borderRadius: 6,
          letterSpacing: "-0.005em",
          backgroundColor: tokens.surface,
          color: tokens.ink,
          border: `1px solid ${tokens.rule}`,
        },
        colorPrimary: {
          backgroundColor: alpha(tokens.accent, 0.12),
          color: tokens.accent2,
          border: `1px solid ${alpha(tokens.accent, 0.3)}`,
        },
        colorSuccess: { backgroundColor: alpha(tokens.success, 0.12), color: tokens.success, border: `1px solid ${alpha(tokens.success, 0.3)}` },
        colorWarning: { backgroundColor: alpha(tokens.warning, 0.12), color: tokens.warning, border: `1px solid ${alpha(tokens.warning, 0.3)}` },
        colorError:   { backgroundColor: alpha(tokens.danger,  0.12), color: tokens.danger,  border: `1px solid ${alpha(tokens.danger,  0.3)}` },
      },
    },

    MuiDivider: { styleOverrides: { root: { borderColor: tokens.rule } } },

    MuiTableCell: {
      styleOverrides: {
        root: { borderBottom: `1px solid ${tokens.rule}`, color: tokens.ink },
        head: { color: tokens.text3, fontWeight: 500, textTransform: "none", letterSpacing: 0, fontSize: 12.5 },
      },
    },

    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: `background 160ms ${tokens.easeOut}, color 160ms ${tokens.easeOut}`,
          "&:hover": { backgroundColor: tokens.surface },
          "&.Mui-selected": {
            backgroundColor: tokens.surface2,
            "&:hover": { backgroundColor: tokens.surface2 },
            "& .MuiListItemIcon-root": { color: tokens.accent },
          },
        },
      },
    },

    MuiListItemIcon: { styleOverrides: { root: { color: tokens.text2, minWidth: 36 } } },
    MuiListItemText: { styleOverrides: { primary: { fontSize: 14, letterSpacing: "-0.005em" } } },

    MuiTabs: {
      styleOverrides: {
        root: { borderBottom: `1px solid ${tokens.rule}`, minHeight: 40 },
        indicator: { backgroundColor: tokens.accent, height: 2 },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 500,
          fontSize: 14,
          color: tokens.text2,
          minHeight: 40,
          padding: "8px 16px",
          letterSpacing: "-0.005em",
          "&.Mui-selected": { color: tokens.ink },
        },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 8, border: `1px solid ${tokens.rule}` },
        standardInfo:    { backgroundColor: alpha(tokens.info,    0.08), color: tokens.info,    borderColor: alpha(tokens.info,    0.3) },
        standardSuccess: { backgroundColor: alpha(tokens.success, 0.08), color: tokens.success, borderColor: alpha(tokens.success, 0.3) },
        standardWarning: { backgroundColor: alpha(tokens.warning, 0.08), color: tokens.warning, borderColor: alpha(tokens.warning, 0.3) },
        standardError:   { backgroundColor: alpha(tokens.danger,  0.08), color: tokens.danger,  borderColor: alpha(tokens.danger,  0.3) },
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: { backgroundColor: tokens.bg2, border: `1px solid ${tokens.rule}`, borderRadius: 14, backgroundImage: "none" },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: { backgroundColor: tokens.surface2, border: `1px solid ${tokens.rule}`, color: tokens.ink, fontSize: 12.5, padding: "6px 10px", borderRadius: 6 },
        arrow: { color: tokens.surface2 },
      },
    },

    MuiSwitch: {
      styleOverrides: {
        switchBase: { "&.Mui-checked": { color: tokens.accent, "& + .MuiSwitch-track": { backgroundColor: tokens.accentD, opacity: 1 } } },
        track: { backgroundColor: tokens.rule2 },
      },
    },

    MuiLinearProgress: {
      styleOverrides: {
        root: { backgroundColor: tokens.surface, borderRadius: 999, height: 4 },
        bar: { backgroundColor: tokens.accent },
      },
    },

    MuiCircularProgress: { styleOverrides: { root: { color: tokens.accent } } },

    MuiMenu: { styleOverrides: { paper: { backgroundColor: tokens.bg2, border: `1px solid ${tokens.rule}`, marginTop: 4 } } },

    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: 14,
          letterSpacing: "-0.005em",
          color: tokens.ink,
          "&:hover":        { backgroundColor: tokens.surface },
          "&.Mui-selected": { backgroundColor: tokens.surface2, "&:hover": { backgroundColor: tokens.surface2 } },
        },
      },
    },

    MuiBackdrop: { styleOverrides: { root: { backgroundColor: alpha(tokens.bg, 0.7), backdropFilter: "blur(2px)" } } },

    MuiLink: {
      styleOverrides: {
        root: {
          color: tokens.accent2,
          textDecorationColor: alpha(tokens.accent2, 0.4),
          textUnderlineOffset: 3,
          transition: `color 160ms ${tokens.easeOut}`,
          "&:hover": { color: tokens.accent },
        },
      },
    },

    MuiIconButton: {
      styleOverrides: {
        root: {
          color: tokens.text2,
          transition: `background 160ms ${tokens.easeOut}, color 160ms ${tokens.easeOut}, transform 120ms ${tokens.easePress}`,
          "&:hover": { backgroundColor: tokens.surface, color: tokens.ink },
          "&:active": { transform: "scale(0.94)" },
        },
      },
    },
  },
});

export default theme;
