/* Sidebar — menú lateral de navegación */

import { useLocation, useNavigate } from "react-router-dom";
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Box,
  Divider,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Folder as ProjectsIcon,
  People as EmployeesIcon,
  Payment as PayrollIcon,
  AccountBalance as FinanceIcon,
  Assessment as KpisIcon,
  Psychology as SkillsIcon,
} from "@mui/icons-material";
import { useAuth } from "../../context/AuthContext";

/* Ancho fijo del sidebar */
export const SIDEBAR_WIDTH = 260;

/* Items del menú */
interface MenuItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  minRole?: "admin" | "manager"; /* Si se define, solo visible para ese rol o superior */
}

const menuItems: MenuItem[] = [
  { label: "Dashboard", path: "/", icon: <DashboardIcon /> },
  { label: "Proyectos", path: "/proyectos", icon: <ProjectsIcon /> },
  { label: "Empleados", path: "/empleados", icon: <EmployeesIcon /> },
  { label: "Nóminas", path: "/nominas", icon: <PayrollIcon /> },
  { label: "Finanzas", path: "/finanzas", icon: <FinanceIcon /> },
  { label: "KPIs", path: "/kpis", icon: <KpisIcon /> },
  { label: "Habilidades", path: "/habilidades", icon: <SkillsIcon /> },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, isManager } = useAuth();

  /* Filtrar items según rol */
  const visibleItems = menuItems.filter((item) => {
    if (!item.minRole) return true;
    if (item.minRole === "admin") return isAdmin;
    if (item.minRole === "manager") return isManager;
    return false;
  });

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: SIDEBAR_WIDTH,
          boxSizing: "border-box",
          bgcolor: "primary.dark",
          color: "white",
        },
      }}
    >
      {/* Logo / título */}
      <Toolbar>
        <Typography variant="h5" fontWeight={700} color="white">
          XTask
        </Typography>
      </Toolbar>
      <Divider sx={{ borderColor: "rgba(255,255,255,0.15)" }} />

      {/* Items de navegación */}
      <Box sx={{ overflow: "auto", mt: 1 }}>
        <List>
          {visibleItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <ListItemButton
                key={item.path}
                onClick={() => navigate(item.path)}
                selected={isActive}
                sx={{
                  mx: 1,
                  borderRadius: 1,
                  mb: 0.5,
                  color: "rgba(255,255,255,0.7)",
                  "&.Mui-selected": {
                    bgcolor: "rgba(255,255,255,0.15)",
                    color: "white",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
                  },
                  "&:hover": { bgcolor: "rgba(255,255,255,0.08)" },
                }}
              >
                <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            );
          })}
        </List>
      </Box>
    </Drawer>
  );
}
