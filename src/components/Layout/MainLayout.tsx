/* MainLayout — estructura principal con Sidebar + Navbar + contenido */

import { Box, Toolbar } from "@mui/material";
import { Outlet } from "react-router-dom";
import Sidebar, { SIDEBAR_WIDTH } from "./Sidebar";
import Navbar from "./Navbar";

export default function MainLayout() {
  return (
    <Box sx={{ display: "flex" }}>
      {/* Sidebar fijo a la izquierda */}
      <Sidebar />

      {/* Navbar fijo arriba */}
      <Navbar />

      {/* Área de contenido principal */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: `calc(100% - ${SIDEBAR_WIDTH}px)`,
          minHeight: "100vh",
          bgcolor: "background.default",
        }}
      >
        {/* Spacer para compensar la altura del AppBar */}
        <Toolbar />

        {/* Aquí se renderizan las páginas hijas */}
        <Outlet />
      </Box>
    </Box>
  );
}
