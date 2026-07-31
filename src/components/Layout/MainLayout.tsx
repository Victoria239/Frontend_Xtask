/* MainLayout — sidebar + content container.
 *
 * Lee el ancho del sidebar via CustomEvent "xt:sidebar" para que
 * el content se ajuste cuando el sidebar se colapsa/expande.
 *
 * El content se envuelve en un container con max-width para
 * que en monitores anchos no quede todo estirado de borde a borde
 * (mucho más cómodo para lectura prolongada).
 */

import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { Outlet } from "react-router-dom";
import Sidebar, { SIDEBAR_WIDTH, SIDEBAR_WIDTH_COLLAPSED } from "./Sidebar";
import XTaskAI from "../XTaskAI";
import BellMenu from "../notifications/BellMenu";

const LS_KEY = "xt.sidebar.collapsed";
const PAGE_BG = "#FFFFFF";

export default function MainLayout() {
  const [sidebarW, setSidebarW] = useState<number>(() => {
    if (typeof window === "undefined") return SIDEBAR_WIDTH;
    return localStorage.getItem(LS_KEY) === "1" ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH;
  });

  useEffect(() => {
    const onSidebar = (e: Event) => {
      const ce = e as CustomEvent<{ width: number }>;
      if (ce.detail?.width) setSidebarW(ce.detail.width);
    };
    window.addEventListener("xt:sidebar", onSidebar as EventListener);
    return () => window.removeEventListener("xt:sidebar", onSidebar as EventListener);
  }, []);

  return (
    <Box sx={{ display: "flex", bgcolor: PAGE_BG, minHeight: "100vh" }}>
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: `calc(100% - ${sidebarW}px)`,
          minHeight: "100vh",
          bgcolor: PAGE_BG,
          transition: "width 240ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        {/* Container con max-width — evita layouts estirados en monitores anchos.
            Top padding global para todas las páginas (para que no queden pegadas al borde
            superior del viewport). Cada page maneja su propio padding interno horizontal. */}
        <Box sx={{
          maxWidth: 1280,
          margin: "0 auto",
          width: "100%",
          paddingTop: { xs: "24px", sm: "32px", md: "40px" },
          paddingBottom: { xs: "24px", sm: "32px", md: "48px" },
        }}>
          <Outlet />
        </Box>
      </Box>
      {/* Bell de notificaciones — fixed top-right */}
      <Box sx={{
        position: "fixed",
        top: { xs: 14, md: 20 },
        right: { xs: 14, md: 28 },
        zIndex: 1100,
      }}>
        <BellMenu />
      </Box>

      {/* Asistente flotante — solo en rutas autenticadas */}
      <XTaskAI />
    </Box>
  );
}
