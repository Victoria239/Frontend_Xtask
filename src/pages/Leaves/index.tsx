/* Ausencias y permisos (H-04).
 *
 * Layout:
 *   - Tabs: Mis solicitudes · Para aprobar · Balances · Tipos (admin)
 *   - Calendario mensual con días resaltados por color del tipo
 *   - Botón flotante: solicitar nueva
 */

import { useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControl, IconButton, InputLabel, LinearProgress, MenuItem, Select, Stack, Tab, Tabs, TextField, Tooltip, Typography,
} from "@mui/material";
import { leavesApi, employeesApi } from "../../api";
import type {
  Balance, Leave, LeaveStatus, LeaveSummary, LeaveType, LeaveTypeIn,
} from "../../api/leaves";
import type { Employee } from "../../types";
import { notify } from "../../hooks/useToast";

const T = {
  bg: "#FFFFFF", bg2: "#F7F7F9", surface2: "#F2F2F5",
  rule: "#E5E5EA", rule2: "#D1D1D6",
  ink: "#1A1726", text2: "#605C70", text3: "#8E8A99",
  accent: "#02BDEA", accentD: "#0A4D70",
  amber: "#E08A0E", green: "#01B89E", red: "#D14040",
  mono: "'JetBrains Mono', monospace",
};

const STATUS_COLOR: Record<LeaveStatus, string> = {
  requested: T.amber,
  approved: T.green,
  rejected: T.red,
  cancelled: T.text3,
  taken: T.accentD,
};

const STATUS_LABEL: Record<LeaveStatus, string> = {
  requested: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
  cancelled: "Cancelada",
  taken: "Disfrutada",
};

export default function LeavesPage() {
  const [tab, setTab] = useState<"mine" | "approvals" | "balances" | "types">("mine");
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [leaves, setLeaves] = useState<LeaveSummary[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [meEmployeeId, setMeEmployeeId] = useState<number | null>(null);
  const [year] = useState(new Date().getFullYear());
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  
  /* Request form */
  const [reqOpen, setReqOpen] = useState(false);
  const [reqType, setReqType] = useState<number | "">("");
  const [reqStart, setReqStart] = useState("");
  const [reqEnd, setReqEnd] = useState("");
  const [reqReason, setReqReason] = useState("");
  const [requesting, setRequesting] = useState(false);

  /* Decision dialog */
  const [decideOpen, setDecideOpen] = useState<{ leave: Leave; action: "approve" | "reject" } | null>(null);
  const [decideNote, setDecideNote] = useState("");

  /* Type editor */
  const [typeOpen, setTypeOpen] = useState(false);
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const [typeForm, setTypeForm] = useState<LeaveTypeIn>({
    code: "vacation", name: "", accrual_strategy: "annual_grant",
    days_per_year: 22, color: "#02BDEA", requires_approval: true,
    allow_negative_balance: false, active: true,
  });

  /* Initial load */
  useEffect(() => {
    (async () => {
      try {
        const [t, emps] = await Promise.all([
          leavesApi.listTypes(),
          employeesApi.getEmployees({ pageSize: 100 }),
        ]);
        setTypes(t);
        setEmployees(emps.data);
        // Hardcoded: el primer empleado es "yo" para el demo.
        // En producción esto se resuelve desde el JWT.user_id.
        if (emps.data[0]) setMeEmployeeId(emps.data[0].id);
      } catch (e) {
        const err = e as { response?: { data?: { error?: string } } };
        notify({ kind: "error", msg: err.response?.data?.error || "Error cargando datos" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* Refresh por tab */
  useEffect(() => {
    if (!meEmployeeId) return;
    (async () => {
      try {
        if (tab === "mine") {
          const l = await leavesApi.listLeaves({ employee_id: meEmployeeId });
          setLeaves(l);
        } else if (tab === "approvals") {
          const l = await leavesApi.listLeaves({ status: "requested" });
          setLeaves(l);
        } else if (tab === "balances") {
          const b = await leavesApi.listBalances(meEmployeeId, year);
          setBalances(b);
        }
      } catch { /* silencio */ }
    })();
  }, [tab, meEmployeeId, year]);

  const empName = (id: number) => {
    const e = employees.find((x) => x.id === id);
    return e ? `${e.first_name} ${e.last_name}` : `#${id}`;
  };

  const openRequest = () => {
    setReqType(types[0]?.id || "");
    setReqStart(new Date().toISOString().slice(0, 10));
    setReqEnd(new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10));
    setReqReason("");
    setReqOpen(true);
  };

  const saveRequest = async () => {
    if (!meEmployeeId || !reqType) return;
    setRequesting(true);
    try {
      await leavesApi.requestLeave(meEmployeeId, {
        type_id: Number(reqType), start_date: reqStart, end_date: reqEnd,
        reason: reqReason.trim() || null,
      });
      setReqOpen(false);
      const l = await leavesApi.listLeaves({ employee_id: meEmployeeId });
      setLeaves(l);
      notify({ kind: "success", msg: "Solicitud enviada" });
    } catch (e) {
      const err = e as { response?: { data?: { error?: string; detail?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || err.response?.data?.detail || "No se pudo solicitar" });
    } finally {
      setRequesting(false);
    }
  };

  const openDecide = async (leaveId: number, action: "approve" | "reject") => {
    try {
      const detail = await leavesApi.getLeave(leaveId);
      setDecideNote("");
      setDecideOpen({ leave: detail, action });
    } catch { /* noop */ }
  };

  const submitDecide = async () => {
    if (!decideOpen) return;
    try {
      await leavesApi.decideLeave(decideOpen.leave.id, {
        decision: decideOpen.action === "approve" ? "approved" : "rejected",
        note: decideNote.trim() || null,
      });
      setDecideOpen(null);
      const l = await leavesApi.listLeaves({ status: "requested" });
      setLeaves(l);
      notify({
        kind: "success",
        msg: decideOpen.action === "approve" ? "Solicitud aprobada" : "Solicitud rechazada",
      });
    } catch (e) {
      const err = e as { response?: { data?: { error?: string; detail?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || err.response?.data?.detail || "Error" });
    }
  };

  const cancelLeave = async (leaveId: number) => {
    if (!confirm("¿Cancelar esta solicitud?")) return;
    try {
      await leavesApi.cancelLeave(leaveId);
      if (meEmployeeId) {
        const l = await leavesApi.listLeaves({ employee_id: meEmployeeId });
        setLeaves(l);
      }
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "No se pudo cancelar" });
    }
  };

  /* Type editor */
  const openCreateType = () => {
    setEditingType(null);
    setTypeForm({
      code: "vacation", name: "", accrual_strategy: "annual_grant",
      days_per_year: 22, color: "#02BDEA", requires_approval: true,
      allow_negative_balance: false, active: true,
    });
    setTypeOpen(true);
  };
  const openEditType = (t: LeaveType) => {
    setEditingType(t);
    setTypeForm({
      code: t.code, name: t.name, description: t.description,
      accrual_strategy: t.accrual_strategy, days_per_year: t.days_per_year,
      color: t.color, requires_approval: t.requires_approval,
      allow_negative_balance: t.allow_negative_balance, active: t.active,
    });
    setTypeOpen(true);
  };
  const saveType = async () => {
    if (!typeForm.name?.trim() || !typeForm.code?.trim()) {
      notify({ kind: "error", msg: "Código y nombre son obligatorios" });
      return;
    }
    try {
      if (editingType) await leavesApi.updateType(editingType.id, typeForm);
      else await leavesApi.createType(typeForm);
      const t = await leavesApi.listTypes();
      setTypes(t);
      setTypeOpen(false);
      notify({ kind: "success", msg: editingType ? "Tipo actualizado" : "Tipo creado" });
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "No se pudo guardar (¿rol admin?)" });
    }
  };

  /* Calendar — solo para mis solicitudes aprobadas */
  const calendarDays = useMemo(() => {
    const today = new Date();
    const yearN = today.getFullYear();
    const monthN = today.getMonth();
    const firstDay = new Date(yearN, monthN, 1);
    const lastDay = new Date(yearN, monthN + 1, 0);
    const days: Array<{ date: Date; type: LeaveType | null }> = [];
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(yearN, monthN, d);
      const iso = date.toISOString().slice(0, 10);
      const leave = leaves.find(
        (l) => (l.status === "approved" || l.status === "requested") &&
               iso >= l.start_date && iso <= l.end_date,
      );
      const type = leave ? types.find((t) => t.id === leave.type_id) || null : null;
      days.push({ date, type });
    }
    // Padding al inicio para que arranque el lunes
    const firstWeekday = (firstDay.getDay() + 6) % 7; // 0 = lunes
    return { days, firstWeekday, month: monthN, year: yearN };
  }, [leaves, types]);

  return (
    <Box sx={{ px: { xs: "16px", md: "32px" }, pb: "32px", maxWidth: 1280, mx: "auto", color: T.ink }}>
      {/* Header */}
      <Box sx={{ pb: "16px", mb: "16px", borderBottom: `1px solid ${T.rule}`, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: "-0.025em", color: T.ink, mb: 0.5 }}>
            Ausencias y permisos
          </Typography>
          <Typography variant="body2" sx={{ color: T.text2 }}>
            Solicitá vacaciones, mirá tu saldo, aprobá pedidos de tu equipo.
          </Typography>
        </Box>
        <Stack direction="row" gap={1.5}>
          {tab === "types" && (
            <Button variant="outlined" onClick={openCreateType} sx={{ borderColor: T.rule2, color: T.ink }}>
              + Tipo
            </Button>
          )}
          <Button variant="contained" onClick={openRequest} sx={{ bgcolor: T.accent, color: "#FFFFFF", boxShadow: "none", "&:hover": { bgcolor: "#0496BA", boxShadow: "none" } }}>
            + Solicitar
          </Button>
        </Stack>
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
        <Tab value="mine" label="Mis solicitudes" />
        <Tab value="approvals" label="Para aprobar" />
        <Tab value="balances" label="Balances" />
        <Tab value="types" label="Tipos" />
      </Tabs>

      {loading ? (
        <Box sx={{ p: "48px", textAlign: "center" }}>
          <CircularProgress size={22} sx={{ color: T.accent }} />
        </Box>
      ) : (
        <>
          {/* MIS SOLICITUDES — calendario + lista */}
          {tab === "mine" && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.2fr 1fr" }, gap: 2 }}>
              {/* Calendario */}
              <Box sx={{ p: "16px 20px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg }}>
                <Typography variant="caption" sx={{ color: T.text3, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, fontSize: 11 }}>
                  Calendario · {calendarDays.year} · mes {calendarDays.month + 1}
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5, mt: 1.5 }}>
                  {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
                    <Typography key={d} variant="caption" sx={{ textAlign: "center", color: T.text3, fontSize: 10, fontWeight: 600 }}>
                      {d}
                    </Typography>
                  ))}
                  {Array.from({ length: calendarDays.firstWeekday }).map((_, i) => (
                    <Box key={`pad-${i}`} />
                  ))}
                  {calendarDays.days.map(({ date, type }, i) => (
                    <Tooltip key={i} title={type ? type.name : ""}>
                      <Box sx={{
                        aspectRatio: "1", display: "grid", placeItems: "center",
                        borderRadius: 1, bgcolor: type ? `${type.color}25` : "transparent",
                        border: type ? `1px solid ${type.color}` : `1px solid ${T.rule}`,
                        fontSize: 12, fontVariantNumeric: "tabular-nums",
                        color: type ? T.ink : T.text2, cursor: type ? "pointer" : "default",
                      }}>
                        {date.getDate()}
                      </Box>
                    </Tooltip>
                  ))}
                </Box>
              </Box>

              {/* Lista */}
              <Box>
                <Typography variant="caption" sx={{ color: T.text3, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, fontSize: 11, mb: 1.5, display: "block" }}>
                  Solicitudes recientes
                </Typography>
                {leaves.length === 0 ? (
                  <Box sx={{ p: "32px 20px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg2, textAlign: "center" }}>
                    <Typography variant="caption" sx={{ color: T.text3 }}>
                      No tenés solicitudes
                    </Typography>
                  </Box>
                ) : (
                  <Stack gap={1}>
                    {leaves.map((l) => (
                      <LeaveRow key={l.id} item={l} onCancel={() => cancelLeave(l.id)} />
                    ))}
                  </Stack>
                )}
              </Box>
            </Box>
          )}

          {/* APROBACIONES */}
          {tab === "approvals" && (
            <Stack gap={1}>
              {leaves.filter((l) => l.status === "requested").length === 0 ? (
                <Box sx={{ p: "48px 32px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg2, textAlign: "center" }}>
                  <Typography variant="body1" sx={{ color: T.ink, fontWeight: 500, mb: 0.5 }}>Sin pendientes</Typography>
                  <Typography variant="caption" sx={{ color: T.text3 }}>Nadie en tu equipo está esperando aprobación</Typography>
                </Box>
              ) : (
                leaves.filter((l) => l.status === "requested").map((l) => (
                  <Box key={l.id} sx={{ p: "14px 18px", border: `1px solid ${T.rule}`, borderLeft: `3px solid ${l.type_color}`, borderRadius: 2, bgcolor: T.bg, display: "grid", gridTemplateColumns: "1fr auto auto", gap: 2, alignItems: "center" }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13.5 }}>
                        {empName(l.employee_id)} — {l.type_name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: T.text3, fontFamily: T.mono, fontSize: 11 }}>
                        {l.start_date} → {l.end_date} · {l.business_days} días hábiles
                      </Typography>
                    </Box>
                    <Button size="small" variant="outlined" onClick={() => openDecide(l.id, "reject")} sx={{ borderColor: T.rule2, color: T.red, "&:hover": { borderColor: T.red, bgcolor: "rgba(209,64,64,0.04)" } }}>
                      Rechazar
                    </Button>
                    <Button size="small" variant="contained" onClick={() => openDecide(l.id, "approve")} sx={{ bgcolor: T.green, "&:hover": { bgcolor: "#019683" } }}>
                      Aprobar
                    </Button>
                  </Box>
                ))
              )}
            </Stack>
          )}

          {/* BALANCES */}
          {tab === "balances" && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, gap: 2 }}>
              {balances.length === 0 ? (
                <Box sx={{ gridColumn: "1 / -1", p: "48px 32px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg2, textAlign: "center" }}>
                  <Typography variant="caption" sx={{ color: T.text3 }}>Sin balances para este año todavía</Typography>
                </Box>
              ) : balances.map((b) => (
                <Box key={b.id} sx={{ p: "16px 20px", border: `1px solid ${T.rule}`, borderLeft: `4px solid ${b.type_color}`, borderRadius: 2, bgcolor: T.bg }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>{b.type_name}</Typography>
                  <Stack direction="row" gap={3} mt={1.5}>
                    <Box>
                      <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5 }}>Devengado</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600, fontFamily: T.mono }}>{Number(b.accrued).toFixed(1)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5 }}>Usado</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: T.text2, fontFamily: T.mono }}>{Number(b.used).toFixed(1)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5 }}>Pendiente</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: T.amber, fontFamily: T.mono }}>{Number(b.pending).toFixed(1)}</Typography>
                    </Box>
                    <Box sx={{ ml: "auto", textAlign: "right" }}>
                      <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5 }}>Disponible</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: b.available > 0 ? T.green : T.red, fontFamily: T.mono }}>
                        {Number(b.available).toFixed(1)}
                      </Typography>
                    </Box>
                  </Stack>
                  <Box sx={{ mt: 1.5, position: "relative" }}>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, (b.used / Math.max(b.accrued, 1)) * 100)}
                      sx={{
                        height: 6, borderRadius: 3, bgcolor: T.surface2,
                        "& .MuiLinearProgress-bar": { bgcolor: b.type_color, borderRadius: 3 },
                      }}
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          {/* TIPOS */}
          {tab === "types" && (
            <Stack gap={1}>
              {types.length === 0 ? (
                <Box sx={{ p: "48px 32px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg2, textAlign: "center" }}>
                  <Typography variant="caption" sx={{ color: T.text3 }}>Sin tipos cargados — usá + Tipo arriba</Typography>
                </Box>
              ) : types.map((t) => (
                <Box key={t.id} sx={{ p: "12px 16px", border: `1px solid ${T.rule}`, borderLeft: `4px solid ${t.color}`, borderRadius: 2, bgcolor: T.bg, display: "grid", gridTemplateColumns: "1fr auto auto", gap: 2, alignItems: "center" }}>
                  <Box>
                    <Stack direction="row" gap={1} alignItems="center">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{t.name}</Typography>
                      <Chip label={t.code} size="small" sx={{ height: 18, fontSize: 10, fontFamily: T.mono, bgcolor: T.surface2, color: T.text2 }} />
                      {!t.active && <Chip label="inactivo" size="small" sx={{ height: 18, fontSize: 10, bgcolor: T.surface2, color: T.text3 }} />}
                    </Stack>
                    <Typography variant="caption" sx={{ color: T.text3, fontFamily: T.mono, fontSize: 11, display: "block", mt: 0.25 }}>
                      {t.accrual_strategy} · {t.days_per_year} días/año · {t.requires_approval ? "requiere aprobación" : "sin aprobación"}
                    </Typography>
                  </Box>
                  <Button size="small" variant="text" onClick={() => openEditType(t)} sx={{ color: T.text2 }}>Editar</Button>
                </Box>
              ))}
            </Stack>
          )}
        </>
      )}

      {/* DIALOG: solicitar */}
      <Dialog open={reqOpen} onClose={() => setReqOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Solicitar ausencia</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ pt: 1 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Tipo</InputLabel>
              <Select label="Tipo" value={reqType} onChange={(e) => setReqType(Number(e.target.value))}>
                {types.filter((t) => t.active).map((t) => (
                  <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction="row" gap={2}>
              <TextField size="small" type="date" label="Inicio" value={reqStart} onChange={(e) => setReqStart(e.target.value)} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
              <TextField size="small" type="date" label="Fin" value={reqEnd} onChange={(e) => setReqEnd(e.target.value)} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
            </Stack>
            <TextField size="small" label="Motivo (opcional)" value={reqReason} onChange={(e) => setReqReason(e.target.value)} fullWidth multiline minRows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReqOpen(false)}>Cancelar</Button>
          <Button onClick={saveRequest} variant="contained" disabled={requesting} sx={{ bgcolor: T.accent, "&:hover": { bgcolor: "#0496BA" } }}>
            {requesting ? <CircularProgress size={16} sx={{ color: "#FFFFFF" }} /> : "Solicitar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: aprobar/rechazar */}
      <Dialog open={!!decideOpen} onClose={() => setDecideOpen(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          {decideOpen?.action === "approve" ? "Aprobar solicitud" : "Rechazar solicitud"}
        </DialogTitle>
        <DialogContent>
          {decideOpen && (
            <Stack gap={2} sx={{ pt: 1 }}>
              <Typography variant="body2" sx={{ color: T.text2 }}>
                {empName(decideOpen.leave.employee_id)} — {decideOpen.leave.business_days} días<br />
                {decideOpen.leave.start_date} a {decideOpen.leave.end_date}
              </Typography>
              <TextField size="small" label="Nota (opcional)" value={decideNote} onChange={(e) => setDecideNote(e.target.value)} fullWidth multiline minRows={2} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDecideOpen(null)}>Cancelar</Button>
          <Button onClick={submitDecide} variant="contained" sx={{ bgcolor: decideOpen?.action === "approve" ? T.green : T.red }}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: tipo */}
      <Dialog open={typeOpen} onClose={() => setTypeOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>{editingType ? "Editar tipo" : "Nuevo tipo"}</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ pt: 1 }}>
            <Stack direction="row" gap={2}>
              <TextField size="small" label="Código *" value={typeForm.code} onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })} sx={{ width: 140 }} />
              <TextField size="small" label="Nombre *" value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} fullWidth />
              <TextField size="small" type="color" label="Color" value={typeForm.color} onChange={(e) => setTypeForm({ ...typeForm, color: e.target.value })} sx={{ width: 80 }} />
            </Stack>
            <Stack direction="row" gap={2}>
              <FormControl size="small" fullWidth>
                <InputLabel>Devengo</InputLabel>
                <Select label="Devengo" value={typeForm.accrual_strategy} onChange={(e) => setTypeForm({ ...typeForm, accrual_strategy: e.target.value })}>
                  <MenuItem value="annual_grant">Anual (N días al inicio del año)</MenuItem>
                  <MenuItem value="monthly_accrual">Mensual (N/12 al mes)</MenuItem>
                  <MenuItem value="unlimited">Sin saldo (enfermedad)</MenuItem>
                </Select>
              </FormControl>
              <TextField size="small" type="number" label="Días/año" value={typeForm.days_per_year} onChange={(e) => setTypeForm({ ...typeForm, days_per_year: parseFloat(e.target.value) || 0 })} sx={{ width: 110 }} />
            </Stack>
            <Stack direction="row" gap={3}>
              <Box>
                <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, display: "block" }}>Requiere aprobación</Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={typeForm.requires_approval ? "Sí" : "No"} size="small"
                    onClick={() => setTypeForm({ ...typeForm, requires_approval: !typeForm.requires_approval })}
                    sx={{ bgcolor: typeForm.requires_approval ? T.green : T.surface2, color: typeForm.requires_approval ? "#FFFFFF" : T.text2, cursor: "pointer" }}
                  />
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, display: "block" }}>Permite saldo negativo</Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={typeForm.allow_negative_balance ? "Sí" : "No"} size="small"
                    onClick={() => setTypeForm({ ...typeForm, allow_negative_balance: !typeForm.allow_negative_balance })}
                    sx={{ bgcolor: typeForm.allow_negative_balance ? T.amber : T.surface2, color: typeForm.allow_negative_balance ? "#FFFFFF" : T.text2, cursor: "pointer" }}
                  />
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, display: "block" }}>Activo</Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={typeForm.active ? "Sí" : "No"} size="small"
                    onClick={() => setTypeForm({ ...typeForm, active: !typeForm.active })}
                    sx={{ bgcolor: typeForm.active ? T.green : T.surface2, color: typeForm.active ? "#FFFFFF" : T.text2, cursor: "pointer" }}
                  />
                </Box>
              </Box>
            </Stack>
            <TextField size="small" label="Descripción" value={typeForm.description || ""} onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })} fullWidth multiline minRows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTypeOpen(false)}>Cancelar</Button>
          <Button onClick={saveType} variant="contained" sx={{ bgcolor: T.accent, "&:hover": { bgcolor: "#0496BA" } }}>
            {editingType ? "Guardar" : "Crear"}
          </Button>
        </DialogActions>
      </Dialog>
</Box>
  );
}

function LeaveRow({ item, onCancel }: { item: LeaveSummary; onCancel: () => void }) {
  const sColor = STATUS_COLOR[item.status];
  return (
    <Box sx={{
      p: "12px 16px", border: `1px solid ${T.rule}`,
      borderLeft: `3px solid ${item.type_color}`, borderRadius: 2, bgcolor: T.bg,
      display: "grid", gridTemplateColumns: "1fr auto", gap: 2, alignItems: "center",
    }}>
      <Box>
        <Stack direction="row" gap={1} alignItems="center">
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>{item.type_name}</Typography>
          <Chip label={STATUS_LABEL[item.status]} size="small" sx={{ bgcolor: `${sColor}15`, color: sColor, fontWeight: 600, height: 20, fontSize: 10.5 }} />
        </Stack>
        <Typography variant="caption" sx={{ color: T.text3, fontFamily: T.mono, fontSize: 11 }}>
          {item.start_date} → {item.end_date} · {item.business_days}d
        </Typography>
      </Box>
      {(item.status === "requested" || item.status === "approved") && (
        <Button size="small" onClick={onCancel} sx={{ color: T.text2, minWidth: 0 }}>Cancelar</Button>
      )}
    </Box>
  );
}
