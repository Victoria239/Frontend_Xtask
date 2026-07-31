/* Admin dashboard de tenants (P-03).
 *
 * Solo rol admin. Lista todos los tenants con métricas + acciones.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography,
} from "@mui/material";
import { tenantsAdminApi } from "../../api";
import type { TenantAdminDetail, TenantStats } from "../../api/tenants_admin";
import { notify } from "../../hooks/useToast";

const T = {
  bg: "#FFFFFF", bg2: "#F7F7F9", surface2: "#F2F2F5",
  rule: "#E5E5EA", rule2: "#D1D1D6",
  ink: "#1A1726", text2: "#605C70", text3: "#8E8A99",
  accent: "#02BDEA", accentD: "#0A4D70",
  amber: "#E08A0E", green: "#01B89E", red: "#D14040",
  mono: "'JetBrains Mono', monospace",
};

const PLAN_COLOR: Record<string, string> = {
  startup: T.accent, growth: T.green, scale: T.accentD, enterprise: T.amber,
};

export default function AdminPage() {
  const [tenants, setTenants] = useState<TenantStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<TenantAdminDetail | null>(null);
  const [suspendOpen, setSuspendOpen] = useState<TenantStats | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [planChange, setPlanChange] = useState<{ tenant: TenantStats; plan: string } | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const list = await tenantsAdminApi.listDashboard();
      setTenants(list);
    } catch (e) {
      const err = e as { response?: { status?: number; data?: { error?: string } } };
      if (err.response?.status === 403) {
        notify({ kind: "error", msg: "Necesitás rol admin para esta vista" });
      } else {
        notify({ kind: "error", msg: err.response?.data?.error || "Error cargando" });
      }
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (t: TenantStats) => {
    try {
      const d = await tenantsAdminApi.getDetail(t.id);
      setDetail(d);
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "Error" });
    }
  };

  const confirmSuspend = async () => {
    if (!suspendOpen) return;
    try {
      await tenantsAdminApi.suspend(suspendOpen.id, suspendReason || undefined);
      notify({ kind: "success", msg: `${suspendOpen.name} suspendido` });
      setSuspendOpen(null);
      setSuspendReason("");
      await refresh();
    } catch (e) {
      const err = e as { response?: { data?: { error?: string; detail?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || err.response?.data?.detail || "Error" });
    }
  };

  const handleReactivate = async (t: TenantStats) => {
    if (!confirm(`¿Reactivar ${t.name}?`)) return;
    try {
      await tenantsAdminApi.reactivate(t.id);
      notify({ kind: "success", msg: "Reactivado" });
      await refresh();
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "Error" });
    }
  };

  const handleChangePlan = async () => {
    if (!planChange) return;
    try {
      await tenantsAdminApi.changePlan(planChange.tenant.id, planChange.plan);
      notify({ kind: "success", msg: `Plan cambiado a ${planChange.plan}` });
      setPlanChange(null);
      await refresh();
    } catch (e) {
      const err = e as { response?: { data?: { error?: string; detail?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || err.response?.data?.detail || "Error" });
    }
  };

  /* Stats agregados */
  const stats = useMemo(() => {
    const active = tenants.filter((t) => t.is_active);
    return {
      total_tenants: tenants.length,
      active_tenants: active.length,
      total_employees: tenants.reduce((s, t) => s + t.employees_active, 0),
      monthly_revenue: active.reduce((s, t) => s + t.plan_monthly_cost_eur, 0),
    };
  }, [tenants]);

  return (
    <Box sx={{ px: { xs: "16px", md: "32px" }, pb: "32px", maxWidth: 1400, mx: "auto", color: T.ink }}>
      <Box sx={{ pb: "16px", mb: "16px", borderBottom: `1px solid ${T.rule}` }}>
        <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: "-0.025em", mb: 0.5 }}>
          Administración de tenants
        </Typography>
        <Typography variant="body2" sx={{ color: T.text2 }}>
          Vista super-admin con métricas agregadas, suspensión, planes y auditoría rápida.
        </Typography>
      </Box>

      {/* Stats strip */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 1.5, mb: 2.5 }}>
        <StatCard label="Tenants" value={stats.total_tenants} color={T.ink} />
        <StatCard label="Activos" value={stats.active_tenants} color={T.green} />
        <StatCard label="Empleados totales" value={stats.total_employees} color={T.accent} />
        <StatCard label="Ingresos mensuales" value={`€${stats.monthly_revenue.toFixed(0)}`} color={T.accentD} />
      </Box>

      {loading ? (
        <Box sx={{ p: "48px", textAlign: "center" }}><CircularProgress size={22} sx={{ color: T.accent }} /></Box>
      ) : tenants.length === 0 ? (
        <Box sx={{ p: "48px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg2, textAlign: "center" }}>
          <Typography variant="caption" sx={{ color: T.text3 }}>Sin tenants</Typography>
        </Box>
      ) : (
        <Stack gap={1}>
          {tenants.map((t) => (
            <Box key={t.id} sx={{ p: "14px 18px", border: `1px solid ${T.rule}`, borderLeft: `3px solid ${t.is_active ? PLAN_COLOR[t.plan] || T.accent : T.text3}`, borderRadius: 2, bgcolor: T.bg }}>
              <Stack direction="row" gap={2} alignItems="center" flexWrap="wrap">
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Stack direction="row" gap={1} alignItems="center">
                    <Typography variant="body1" sx={{ fontWeight: 700, fontSize: 14 }}>{t.name}</Typography>
                    <Chip label={t.slug} size="small" sx={{ height: 18, fontSize: 10.5, fontFamily: T.mono, bgcolor: T.surface2, color: T.text2 }} />
                    {!t.is_active && <Chip label="suspendido" size="small" sx={{ bgcolor: `${T.red}15`, color: T.red, fontWeight: 600, height: 18 }} />}
                  </Stack>
                  <Typography variant="caption" sx={{ color: T.text3, fontFamily: T.mono, fontSize: 10.5 }}>
                    {t.domain || "—"} · creado {new Date(t.created_at).toLocaleDateString("es-ES")}
                  </Typography>
                </Box>
                <Stack direction="row" gap={2}>
                  <MetricMini label="Empleados" value={`${t.employees_active}/${t.employees_total}`} />
                  <MetricMini label="Contratos" value={`${t.contracts_active}/${t.contracts_total}`} />
                  <MetricMini label="Docs RAG" value={t.documents} />
                  <MetricMini label="OKRs" value={t.okrs} />
                </Stack>
                <Box sx={{ textAlign: "right", minWidth: 140 }}>
                  <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>Plan</Typography>
                  <Stack direction="row" gap={0.5} alignItems="center" justifyContent="flex-end">
                    <Chip label={t.plan} size="small" sx={{ bgcolor: `${PLAN_COLOR[t.plan] || T.accent}15`, color: PLAN_COLOR[t.plan] || T.accent, fontWeight: 700, fontSize: 11 }} />
                    <Typography variant="caption" sx={{ color: T.text2, fontFamily: T.mono, fontSize: 11 }}>
                      €{t.plan_monthly_cost_eur.toFixed(0)}/mes
                    </Typography>
                  </Stack>
                </Box>
                <Stack direction="row" gap={0.5}>
                  <Button size="small" variant="text" onClick={() => openDetail(t)} sx={{ color: T.text2, minWidth: 0 }}>Detalle</Button>
                  <Button size="small" variant="text" onClick={() => setPlanChange({ tenant: t, plan: t.plan })} sx={{ color: T.text2, minWidth: 0 }}>Plan</Button>
                  {t.is_active ? (
                    <Button size="small" variant="text" onClick={() => setSuspendOpen(t)} sx={{ color: T.red, minWidth: 0 }}>Suspender</Button>
                  ) : (
                    <Button size="small" variant="text" onClick={() => handleReactivate(t)} sx={{ color: T.green, minWidth: 0 }}>Reactivar</Button>
                  )}
                </Stack>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        {detail && (
          <>
            <DialogTitle sx={{ fontWeight: 600 }}>{detail.name}</DialogTitle>
            <DialogContent>
              <Typography variant="caption" sx={{ color: T.text3, fontFamily: T.mono }}>
                {detail.slug} · {detail.plan} · {detail.is_active ? "activo" : "suspendido"}
              </Typography>
              <Box sx={{ mt: 2, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1.5 }}>
                <DetailMetric label="Empleados activos" value={`${detail.employees_active} / ${detail.employees_total}`} />
                <DetailMetric label="Contratos activos" value={`${detail.contracts_active} / ${detail.contracts_total}`} />
                <DetailMetric label="Documentos RAG" value={detail.documents} />
                <DetailMetric label="OKRs" value={detail.okrs} />
                <DetailMetric label="KPIs" value={detail.kpis} />
                <DetailMetric label="Pipelines abiertos" value={detail.pipelines_open} />
                <DetailMetric label="Notifs 30d" value={detail.notifications_30d} />
                <DetailMetric label="Payouts 30d" value={`€${detail.payouts_30d_total.toFixed(0)}`} />
                {detail.plan_limit_employees && (
                  <DetailMetric
                    label="Límite del plan"
                    value={`${detail.employees_active}/${detail.plan_limit_employees}`}
                    warning={detail.employees_active / detail.plan_limit_employees > 0.9}
                  />
                )}
                <DetailMetric label="Costo mensual" value={`€${detail.plan_monthly_cost_eur.toFixed(0)}`} />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetail(null)} variant="contained" sx={{ bgcolor: T.accent, "&:hover": { bgcolor: "#0496BA" } }}>Cerrar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Suspend dialog */}
      <Dialog open={!!suspendOpen} onClose={() => setSuspendOpen(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Suspender tenant</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: T.text2, mb: 2 }}>
            {suspendOpen?.name} dejará de poder loguear. Los datos no se borran.
          </Typography>
          <TextField size="small" label="Razón (opcional)" value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} fullWidth multiline minRows={2} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuspendOpen(null)}>Cancelar</Button>
          <Button onClick={confirmSuspend} variant="contained" sx={{ bgcolor: T.red, "&:hover": { bgcolor: "#A53333" } }}>Suspender</Button>
        </DialogActions>
      </Dialog>

      {/* Change plan dialog */}
      <Dialog open={!!planChange} onClose={() => setPlanChange(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Cambiar plan</DialogTitle>
        <DialogContent>
          {planChange && (
            <FormControl size="small" fullWidth sx={{ mt: 1 }}>
              <InputLabel>Plan</InputLabel>
              <Select label="Plan" value={planChange.plan} onChange={(e) => setPlanChange({ ...planChange, plan: e.target.value })}>
                <MenuItem value="startup">Startup · €99/mes · max 25 empleados</MenuItem>
                <MenuItem value="growth">Growth · €299/mes · max 100 empleados</MenuItem>
                <MenuItem value="scale">Scale · €999/mes · max 500 empleados</MenuItem>
                <MenuItem value="enterprise">Enterprise · €2500/mes · sin límite</MenuItem>
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPlanChange(null)}>Cancelar</Button>
          <Button onClick={handleChangePlan} variant="contained" sx={{ bgcolor: T.accent, "&:hover": { bgcolor: "#0496BA" } }}>Cambiar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <Box sx={{ p: "14px 16px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg }}>
      <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, display: "block" }}>{label}</Typography>
      <Typography variant="h5" sx={{ color, fontWeight: 700, mt: 0.5, fontVariantNumeric: "tabular-nums" }}>{value}</Typography>
    </Box>
  );
}

function MetricMini({ label, value }: { label: string; value: string | number }) {
  return (
    <Box sx={{ textAlign: "center" }}>
      <Typography variant="caption" sx={{ color: T.text3, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: T.mono, fontSize: 13 }}>{value}</Typography>
    </Box>
  );
}

function DetailMetric({ label, value, warning }: { label: string; value: string | number; warning?: boolean }) {
  return (
    <Box sx={{ p: "10px 12px", border: `1px solid ${T.rule}`, borderRadius: 1.5, bgcolor: warning ? `${T.amber}10` : T.bg2 }}>
      <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: T.mono, color: warning ? T.amber : T.ink }}>{value}</Typography>
    </Box>
  );
}
