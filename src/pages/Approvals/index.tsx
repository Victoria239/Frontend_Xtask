/* Bandeja de aprobaciones (C-05) — engine genérico.
 *
 * Tabs:
 *   - Mis pendientes (las que YO debo aprobar)
 *   - Todas (admin)
 *   - Flows (configurador)
 */

import { useEffect, useState } from "react";
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, IconButton, InputLabel, MenuItem, Select, Stack, Tab, Tabs, TextField, Typography,
} from "@mui/material";
import { approvalsApi } from "../../api";
import type { FlowDetail, FlowIn, FlowOut, InstanceDetail, InstanceSummary } from "../../api/approvals";
import { notify } from "../../hooks/useToast";

const T = {
  bg: "#FFFFFF", bg2: "#F7F7F9", surface2: "#F2F2F5",
  rule: "#E5E5EA", rule2: "#D1D1D6",
  ink: "#1A1726", text2: "#605C70", text3: "#8E8A99",
  accent: "#02BDEA", accentD: "#0A4D70",
  amber: "#E08A0E", green: "#01B89E", red: "#D14040",
  mono: "'JetBrains Mono', monospace",
};

const KIND_LABEL: Record<string, string> = {
  leave_request: "Ausencia",
  payout_run: "Pago",
  contract: "Contrato",
  plan_change: "Cambio de plan",
  other: "Otro",
};

const STATUS_COLOR: Record<string, string> = {
  pending: T.amber, approved: T.green, rejected: T.red, cancelled: T.text3,
  skipped: T.text3,
};

export default function ApprovalsPage() {
  const [tab, setTab] = useState<"mine" | "all" | "flows">("mine");
  const [instances, setInstances] = useState<InstanceSummary[]>([]);
  const [flows, setFlows] = useState<FlowOut[]>([]);
  const [loading, setLoading] = useState(true);

  /* Detail */
  const [openDetail, setOpenDetail] = useState<InstanceDetail | null>(null);
  const [decideNote, setDecideNote] = useState("");

  /* Flow editor */
  const [flowOpen, setFlowOpen] = useState(false);
  const [flowForm, setFlowForm] = useState<FlowIn>({
    name: "", target_kind: "leave_request", priority: 100, active: true,
    steps: [{ name: "Aprobación manager", position: 1, approver_role: "manager_of_employee", sla_hours: 72 }],
  });

  const refresh = async () => {
    setLoading(true);
    try {
      if (tab === "flows") {
        const f = await approvalsApi.listFlows();
        setFlows(f);
      } else {
        const list = await approvalsApi.listInstances(
          tab === "mine" ? { mine: true } : {},
        );
        setInstances(list);
      }
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "Error cargando" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [tab]);

  const openInstance = async (id: number) => {
    try {
      const d = await approvalsApi.getInstance(id);
      setOpenDetail(d);
      setDecideNote("");
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "Error" });
    }
  };

  const decide = async (action: "approved" | "rejected") => {
    if (!openDetail) return;
    try {
      const d = await approvalsApi.decide(openDetail.id, action, decideNote.trim() || undefined);
      setOpenDetail(d);
      await refresh();
      notify({ kind: "success", msg: action === "approved" ? "Aprobada" : "Rechazada" });
    } catch (e) {
      const err = e as { response?: { data?: { error?: string; detail?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || err.response?.data?.detail || "Error" });
    }
  };

  const addStep = () => {
    setFlowForm({
      ...flowForm,
      steps: [
        ...flowForm.steps,
        { name: `Paso ${flowForm.steps.length + 1}`, position: flowForm.steps.length + 1, approver_role: "admin", sla_hours: 72 },
      ],
    });
  };

  const saveFlow = async () => {
    if (!flowForm.name.trim()) {
      notify({ kind: "error", msg: "Nombre obligatorio" });
      return;
    }
    if (flowForm.steps.length === 0) {
      notify({ kind: "error", msg: "Al menos un paso" });
      return;
    }
    try {
      await approvalsApi.createFlow(flowForm);
      setFlowOpen(false);
      await refresh();
      notify({ kind: "success", msg: "Flow creado" });
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "No se pudo crear (¿admin?)" });
    }
  };

  return (
    <Box sx={{ px: { xs: "16px", md: "32px" }, pb: "32px", maxWidth: 1280, mx: "auto", color: T.ink }}>
      <Box sx={{ pb: "16px", mb: "16px", borderBottom: `1px solid ${T.rule}`, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: "-0.025em", mb: 0.5 }}>
            Aprobaciones
          </Typography>
          <Typography variant="body2" sx={{ color: T.text2 }}>
            Engine de workflows genérico. Configurá los pasos una vez; aplica a ausencias, pagos, contratos y cambios de plan.
          </Typography>
        </Box>
        {tab === "flows" && (
          <Button variant="contained" onClick={() => setFlowOpen(true)} sx={{ bgcolor: T.accent, color: "#FFFFFF", boxShadow: "none", "&:hover": { bgcolor: "#0496BA", boxShadow: "none" } }}>
            + Flow
          </Button>
        )}
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          mb: "20px", minHeight: 40,
          "& .MuiTabs-indicator": { backgroundColor: T.accent, height: 2 },
          "& .MuiTab-root": { minHeight: 40, textTransform: "none", fontWeight: 500, fontSize: 14, color: T.text2 },
          "& .Mui-selected": { color: `${T.ink} !important` },
        }}
      >
        <Tab value="mine" label="Mis pendientes" />
        <Tab value="all" label="Todas" />
        <Tab value="flows" label="Configuración" />
      </Tabs>

      {loading ? (
        <Box sx={{ p: "48px", textAlign: "center" }}><CircularProgress size={22} sx={{ color: T.accent }} /></Box>
      ) : tab === "flows" ? (
        <Stack gap={1}>
          {flows.length === 0 ? (
            <Box sx={{ p: "48px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg2, textAlign: "center" }}>
              <Typography variant="caption" sx={{ color: T.text3 }}>Sin flows configurados</Typography>
            </Box>
          ) : flows.map((f) => (
            <Box key={f.id} sx={{ p: "14px 18px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg }}>
              <Stack direction="row" gap={1} alignItems="center" mb={0.5}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>{f.name}</Typography>
                <Chip label={KIND_LABEL[f.target_kind] || f.target_kind} size="small" sx={{ height: 18, fontSize: 10, fontFamily: T.mono, bgcolor: T.surface2, color: T.text2 }} />
                <Chip label={`prio ${f.priority}`} size="small" sx={{ height: 18, fontSize: 10, fontFamily: T.mono, bgcolor: T.surface2, color: T.text3 }} />
                {!f.active && <Chip label="inactivo" size="small" sx={{ height: 18, fontSize: 10, bgcolor: T.surface2, color: T.text3 }} />}
              </Stack>
              {f.description && (
                <Typography variant="caption" sx={{ color: T.text2 }}>{f.description}</Typography>
              )}
            </Box>
          ))}
        </Stack>
      ) : (
        <Stack gap={1}>
          {instances.length === 0 ? (
            <Box sx={{ p: "48px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg2, textAlign: "center" }}>
              <Typography variant="body1" sx={{ color: T.ink, fontWeight: 500 }}>
                {tab === "mine" ? "No tenés aprobaciones pendientes" : "Sin instancias"}
              </Typography>
            </Box>
          ) : instances.map((i) => (
            <Box
              key={i.id}
              onClick={() => openInstance(i.id)}
              sx={{
                p: "14px 18px", border: `1px solid ${T.rule}`,
                borderLeft: `3px solid ${STATUS_COLOR[i.status]}`,
                borderRadius: 2, bgcolor: T.bg, cursor: "pointer",
                display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 2, alignItems: "center",
                transition: "all 160ms",
                "&:hover": { borderColor: T.accent, bgcolor: "rgba(2,189,234,0.02)" },
              }}
            >
              <Chip label={KIND_LABEL[i.target_kind] || i.target_kind} size="small" sx={{ bgcolor: T.surface2, color: T.text2, fontFamily: T.mono, fontSize: 10.5 }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {i.summary || `#${i.target_id}`}
                </Typography>
                <Typography variant="caption" sx={{ color: T.text3, fontFamily: T.mono, fontSize: 11 }}>
                  Paso {i.current_step_position} · {new Date(i.created_at).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </Typography>
              </Box>
              <Chip label={i.status} size="small" sx={{ bgcolor: `${STATUS_COLOR[i.status]}15`, color: STATUS_COLOR[i.status], fontWeight: 600, fontSize: 10.5 }} />
            </Box>
          ))}
        </Stack>
      )}

      {/* Dialog: detalle */}
      <Dialog open={!!openDetail} onClose={() => setOpenDetail(null)} maxWidth="sm" fullWidth>
        {openDetail && (
          <>
            <DialogTitle sx={{ fontWeight: 600 }}>
              {openDetail.summary || `${KIND_LABEL[openDetail.target_kind]} #${openDetail.target_id}`}
            </DialogTitle>
            <DialogContent>
              <Stack gap={2} sx={{ pt: 1 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>Pasos</Typography>
                  <Stack gap={1} mt={1}>
                    {openDetail.steps.map((s) => (
                      <Box key={s.id} sx={{
                        p: "10px 12px", borderRadius: 1.5,
                        bgcolor: s.position === openDetail.current_step_position && openDetail.status === "pending" ? "rgba(224,138,14,0.08)" : T.bg2,
                        border: `1px solid ${s.position === openDetail.current_step_position && openDetail.status === "pending" ? T.amber : T.rule}`,
                      }}>
                        <Stack direction="row" gap={1} alignItems="center">
                          <Typography variant="caption" sx={{ fontFamily: T.mono, fontSize: 10.5, color: T.text3 }}>#{s.position}</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>{s.name}</Typography>
                          <Box sx={{ flex: 1 }} />
                          <Chip label={s.status} size="small" sx={{ bgcolor: `${STATUS_COLOR[s.status]}15`, color: STATUS_COLOR[s.status], fontSize: 10, height: 18 }} />
                        </Stack>
                        {s.note && <Typography variant="caption" sx={{ color: T.text2, fontSize: 11, display: "block", mt: 0.5 }}>"{s.note}"</Typography>}
                      </Box>
                    ))}
                  </Stack>
                </Box>
                {openDetail.status === "pending" && (
                  <TextField size="small" label="Nota (opcional)" value={decideNote} onChange={(e) => setDecideNote(e.target.value)} fullWidth multiline minRows={2} />
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDetail(null)}>Cerrar</Button>
              {openDetail.status === "pending" && (
                <>
                  <Button onClick={() => decide("rejected")} sx={{ color: T.red }}>Rechazar</Button>
                  <Button onClick={() => decide("approved")} variant="contained" sx={{ bgcolor: T.green, "&:hover": { bgcolor: "#019683" } }}>Aprobar</Button>
                </>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Dialog: crear flow */}
      <Dialog open={flowOpen} onClose={() => setFlowOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Nuevo flow</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ pt: 1 }}>
            <TextField size="small" label="Nombre *" value={flowForm.name} onChange={(e) => setFlowForm({ ...flowForm, name: e.target.value })} fullWidth />
            <Stack direction="row" gap={2}>
              <FormControl size="small" fullWidth>
                <InputLabel>Aplica a</InputLabel>
                <Select label="Aplica a" value={flowForm.target_kind} onChange={(e) => setFlowForm({ ...flowForm, target_kind: e.target.value })}>
                  <MenuItem value="leave_request">Solicitud de ausencia</MenuItem>
                  <MenuItem value="payout_run">Corrida de pagos</MenuItem>
                  <MenuItem value="contract">Contrato</MenuItem>
                  <MenuItem value="plan_change">Cambio de plan</MenuItem>
                  <MenuItem value="other">Otro</MenuItem>
                </Select>
              </FormControl>
              <TextField size="small" type="number" label="Prioridad" value={flowForm.priority} onChange={(e) => setFlowForm({ ...flowForm, priority: parseInt(e.target.value) || 100 })} sx={{ width: 110 }} />
            </Stack>
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="caption" sx={{ color: T.text3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Pasos ({flowForm.steps.length})</Typography>
                <Button size="small" onClick={addStep} sx={{ color: T.accent }}>+ Paso</Button>
              </Stack>
              <Stack gap={1}>
                {flowForm.steps.map((s, idx) => (
                  <Box key={idx} sx={{ p: "10px 12px", border: `1px solid ${T.rule}`, borderRadius: 1.5, bgcolor: T.bg2 }}>
                    <Stack direction="row" gap={1.5} alignItems="center">
                      <Typography variant="caption" sx={{ fontFamily: T.mono, fontSize: 11, color: T.text3, minWidth: 24 }}>#{idx + 1}</Typography>
                      <TextField size="small" placeholder="Nombre" value={s.name} onChange={(e) => {
                        const copy = [...flowForm.steps]; copy[idx] = { ...copy[idx], name: e.target.value }; setFlowForm({ ...flowForm, steps: copy });
                      }} sx={{ flex: 1 }} />
                      <FormControl size="small" sx={{ minWidth: 170 }}>
                        <Select value={s.approver_role} onChange={(e) => {
                          const copy = [...flowForm.steps]; copy[idx] = { ...copy[idx], approver_role: e.target.value }; setFlowForm({ ...flowForm, steps: copy });
                        }}>
                          <MenuItem value="manager_of_employee">Manager directo</MenuItem>
                          <MenuItem value="department_head">Jefe de departamento</MenuItem>
                          <MenuItem value="admin">Admin</MenuItem>
                          <MenuItem value="specific_user">Usuario específico</MenuItem>
                        </Select>
                      </FormControl>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFlowOpen(false)}>Cancelar</Button>
          <Button onClick={saveFlow} variant="contained" sx={{ bgcolor: T.accent, "&:hover": { bgcolor: "#0496BA" } }}>Crear</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
