/* Sidebar Xtask v5 — colapsable, brand Xtask, bg desaturado.
 *
 * Estados: expanded (240px) ↔ collapsed (64px solo iconos)
 * Persistencia: localStorage "xt.sidebar.collapsed"
 * Coordinación con MainLayout: setea CSS var --sidebar-w en <html>
 * + dispara CustomEvent "xt:sidebar" para que MainLayout reaccione.
 */

import { useEffect, useState, type JSX } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Box, Drawer, Tooltip } from "@mui/material";
import { useAuth } from "../../context/AuthContext";
import XtaskMark from "../brand/XtaskMark";

export const SIDEBAR_WIDTH = 240;
export const SIDEBAR_WIDTH_COLLAPSED = 64;
const LS_KEY = "xt.sidebar.collapsed";
const LS_GROUPS_KEY = "xt.sidebar.groups";

const T = {
  bg2:      "#0F0E18",
  surface:  "#171627",
  surface2: "#1F1D32",
  rule:     "#26243C",
  rule2:    "#363352",
  ink:      "#EDEBE6",
  text2:    "#A8A4BA",
  text3:    "#79768C",
  text4:    "#4A4860",
  accent:   "#02BDEA",
  accent2:  "#01E3D5",
  red:      "#E56A5D",
  mono:     "'JetBrains Mono', monospace",
  ease:     "cubic-bezier(0.23, 1, 0.32, 1)",
};

interface NavItem {
  label: string;        // fallback ES si no hay traducción
  i18nKey?: string;     // ruta dentro de translation.json (e.g. "nav.items.employees")
  path: string;
  icon: JSX.Element;
}

const svgIcon = (paths: JSX.Element) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">{paths}</svg>
);

const inboxItem: NavItem = {
  label: "Inbox",
  i18nKey: "nav.inbox",
  path: "/",
  icon: svgIcon(<path d="M22 12h-4l-3 9L9 3l-3 9H2" />),
};

const assistantItem: NavItem = {
  label: "Asistente",
  i18nKey: "nav.assistant",
  path: "/asistente",
  icon: svgIcon(<path d="M21 11.5a8.4 8.4 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.4 8.4 0 01-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.4 8.4 0 013.8-.9h.5a8.5 8.5 0 018 8v.5z" />),
};

const vaultItem: NavItem = {
  label: "Bóveda",
  i18nKey: "nav.vault",
  path: "/boveda",
  icon: svgIcon(<><circle cx="12" cy="12" r="3"/><circle cx="4" cy="4" r="2"/><circle cx="20" cy="4" r="2"/><circle cx="4" cy="20" r="2"/><circle cx="20" cy="20" r="2"/><line x1="6" y1="6" x2="10" y2="10"/><line x1="18" y1="6" x2="14" y2="10"/><line x1="6" y1="18" x2="10" y2="14"/><line x1="18" y1="18" x2="14" y2="14"/></>),
};

const biItem: NavItem = {
  label: "Ejecutivo",
  i18nKey: "nav.executive",
  path: "/bi",
  icon: svgIcon(<><path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-6"/><circle cx="7" cy="14" r="1.5" fill="currentColor"/><circle cx="11" cy="10" r="1.5" fill="currentColor"/><circle cx="15" cy="14" r="1.5" fill="currentColor"/></>),
};

const mySpaceItem: NavItem = {
  label: "Mi espacio",
  i18nKey: "nav.mySpace",
  path: "/yo",
  icon: svgIcon(<><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a4 4 0 014-4h8a4 4 0 014 4v2"/></>),
};

interface NavGroup {
  key: string;
  label: string;
  i18nKey?: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    key: "personas",
    label: "Personas", i18nKey: "nav.groups.people",
    items: [
      { label: "Empleados", i18nKey: "nav.items.employees",   path: "/empleados",   icon: svgIcon(<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></>) },
      { label: "Organigrama", i18nKey: "nav.items.orgChart", path: "/organigrama", icon: svgIcon(<><rect x="9" y="3" width="6" height="6"/><rect x="3" y="15" width="6" height="6"/><rect x="15" y="15" width="6" height="6"/><path d="M12 9v3M6 15v-3h12v3"/></>) },
      { label: "Onboarding", i18nKey: "nav.items.onboarding",  path: "/onboarding",  icon: svgIcon(<><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></>) },
      { label: "Ausencias", i18nKey: "nav.items.leaves",   path: "/ausencias",   icon: svgIcon(<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>) },
      { label: "Recruiting", i18nKey: "nav.items.recruiting",  path: "/recruiting",  icon: svgIcon(<><rect x="3" y="3" width="6" height="18" rx="1"/><rect x="11" y="3" width="6" height="12" rx="1"/><rect x="19" y="3" width="2" height="6" rx="1"/></>) },
      /* "Habilidades" oculto: servicio skills no desplegado (503). Reactivar cuando exista el contenedor. */
      { label: "Retención", i18nKey: "nav.items.retention",   path: "/retencion",   icon: svgIcon(<><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></>) },
      { label: "Reviews 360°", i18nKey: "nav.items.reviews", path: "/reviews",     icon: svgIcon(<><polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9 12 2"/></>) },
      { label: "People Analytics", i18nKey: "nav.items.peopleAnalytics", path: "/people-analytics", icon: svgIcon(<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>) },
    ],
  },
  {
    key: "trabajo",
    label: "Trabajo", i18nKey: "nav.groups.work",
    items: [
      { label: "Actividades", i18nKey: "nav.items.activities", path: "/actividades", icon: svgIcon(<><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></>) },
      { label: "Proyectos", i18nKey: "nav.items.projects", path: "/proyectos", icon: svgIcon(<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />) },
      { label: "OKRs", i18nKey: "nav.items.okrs",      path: "/okrs",      icon: svgIcon(<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></>) },
      { label: "KPIs", i18nKey: "nav.items.kpis",      path: "/kpis",      icon: svgIcon(<><path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-6"/></>) },
      { label: "Forecast", i18nKey: "nav.items.forecast",  path: "/forecast",  icon: svgIcon(<><polyline points="3 17 9 11 13 15 21 7"/><polyline points="17 7 21 7 21 11"/></>) },
    ],
  },
  {
    key: "finanzas",
    label: "Finanzas", i18nKey: "nav.groups.finance",
    items: [
      /* "Nóminas" oculto: servicio payroll no desplegado (503). Reactivar cuando exista el contenedor. */
      { label: "Finanzas", i18nKey: "nav.groups.finance",     path: "/finanzas",     icon: svgIcon(<path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />) },
      { label: "Comisiones", i18nKey: "nav.items.plans",   path: "/comisiones",   icon: svgIcon(<><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6"/></>) },
      { label: "Pagos", i18nKey: "nav.items.payouts",        path: "/pagos",        icon: svgIcon(<><rect x="2" y="6" width="20" height="13" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><circle cx="12" cy="14" r="2"/></>) },
      { label: "Beneficios", i18nKey: "nav.items.benefits",   path: "/beneficios",   icon: svgIcon(<><path d="M20 12v10H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></>) },
      { label: "Aprobaciones", i18nKey: "nav.items.approvals", path: "/aprobaciones", icon: svgIcon(<><polyline points="20 6 9 17 4 12"/></>) },
      { label: "Comp Analytics", i18nKey: "nav.items.compAnalytics", path: "/comp-analytics", icon: svgIcon(<><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></>) },
    ],
  },
  {
    key: "documentos",
    label: "Documentos", i18nKey: "nav.groups.documents",
    items: [
      { label: "Documentos", i18nKey: "nav.groups.documents", path: "/documentos", icon: svgIcon(<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></>) },
      { label: "Contratos", i18nKey: "nav.items.contracts",  path: "/contratos",  icon: svgIcon(<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></>) },
      { label: "Generador", i18nKey: "nav.items.docgen",  path: "/generador",  icon: svgIcon(<><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>) },
    ],
  },
  {
    key: "sistema",
    label: "Sistema", i18nKey: "nav.groups.system",
    items: [
      { label: "Admin", i18nKey: "nav.items.admin",         path: "/admin",         icon: svgIcon(<><circle cx="12" cy="8" r="4"/><path d="M2 21v-2a4 4 0 014-4h12a4 4 0 014 4v2"/><circle cx="19" cy="5" r="2.5" fill="currentColor"/></>) },
      { label: "Configuración", i18nKey: "nav.items.settings", path: "/configuracion", icon: svgIcon(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></>) },
    ],
  },
];

/* Publica el ancho actual del sidebar via CSS variable + custom event.
   MainLayout lee la var para ajustar el ancho del content. */
function publishWidth(collapsed: boolean) {
  const w = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH;
  document.documentElement.style.setProperty("--sidebar-w", `${w}px`);
  window.dispatchEvent(new CustomEvent("xt:sidebar", { detail: { collapsed, width: w } }));
}

export default function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const initials = (user?.fullName || user?.email || "AX").split(/[\s@.]/).filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(LS_KEY) === "1";
  });

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(LS_GROUPS_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return Object.fromEntries(navGroups.map((g) => [g.key, true]));
  });

  useEffect(() => {
    publishWidth(collapsed);
    localStorage.setItem(LS_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    localStorage.setItem(LS_GROUPS_KEY, JSON.stringify(openGroups));
  }, [openGroups]);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  /* Auto-abrir el grupo que contenga la ruta activa */
  useEffect(() => {
    const groupWithActive = navGroups.find((g) => g.items.some((it) => isActive(it.path)));
    if (groupWithActive && !openGroups[groupWithActive.key]) {
      setOpenGroups((prev) => ({ ...prev, [groupWithActive.key]: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const toggleGroup = (key: string) => setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  const width = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        flexShrink: 0,
        transition: `width 240ms ${T.ease}`,
        "& .MuiDrawer-paper": {
          width,
          boxSizing: "border-box",
          bgcolor: T.bg2,
          borderRight: `1px solid ${T.rule}`,
          color: T.ink,
          backgroundImage: "none",
          transition: `width 240ms ${T.ease}`,
          overflowX: "hidden",
        },
      }}
    >
      <Box sx={{
        p: collapsed ? "22px 8px" : "22px 14px",
        display: "flex", flexDirection: "column", gap: "22px",
        height: "100%",
        transition: `padding 240ms ${T.ease}`,
      }}>
        {/* Brand row + toggle */}
        <Box sx={{
          display: "flex", alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          px: collapsed ? 0 : "6px",
          gap: "8px",
          minHeight: 28,
        }}>
          {!collapsed ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <XtaskMark size={22} color={T.accent} />
              <Box sx={{
                fontFamily: "'Bermont', 'Gilroy', 'Inter', sans-serif",
                fontSize: 18, fontWeight: 700, letterSpacing: "-0.025em",
                color: T.ink, lineHeight: 1,
              }}>task</Box>
            </Box>
          ) : (
            <XtaskMark size={22} color={T.accent} />
          )}

          {!collapsed && (
            <Tooltip title="Colapsar (⌘ \)" placement="right">
              <Box
                component="button"
                onClick={() => setCollapsed(true)}
                aria-label="Colapsar sidebar"
                sx={{
                  background: "transparent", border: "none", cursor: "pointer",
                  color: T.text3, padding: "4px", borderRadius: "5px",
                  display: "grid", placeItems: "center",
                  transition: `color 160ms ${T.ease}, background 160ms ${T.ease}`,
                  "&:hover": { color: T.ink, bgcolor: T.surface },
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </Box>
            </Tooltip>
          )}
        </Box>

        {/* Botón "expandir" cuando colapsado — debajo del brand para no romper alineación */}
        {collapsed && (
          <Tooltip title="Expandir (⌘ \)" placement="right">
            <Box
              component="button"
              onClick={() => setCollapsed(false)}
              aria-label="Expandir sidebar"
              sx={{
                background: "transparent", border: `1px solid ${T.rule}`, cursor: "pointer",
                color: T.text3, padding: "6px", borderRadius: "6px",
                display: "grid", placeItems: "center",
                width: 32, height: 32, mx: "auto",
                transition: `color 160ms ${T.ease}, background 160ms ${T.ease}, border-color 160ms ${T.ease}`,
                "&:hover": { color: T.ink, bgcolor: T.surface, borderColor: T.rule2 },
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Box>
          </Tooltip>
        )}

        {/* Top-level shortcuts: Inbox + Asistente */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: "1px" }}>
          <NavLink item={inboxItem} active={isActive(inboxItem.path)} onClick={() => navigate(inboxItem.path)} collapsed={collapsed} />
          <NavLink item={mySpaceItem} active={isActive(mySpaceItem.path)} onClick={() => navigate(mySpaceItem.path)} collapsed={collapsed} />
          <NavLink item={biItem} active={isActive(biItem.path)} onClick={() => navigate(biItem.path)} collapsed={collapsed} />
          <NavLink item={assistantItem} active={isActive(assistantItem.path)} onClick={() => navigate(assistantItem.path)} collapsed={collapsed} />
          <NavLink item={vaultItem} active={isActive(vaultItem.path)} onClick={() => navigate(vaultItem.path)} collapsed={collapsed} />
        </Box>

        {/* Grupos de módulos — scrollable cuando crece */}
        <Box sx={{
          display: "flex", flexDirection: "column", gap: collapsed ? "10px" : "4px",
          flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden",
          "&::-webkit-scrollbar": { width: 4 },
          "&::-webkit-scrollbar-thumb": { background: T.rule, borderRadius: 2 },
        }}>
          {collapsed
            ? navGroups.map((group) => (
                <Box key={group.key} sx={{
                  display: "flex", flexDirection: "column", gap: "1px",
                  pt: "6px", borderTop: `1px solid ${T.rule}`,
                  "&:first-of-type": { borderTop: "none", pt: 0 },
                }}>
                  {group.items.map((item) => (
                    <NavLink key={item.label} item={item} active={isActive(item.path)} onClick={() => navigate(item.path)} collapsed={collapsed} />
                  ))}
                </Box>
              ))
            : navGroups.map((group) => {
                const open = !!openGroups[group.key];
                const hasActive = group.items.some((it) => isActive(it.path));
                return (
                  <Box key={group.key}>
                    <Box
                      component="button"
                      onClick={() => toggleGroup(group.key)}
                      sx={{
                        display: "flex", alignItems: "center", width: "100%",
                        background: "transparent", border: "none", cursor: "pointer",
                        fontFamily: T.mono, fontSize: 10.5,
                        textTransform: "uppercase", letterSpacing: "0.06em",
                        color: hasActive ? T.text2 : T.text4,
                        px: "10px", py: "6px", borderRadius: "5px",
                        transition: `color 160ms ${T.ease}, background 160ms ${T.ease}`,
                        "&:hover": { color: T.text2, bgcolor: T.surface },
                      }}
                    >
                      <span style={{ flex: 1, textAlign: "left" }}>{group.i18nKey ? t(group.i18nKey, group.label) : group.label}</span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: `transform 180ms ${T.ease}` }}>
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </Box>
                    {open && (
                      <Box sx={{ display: "flex", flexDirection: "column", gap: "1px", mt: "2px", ml: "4px", pl: "8px", borderLeft: `1px solid ${T.rule}` }}>
                        {group.items.map((item) => (
                          <NavLink key={item.label} item={item} active={isActive(item.path)} onClick={() => navigate(item.path)} collapsed={collapsed} />
                        ))}
                      </Box>
                    )}
                  </Box>
                );
              })}
        </Box>

        {/* Footer — usuario */}
        <Box sx={{
          marginTop: "auto", paddingTop: "16px",
          borderTop: `1px solid ${T.rule}`,
          display: "flex", alignItems: "center", gap: "10px",
          paddingLeft: collapsed ? 0 : "10px",
          justifyContent: collapsed ? "center" : "flex-start",
        }}>
          {!collapsed ? (
            <>
              <Box sx={{
                width: 28, height: 28, borderRadius: "50%",
                bgcolor: T.surface2, display: "grid", placeItems: "center",
                fontFamily: T.mono, fontSize: 11, color: T.text2,
                border: `1px solid ${T.rule2}`,
                flexShrink: 0,
              }}>{initials}</Box>
              <Box sx={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                <Box sx={{ fontSize: 13, color: T.ink, fontWeight: 500, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user?.fullName || user?.email || "Usuario"}
                </Box>
                <Box sx={{ fontFamily: T.mono, fontSize: 10.5, color: T.text3 }}>
                  {user?.email?.split("@")[1] || "tenant"}
                </Box>
              </Box>
              <Tooltip title={t("common.logout", "Cerrar sesión")} placement="top">
                <Box
                  component="button"
                  onClick={logout}
                  aria-label="Cerrar sesión"
                  sx={{
                    background: "transparent", border: "none", cursor: "pointer",
                    color: T.text3, padding: "6px", borderRadius: "6px",
                    display: "grid", placeItems: "center",
                    transition: `color 160ms ${T.ease}, background 160ms ${T.ease}`,
                    "@media (hover: hover) and (pointer: fine)": {
                      "&:hover": { color: T.ink, bgcolor: T.surface },
                    },
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </Box>
              </Tooltip>
            </>
          ) : (
            <Tooltip title={`${user?.fullName || user?.email || "Usuario"} · click para cerrar sesión`} placement="right">
              <Box
                component="button"
                onClick={logout}
                aria-label="Cerrar sesión"
                sx={{
                  width: 32, height: 32, borderRadius: "50%",
                  bgcolor: T.surface2, border: `1px solid ${T.rule2}`,
                  cursor: "pointer", color: T.text2,
                  fontFamily: T.mono, fontSize: 11,
                  display: "grid", placeItems: "center",
                  transition: `color 160ms ${T.ease}, background 160ms ${T.ease}`,
                  "&:hover": { color: T.ink, bgcolor: T.surface },
                }}
              >
                {initials}
              </Box>
            </Tooltip>
          )}
        </Box>
      </Box>
    </Drawer>
  );
}

function NavLink({ item, active, onClick, collapsed }: { item: NavItem; active: boolean; onClick: () => void; collapsed: boolean }) {
  const { t } = useTranslation();
  const display = item.i18nKey ? t(item.i18nKey, item.label) : item.label;
  const inner = (
    <Box
      component="a"
      onClick={(e) => { e.preventDefault(); onClick(); }}
      href={item.path}
      sx={{
        display: "flex", alignItems: "center",
        gap: collapsed ? 0 : "10px",
        justifyContent: collapsed ? "center" : "flex-start",
        px: collapsed ? 0 : "10px",
        py: "8px",
        borderRadius: "6px",
        color: active ? T.ink : T.text2,
        bgcolor: active ? T.surface2 : "transparent",
        fontSize: 13.5, textDecoration: "none",
        letterSpacing: "-0.005em",
        cursor: "pointer",
        transition: `background 160ms ${T.ease}, color 160ms ${T.ease}`,
        "& svg": { color: active ? T.accent : T.text3, flexShrink: 0 },
        "@media (hover: hover) and (pointer: fine)": {
          "&:hover": { bgcolor: T.surface, color: T.ink },
        },
      }}
    >
      {item.icon}
      {!collapsed && (
        <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {display}
        </span>
      )}
    </Box>
  );
  if (collapsed) {
    return <Tooltip title={display} placement="right">{inner}</Tooltip>;
  }
  return inner;
}
