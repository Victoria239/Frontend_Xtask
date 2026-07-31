/* Navbar — barra superior con info del usuario y logout */

import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Chip,
  Tooltip,
} from "@mui/material";
import { Logout as LogoutIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import LanguageSelector from "../LanguageSelector";
import { SIDEBAR_WIDTH } from "./Sidebar";

/* Colores por rol */
const roleColors: Record<string, "primary" | "secondary" | "default"> = {
  admin: "primary",
  manager: "secondary",
  user: "default",
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  return (
    <AppBar
      position="fixed"
      color="inherit"
      sx={{
        width: `calc(100% - ${SIDEBAR_WIDTH}px)`,
        ml: `${SIDEBAR_WIDTH}px`,
      }}
    >
      <Toolbar>
        {/* Espaciador */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Language selector — visible siempre */}
        <Box sx={{ mr: 1 }}>
          <LanguageSelector variant="compact" />
        </Box>

        {/* Info del usuario */}
        {user && (
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="body2" color="text.secondary">
              {user.fullName || user.username}
            </Typography>
            <Chip
              label={user.role}
              size="small"
              color={roleColors[user.role] || "default"}
              variant="outlined"
            />
            <Tooltip title={t("common.logout")}>
              <IconButton onClick={logout} size="small" color="default">
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}
