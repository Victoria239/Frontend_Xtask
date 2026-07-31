/* Calculadora de pagos (C-04).
 *
 * Layout:
 *   - Lista de runs a la izquierda
 *   - Detalle del run seleccionado con payouts + trace por regla
 *   - Botón "Nueva corrida" → wizard simple (plan + período)
 */

import { useEffect, useMemo, useState } from "react";
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, IconButton, InputLabel, MenuItem, Select, Stack, TextField, Typography,
} from "@mui/material";
import { payoutsApi, plansApi } from "../../api";
import type { RunDetail, RunStatus, RunSummary, PayoutLine } from "../../api/payouts";
import type { PlanSummary } from "../../api/plans";
import { notify } from "../../hooks/useToast";

const T = {
  bg: "#FFFFFF", bg2: "#F7F7F9", surface2: "#F2F2F5",
  rule: "#E5E5EA", rule2: "#D1D1D6",
  ink: "#1A1726", text2: "#605C70", text3: "#8E8A99",
  accent: "#02BDEA", accentD: "#0A4D70",
  amber: "#E08A0E", green: "#01B89E", red: "#D14040",
  mono: "'JetBrains Mono', monospace",
};

const STATUS_COLOR: Record<RunStatus, string> = {
  draft: T.text3,
  pending_approval: T.amber,
  approved: T.accent,
  paid: T.green,
  cancelled: T.red,
};
const STATUS_LABEL: Record<RunStatus, string> = {
  draft: "Borrador",
  pending_approval: "Pendiente aprobación",
  approved: "Aprobada",
  paid: "Pagada",
  cancelled: "Cancelada",
};

export default function PayoutsPage() {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  /* New run dialog */
  const [newOpen, setNewOpen] = useState(false);
  const [newPlan, setNewPlan] = useState<number | "">("");
  const [newPeriod, setNewPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [newDept, setNewDept] = useState("");
  const [computing, setComputing] = useState(false);

  /* Detail expand */
  const [expandedPayout, setExpandedPayout] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [r, p] = await Promise.all([payoutsApi.listRuns(), plansApi.listPlans()]);
        setRuns(r);
        setPlans(p);
        if (r[0]) setSelectedId(r[0].id);
        if (p[0]) setNewPlan(p[0].id);
      } catch (e) {
        const err = e as { response?: { data?: { error?: string } } };
        notify({ kind: "error", msg: err.response?.data?.error || "Error cargando" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
    else setDetail(null);
  }, [selectedId]);

  const loadDetail = async (id: number) => {
    setLoadingDetail(true);
    try {
      const d = await payoutsApi.getRun(id);
      setDetail(d);
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "Error" });
    } finally {
      setLoadingDetail(false);
    }
  };

  const computeRun = async () => {
    if (!newPlan) return;
    setComputing(true);
    try {
      const [y, m] = newPeriod.split("-");
      const start = `${y}-${m}-01`;
      const endDate = new Date(parseInt(y), parseInt(m), 0);
      const end = endDate.toISOString().slice(0, 10);
      const r = await payoutsApi.computeRun({
        plan_id: Number(newPlan),
        period_label: newPeriod,
        period_start: start,
        period_end: end,
        department_filter: newDept.trim() || null,
      });
      const list = await payoutsApi.listRuns();
      setRuns(list);
      setSelectedId(r.id);
      setNewOpen(false);
      notify({ kind: "success", msg: `Run calculada: ${r.employee_count} empleados, total ${r.total_amount.toFixed(2)}` });
    } catch (e) {
      const err = e as { response?: { data?: { error?: string; detail?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || err.response?.data?.detail || "Error" });
    } finally {
      setComputing(false);
    }
  };

  const changeStatus = async (status: RunStatus) => {
    if (!detail) return;
    try {
      const d = await payoutsApi.updateStatus(detail.id, status);
      setDetail(d);
      const list = await payoutsApi.listRuns();
      setRuns(list);
      notify({ kind: "success", msg: `Estado → ${STATUS_LABEL[status]}` });
    } catch (e) {
      const err = e as { response?: { data?: { error?: string; detail?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || err.response?.data?.detail || "Transición ilegal" });
    }
  };

  const allowedNext = useMemo<RunStatus[]>(() => {
    const map: Record<RunStatus, RunStatus[]> = {
      draft: ["pending_approval", "cancelled"],
      pending_approval: ["approved", "draft", "cancelled"],
      approved: ["paid", "cancelled"],
      paid: [],
      cancelled: [],
    };
    return detail ? map[detail.status] : [];
  }, [detail]);

  return (
    <Box sx={{ px: { xs: "16px", md: "32px" }, pb: "32px", maxWidth: 1400, mx: "auto", color: T.ink }}>
      <Box sx={{ pb: "16px", mb: "16px", borderBottom: `1px solid ${T.rule}`, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: "-0.025em", mb: 0.5 }}>
            Cálculo de pagos
          </Typography>
          <Typography variant="body2" sx={{ color: T.text2 }}>
            Aplica un plan de comisiones a todos los empleados de un departamento y genera el payout del período.
          </Typography>
        </Box>
        <Button variant="contained" onClick={() => setNewOpen(true)} sx={{ bgcolor: T.accent, color: "#FFFFFF", boxShadow: "none", "&:hover": { bgcolor: "#0496BA", boxShadow: "none" } }}>
          Nueva corrida
        </Button>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "280px 1fr" }, gap: 2 }}>
        {/* Lista */}
        <Box>
          <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, display: "block", mb: 1 }}>
            Corridas ({runs.length})
          </Typography>
          {loading ? (
            <Box sx={{ p: "24px", textAlign: "center" }}><CircularProgress size={18} sx={{ color: T.accent }} /></Box>
          ) : runs.length === 0 ? (
            <Box sx={{ p: "20px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg2, textAlign: "center" }}>
              <Typography variant="caption" sx={{ color: T.text3 }}>Sin corridas todavía</Typography>
            </Box>
          ) : (
            <Stack gap={0.75}>
              {runs.map((r) => (
                <Box
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  sx={{
                    p: "12px 14px", borderRadius: 1.5,
                    border: `1px solid ${selectedId === r.id ? T.accent : T.rule}`,
                    bgcolor: selectedId === r.id ? "rgba(2,189,234,0.05)" : T.bg,
                    cursor: "pointer", transition: "all 160ms",
                    "&:hover": { borderColor: T.rule2 },
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
                        {r.period_label}
                      </Typography>
                      <Typography variant="caption" sx={{ color: T.text3, fontFamily: T.mono, fontSize: 10.5, display: "block" }}>
                        {r.plan_name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: T.text2, fontSize: 11 }}>
                        {r.employee_count} emp · {r.currency} {Number(r.total_amount).toFixed(2)}
                      </Typography>
                    </Box>
                    <Chip
                      label={STATUS_LABEL[r.status]} size="small"
                      sx={{
                        bgcolor: `${STATUS_COLOR[r.status]}15`, color: STATUS_COLOR[r.status],
                        fontSize: 9.5, height: 18, fontWeight: 600,
                      }}
                    />
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Box>

        {/* Detail */}
        <Box>
          {!selectedId ? (
            <Box sx={{ p: "48px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg2, textAlign: "center" }}>
              <Typography variant="body1" sx={{ color: T.ink, fontWeight: 500 }}>Elegí una corrida</Typography>
            </Box>
          ) : loadingDetail || !detail ? (
            <Box sx={{ p: "48px", textAlign: "center" }}><CircularProgress size={22} sx={{ color: T.accent }} /></Box>
          ) : (
            <Box>
              {/* Header detail */}
              <Box sx={{ p: "20px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg, mb: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>{detail.period_label} — {detail.plan_name}</Typography>
                    <Typography variant="caption" sx={{ color: T.text3, fontFamily: T.mono, fontSize: 11 }}>
                      {detail.period_start} → {detail.period_end}{detail.department_filter ? ` · dept ${detail.department_filter}` : ""}
                    </Typography>
                  </Box>
                  <Chip
                    label={STATUS_LABEL[detail.status]} size="small"
                    sx={{ bgcolor: `${STATUS_COLOR[detail.status]}15`, color: STATUS_COLOR[detail.status], fontWeight: 600 }}
                  />
                </Stack>
                <Stack direction="row" gap={3}>
                  <Box>
                    <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>Total</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: T.accent, fontFamily: T.mono }}>
                      {Number(detail.total_amount).toLocaleString("es-ES", { maximumFractionDigits: 2 })}
                      <Typography component="span" variant="body2" sx={{ color: T.text3, ml: 0.5 }}>{detail.currency}</Typography>
                    </Typography>
                  </Box>
                  <Box sx={{ borderLeft: `1px solid ${T.rule}`, pl: 3 }}>
                    <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>Empleados</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: T.mono }}>{detail.employee_count}</Typography>
                  </Box>
                </Stack>
                {allowedNext.length > 0 && (
                  <Stack direction="row" gap={1} mt={2}>
                    {allowedNext.map((s) => (
                      <Button
                        key={s} size="small" variant="outlined"
                        onClick={() => changeStatus(s)}
                        sx={{
                          borderColor: STATUS_COLOR[s], color: STATUS_COLOR[s],
                          "&:hover": { borderColor: STATUS_COLOR[s], bgcolor: `${STATUS_COLOR[s]}10` },
                        }}
                      >
                        → {STATUS_LABEL[s]}
                      </Button>
                    ))}
                  </Stack>
                )}
              </Box>

              {/* Payouts */}
              <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                Líneas ({detail.payouts.length})
              </Typography>
              <Stack gap={0.75} mt={1}>
                {detail.payouts.map((p) => (
                  <PayoutRow
                    key={p.id} payout={p}
                    expanded={expandedPayout === p.id}
                    onToggle={() => setExpandedPayout(expandedPayout === p.id ? null : p.id)}
                    currency={detail.currency}
                  />
                ))}
              </Stack>
            </Box>
          )}
        </Box>
      </Box>

      {/* Dialog: nueva corrida */}
      <Dialog open={newOpen} onClose={() => setNewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Nueva corrida</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ pt: 1 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Plan *</InputLabel>
              <Select label="Plan *" value={newPlan} onChange={(e) => setNewPlan(Number(e.target.value))}>
                {plans.filter((p) => p.active).map((p) => (
                  <MenuItem key={p.id} value={p.id}>{p.name} · {p.currency} · {p.rule_count} reglas</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction="row" gap={2}>
              <TextField size="small" label="Período (YYYY-MM)" value={newPeriod} onChange={(e) => setNewPeriod(e.target.value)} fullWidth placeholder="2026-06" />
              <TextField size="small" label="Departamento (opcional)" value={newDept} onChange={(e) => setNewDept(e.target.value)} fullWidth />
            </Stack>
            <Typography variant="caption" sx={{ color: T.text3, fontSize: 11 }}>
              El motor evalúa el plan para cada empleado activo del filtro usando defaults derivados del salario.
              Para producción se pasa context_overrides con los datos reales (ventas, KPIs).
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewOpen(false)}>Cancelar</Button>
          <Button onClick={computeRun} variant="contained" disabled={computing || !newPlan} sx={{ bgcolor: T.accent, "&:hover": { bgcolor: "#0496BA" } }}>
            {computing ? <CircularProgress size={16} sx={{ color: "#FFFFFF" }} /> : "Calcular"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function PayoutRow({
  payout, expanded, onToggle, currency,
}: { payout: PayoutLine; expanded: boolean; onToggle: () => void; currency: string }) {
  return (
    <Box sx={{ border: `1px solid ${T.rule}`, borderRadius: 1.5, bgcolor: T.bg, overflow: "hidden" }}>
      <Box
        onClick={onToggle}
        sx={{ p: "10px 14px", display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 2, alignItems: "center", cursor: "pointer", "&:hover": { bgcolor: T.bg2 } }}
      >
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>{payout.employee_name}</Typography>
          <Typography variant="caption" sx={{ color: T.text3, fontSize: 11 }}>{payout.department || "—"}</Typography>
        </Box>
        <Chip label={`${payout.matched_rules} reglas`} size="small" sx={{ height: 18, fontSize: 10, bgcolor: T.surface2, color: T.text2 }} />
        {payout.paid_at && (
          <Chip label={`pagado ${payout.paid_at}`} size="small" sx={{ height: 18, fontSize: 10, bgcolor: "rgba(1,184,158,0.12)", color: T.green }} />
        )}
        <Typography variant="body1" sx={{ fontWeight: 700, color: T.accent, fontFamily: T.mono, textAlign: "right", minWidth: 90 }}>
          {Number(payout.amount).toFixed(2)} {currency}
        </Typography>
      </Box>
      {expanded && (
        <Box sx={{ p: "12px 14px", bgcolor: T.bg2, borderTop: `1px solid ${T.rule}` }}>
          <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>Trace por regla</Typography>
          <Stack gap={0.5} mt={1}>
            {payout.trace.map((t, i) => (
              <Box key={i} sx={{ p: "6px 10px", borderRadius: 1, bgcolor: T.bg, border: `1px solid ${T.rule}`, display: "grid", gridTemplateColumns: "1fr auto auto", gap: 1, alignItems: "center" }}>
                <Typography variant="caption" sx={{ fontFamily: T.mono, fontSize: 11 }}>{t.label || `regla #${t.rule_id}`}</Typography>
                {t.matched ? (
                  <Chip label="matched" size="small" sx={{ height: 16, fontSize: 9, bgcolor: "rgba(1,184,158,0.12)", color: T.green }} />
                ) : (
                  <Chip label="skip" size="small" sx={{ height: 16, fontSize: 9, bgcolor: T.surface2, color: T.text3 }} />
                )}
                {t.amount !== undefined && t.amount !== null ? (
                  <Typography variant="caption" sx={{ fontFamily: T.mono, fontSize: 11, color: T.green, fontWeight: 600, textAlign: "right", minWidth: 60 }}>
                    +{t.amount.toFixed(2)}
                  </Typography>
                ) : t.error ? (
                  <Typography variant="caption" sx={{ fontFamily: T.mono, fontSize: 10, color: T.red }}>{t.error}</Typography>
                ) : <Box />}
              </Box>
            ))}
          </Stack>
          <Box sx={{ mt: 1.5, p: "8px 10px", borderRadius: 1, bgcolor: T.bg, border: `1px solid ${T.rule}` }}>
            <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Contexto evaluado</Typography>
            <Typography variant="caption" sx={{ fontFamily: T.mono, fontSize: 11, display: "block", color: T.text2, mt: 0.5, whiteSpace: "pre-wrap" }}>
              {JSON.stringify(payout.context, null, 2)}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}
