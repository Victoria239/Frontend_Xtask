/* Preferencias de notificación + test email (P-04.2).
 *
 * Tabs:
 *   - Notificaciones: toggles globales y por categoría + envío de email de prueba
 */

import { useEffect, useState } from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, FormControlLabel, Stack, Switch,
  TextField, Typography,
} from "@mui/material";
import { emailPrefsApi } from "../../api";
import type { Preferences } from "../../api/email_prefs";
import { notify } from "../../hooks/useToast";

const T = {
  bg: "#FFFFFF", bg2: "#F7F7F9", surface2: "#F2F2F5",
  rule: "#E5E5EA", rule2: "#D1D1D6",
  ink: "#1A1726", text2: "#605C70", text3: "#8E8A99",
  accent: "#02BDEA", accentD: "#0A4D70",
  amber: "#E08A0E", green: "#01B89E", red: "#D14040",
  mono: "'JetBrains Mono', monospace",
};

const CATEGORIES: Array<{ key: string; label: string; description: string }> = [
  { key: "contracts", label: "Contratos", description: "Vencimientos, firmas, cambios de estado" },
  { key: "leaves", label: "Ausencias", description: "Aprobaciones de vacaciones, balances" },
  { key: "okrs", label: "OKRs", description: "Cambios de status, alertas at-risk" },
  { key: "kpis", label: "KPIs", description: "Mediciones fuera de meta" },
  { key: "payouts", label: "Pagos", description: "Comisiones pagadas o pendientes" },
  { key: "ats", label: "Recruiting", description: "Movimientos de candidatos" },
  { key: "approvals", label: "Aprobaciones", description: "Solicitudes pendientes en tu bandeja" },
  { key: "auth", label: "Cuenta", description: "Bienvenida, cambios de credenciales" },
];

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [mode, setMode] = useState<"sendgrid" | "smtp" | "mock" | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    Promise.all([emailPrefsApi.getMode(), emailPrefsApi.getPreferences()])
      .then(([m, p]) => { setMode(m.mode); setPrefs(p); })
      .catch((e) => {
        const err = e as { response?: { data?: { error?: string } } };
        notify({ kind: "error", msg: err.response?.data?.error || "Error cargando" });
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleGlobal = () => {
    if (!prefs) return;
    setPrefs({ ...prefs, email_enabled: !prefs.email_enabled });
  };

  const toggleCategory = (key: string) => {
    if (!prefs) return;
    const cur = prefs.category_overrides[key];
    const newOverrides = { ...prefs.category_overrides };
    if (cur === false) delete newOverrides[key]; // back to default (true)
    else newOverrides[key] = false;
    setPrefs({ ...prefs, category_overrides: newOverrides });
  };

  const save = async () => {
    if (!prefs) return;
    setSaving(true);
    try {
      const saved = await emailPrefsApi.updatePreferences(prefs);
      setPrefs(saved);
      notify({ kind: "success", msg: "Preferencias guardadas" });
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "Error guardando" });
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    if (!testEmail.trim()) {
      notify({ kind: "error", msg: "Ingresá un email" });
      return;
    }
    setTesting(true);
    try {
      const r = await emailPrefsApi.testEmail(testEmail.trim());
      notify({
        kind: r.status === "sent" ? "success" : "error",
        msg: r.status === "sent" ? `Email enviado vía ${r.mode}` : `Falló (${r.mode}): ${r.detail}`,
      });
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "Error" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Box sx={{ px: { xs: "16px", md: "32px" }, pb: "32px", maxWidth: 800, mx: "auto", color: T.ink }}>
      <Box sx={{ pb: "16px", mb: "16px", borderBottom: `1px solid ${T.rule}` }}>
        <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: "-0.025em", mb: 0.5 }}>
          Configuración
        </Typography>
        <Typography variant="body2" sx={{ color: T.text2 }}>
          Controlá qué notificaciones recibís por email además del feed in-app.
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ p: "48px", textAlign: "center" }}><CircularProgress size={22} sx={{ color: T.accent }} /></Box>
      ) : !prefs ? null : (
        <>
          {/* Modo del servidor */}
          <Box sx={{ p: "16px 20px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg, mb: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                  Proveedor de email actual
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: T.ink, mt: 0.5 }}>
                  {mode === "sendgrid" ? "SendGrid (producción)" :
                   mode === "smtp" ? "SMTP" :
                   "Mock (solo logs — para demo local)"}
                </Typography>
              </Box>
              <Chip
                label={mode || "?"} size="small"
                sx={{
                  bgcolor: mode === "mock" ? T.surface2 : `${T.green}15`,
                  color: mode === "mock" ? T.text2 : T.green,
                  fontWeight: 600, fontFamily: T.mono,
                }}
              />
            </Stack>
          </Box>

          {mode === "mock" && (
            <Alert severity="info" sx={{ mb: 2.5 }}>
              En modo mock, los emails se loguean en el servidor pero no se envían. Configurá <code>SENDGRID_API_KEY</code> o <code>SMTP_HOST</code> en el entorno para activar envío real.
            </Alert>
          )}

          {/* Toggle global */}
          <Box sx={{ p: "16px 20px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg, mb: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>Recibir emails</Typography>
                <Typography variant="caption" sx={{ color: T.text2 }}>
                  Toggle maestro: si está apagado, ningún email te llega independientemente de las categorías.
                </Typography>
              </Box>
              <Switch checked={prefs.email_enabled} onChange={toggleGlobal} />
            </Stack>
          </Box>

          {/* Por categoría */}
          <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", mb: 1 }}>
            Por categoría
          </Typography>
          <Stack gap={1} sx={{ opacity: prefs.email_enabled ? 1 : 0.4, pointerEvents: prefs.email_enabled ? "auto" : "none" }}>
            {CATEGORIES.map((cat) => {
              const explicitlyOff = prefs.category_overrides[cat.key] === false;
              const checked = !explicitlyOff;
              return (
                <Box key={cat.key} sx={{ p: "12px 16px", border: `1px solid ${T.rule}`, borderRadius: 1.5, bgcolor: T.bg, display: "grid", gridTemplateColumns: "1fr auto", gap: 2, alignItems: "center" }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13.5 }}>{cat.label}</Typography>
                    <Typography variant="caption" sx={{ color: T.text3, fontSize: 11.5 }}>{cat.description}</Typography>
                  </Box>
                  <Switch checked={checked} onChange={() => toggleCategory(cat.key)} />
                </Box>
              );
            })}
          </Stack>

          <Stack direction="row" gap={1.5} mt={3} justifyContent="flex-end">
            <Button variant="contained" onClick={save} disabled={saving} sx={{ bgcolor: T.accent, "&:hover": { bgcolor: "#0496BA" } }}>
              {saving ? <CircularProgress size={16} sx={{ color: "#FFFFFF" }} /> : "Guardar"}
            </Button>
          </Stack>

          {/* Test email */}
          <Box sx={{ mt: 4, p: "20px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg2 }}>
            <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Email de prueba
            </Typography>
            <Typography variant="body2" sx={{ color: T.text2, fontSize: 12.5, mt: 0.5 }}>
              Envía un email de demostración usando el proveedor actual.
            </Typography>
            <Stack direction="row" gap={1} mt={1.5}>
              <TextField
                size="small" type="email" placeholder="destinatario@example.com"
                value={testEmail} onChange={(e) => setTestEmail(e.target.value)}
                fullWidth
              />
              <Button variant="outlined" onClick={sendTest} disabled={testing || !testEmail} sx={{ borderColor: T.rule2, color: T.ink }}>
                {testing ? <CircularProgress size={14} /> : "Enviar"}
              </Button>
            </Stack>
          </Box>
        </>
      )}
    </Box>
  );
}
