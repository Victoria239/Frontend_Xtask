/* BellMenu · indicador de notificaciones con popover.
 *
 * Polling: fetcha el count cada 30s (suficiente para demo).
 * En P-04 fase 2 se puede sustituir por WebSocket.
 */

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Box, CircularProgress, IconButton, Popover, Tooltip, Typography } from "@mui/material";
import { notificationsApi } from "../../api";
import type { Notification } from "../../api/notifications";

const T = {
  bg: "#FFFFFF",
  bg2: "#F7F7F9",
  surface2: "#F2F2F5",
  rule: "#E5E5EA",
  ink: "#1A1726",
  text2: "#605C70",
  text3: "#8E8A99",
  accent: "#02BDEA",
  green: "#01B89E",
  amber: "#E08A0E",
  red: "#D14040",
  mono: "'JetBrains Mono', monospace",
};

const KIND_COLOR: Record<string, string> = {
  info: T.accent,
  success: T.green,
  warning: T.amber,
  error: T.red,
};

const POLL_MS = 30_000;

export default function BellMenu() {
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const open = Boolean(anchor);

  const refreshCount = useCallback(async () => {
    try {
      const c = await notificationsApi.count();
      setUnread(c.unread);
    } catch {
      /* silent — el backend puede no estar arriba al boot */
    }
  }, []);

  useEffect(() => {
    refreshCount();
    const t = setInterval(refreshCount, POLL_MS);
    return () => clearInterval(t);
  }, [refreshCount]);

  const handleOpen = async (e: React.MouseEvent<HTMLElement>) => {
    setAnchor(e.currentTarget);
    setLoading(true);
    try {
      const list = await notificationsApi.list();
      setItems(list);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };
  const handleClose = () => setAnchor(null);

  const markAll = async () => {
    try {
      const c = await notificationsApi.markRead();
      setUnread(c.unread);
      setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })));
    } catch { /* silent */ }
  };

  const handleClick = async (n: Notification) => {
    if (!n.read_at) {
      try {
        const c = await notificationsApi.markRead([n.id]);
        setUnread(c.unread);
        setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x));
      } catch { /* silent */ }
    }
    if (n.action_url) {
      handleClose();
      navigate(n.action_url);
    }
  };

  const handleArchive = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await notificationsApi.archive(id);
      setItems((prev) => prev.filter((n) => n.id !== id));
      refreshCount();
    } catch { /* silent */ }
  };

  return (
    <>
      <Tooltip title={unread > 0 ? `${unread} sin leer` : "Notificaciones"} placement="left">
        <IconButton
          onClick={handleOpen}
          sx={{
            color: T.ink, bgcolor: T.bg,
            border: `1px solid ${T.rule}`,
            borderRadius: 2, width: 40, height: 40,
            "&:hover": { bgcolor: T.bg2, borderColor: T.text3 },
            transition: "all 160ms",
          }}
        >
          <Badge
            badgeContent={unread}
            color="error"
            overlap="circular"
            sx={{
              "& .MuiBadge-badge": {
                bgcolor: T.red, color: "#FFFFFF",
                fontFamily: T.mono, fontSize: 10, fontWeight: 700,
                minWidth: 16, height: 16, padding: "0 4px",
              },
            }}
          >
            <BellIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchor}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              mt: 1, width: 380, maxHeight: 500, overflow: "hidden",
              border: `1px solid ${T.rule}`, borderRadius: 2,
              boxShadow: "0 8px 24px rgba(26, 23, 38, 0.08)",
            },
          },
        }}
      >
        {/* Header del popover */}
        <Box sx={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          px: "16px", py: "12px", borderBottom: `1px solid ${T.rule}`, bgcolor: T.bg,
        }}>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, color: T.ink, fontSize: 14 }}>
              Notificaciones
            </Typography>
            <Typography variant="caption" sx={{ color: T.text3, fontSize: 11 }}>
              {unread > 0 ? `${unread} sin leer` : "Todo al día"}
            </Typography>
          </Box>
          {unread > 0 && (
            <Box
              component="button"
              onClick={markAll}
              sx={{
                background: "none", border: "none", cursor: "pointer",
                color: T.accent, fontSize: 12, fontFamily: "inherit", fontWeight: 500,
                padding: "4px 8px", borderRadius: 1,
                "&:hover": { bgcolor: T.bg2 },
              }}
            >
              Marcar todas leídas
            </Box>
          )}
        </Box>

        {/* Lista */}
        <Box sx={{ maxHeight: 440, overflowY: "auto", bgcolor: T.bg }}>
          {loading ? (
            <Box sx={{ p: "40px", textAlign: "center" }}>
              <CircularProgress size={22} sx={{ color: T.accent }} />
            </Box>
          ) : items.length === 0 ? (
            <Box sx={{ p: "40px 24px", textAlign: "center" }}>
              <Box sx={{
                width: 44, height: 44, mx: "auto", mb: 1.5,
                bgcolor: T.bg2, borderRadius: "50%",
                display: "grid", placeItems: "center",
                color: T.text3,
              }}>
                <BellIcon />
              </Box>
              <Typography variant="body2" sx={{ color: T.ink, fontWeight: 500, mb: 0.5 }}>
                Sin notificaciones
              </Typography>
              <Typography variant="caption" sx={{ color: T.text3, fontSize: 12 }}>
                Cuando haya actividad relevante para vos, aparecerá acá
              </Typography>
            </Box>
          ) : items.map((n, idx) => {
            const color = KIND_COLOR[n.kind] || T.text3;
            const isUnread = !n.read_at;
            const isLast = idx === items.length - 1;
            return (
              <Box
                key={n.id}
                onClick={() => handleClick(n)}
                sx={{
                  position: "relative",
                  display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "10px",
                  px: "16px", py: "12px",
                  borderBottom: isLast ? "none" : `1px solid ${T.rule}`,
                  bgcolor: isUnread ? "rgba(2,189,234,0.04)" : "transparent",
                  cursor: n.action_url ? "pointer" : "default",
                  alignItems: "flex-start",
                  transition: "background 120ms",
                  "&:hover": { bgcolor: isUnread ? "rgba(2,189,234,0.08)" : T.bg2 },
                }}
              >
                {/* Kind dot */}
                <Box sx={{
                  width: 8, height: 8, borderRadius: "50%",
                  bgcolor: color, mt: "6px", flexShrink: 0,
                  boxShadow: isUnread ? `0 0 0 3px ${color}25` : "none",
                }} />

                {/* Body */}
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{
                    color: T.ink, fontWeight: isUnread ? 600 : 500, fontSize: 13.5,
                    lineHeight: 1.3, mb: 0.25,
                  }}>
                    {n.title}
                  </Typography>
                  {n.body && (
                    <Typography variant="caption" sx={{
                      color: T.text2, fontSize: 12, lineHeight: 1.45, display: "block", mb: 0.5,
                      overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                    }}>
                      {n.body}
                    </Typography>
                  )}
                  <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5, fontFamily: T.mono, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {n.category} · {timeAgo(n.created_at)}
                  </Typography>
                </Box>

                {/* Archive */}
                <Tooltip title="Archivar" placement="left">
                  <IconButton
                    size="small"
                    onClick={(e) => handleArchive(e, n.id)}
                    sx={{ color: T.text3, "&:hover": { color: T.red }, padding: "2px" }}
                  >
                    <CloseIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            );
          })}
        </Box>
      </Popover>
    </>
  );
}

/* ─── Sub-components ──────────────────────────────────── */

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return "hace instantes";
  if (sec < 3600) return `hace ${Math.floor(sec / 60)} min`;
  if (sec < 86400) return `hace ${Math.floor(sec / 3600)} h`;
  const days = Math.floor(sec / 86400);
  if (days < 7) return `hace ${days} d`;
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}
