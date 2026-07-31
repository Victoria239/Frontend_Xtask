/* OKRs en cascada (C-02).
 *
 * UI principal: árbol jerárquico con tarjetas anidadas que muestran:
 *   - objective + scope (company/team/individual)
 *   - barra de progreso + semáforo de status
 *   - key results expandibles con su propio progreso y check-in inline
 *   - acciones: + KR, + sub-OKR, editar, eliminar
 *
 * Filtro por período. Crear OKR raíz desde el botón "+ Nuevo OKR".
 */

import { useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControl, IconButton, InputLabel, LinearProgress, MenuItem, Select, Stack, TextField, Tooltip, Typography,
} from "@mui/material";
import { okrsApi, employeesApi, kpisApi } from "../../api";
import type { KeyResult, KeyResultIn, OkrIn, OkrTreeNode } from "../../api/okrs";
import type { Employee } from "../../types";
import { notify } from "../../hooks/useToast";
import WhatIfPanel from "./WhatIfPanel";

const T = {
  bg: "#FFFFFF",
  bg2: "#F7F7F9",
  surface2: "#F2F2F5",
  rule: "#E5E5EA",
  rule2: "#D1D1D6",
  ink: "#1A1726",
  text2: "#605C70",
  text3: "#8E8A99",
  accent: "#02BDEA",
  accentD: "#0A4D70",
  brand: "#251948",
  amber: "#E08A0E",
  green: "#01B89E",
  red: "#D14040",
  mono: "'JetBrains Mono', monospace",
};

const STATUS_COLORS: Record<string, string> = {
  exceeded: T.green,
  met: T.green,
  "on-track": T.accent,
  "at-risk": T.amber,
  "off-track": T.red,
};

const STATUS_LABEL: Record<string, string> = {
  exceeded: "Superado",
  met: "Cumplido",
  "on-track": "En curso",
  "at-risk": "En riesgo",
  "off-track": "Fuera de curso",
};

const SCOPE_LABEL: Record<string, string> = {
  company: "Empresa",
  team: "Equipo",
  individual: "Individual",
};

const DEFAULT_PERIOD = "2026-Q3";

const EMPTY_OKR: OkrIn = {
  scope: "company",
  parent_id: null,
  objective: "",
  description: "",
  period: DEFAULT_PERIOD,
  weight: 1.0,
  key_results: [],
};

interface KpiOption {
  id: number;
  name: string;
}

export default function OkrsPage() {
  const [period, setPeriod] = useState(DEFAULT_PERIOD);
  const [tree, setTree] = useState<OkrTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [kpis, setKpis] = useState<KpiOption[]>([]);

  /* CRUD OKR */
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [parentForNew, setParentForNew] = useState<number | null>(null);
  const [form, setForm] = useState<OkrIn>(EMPTY_OKR);
  const [savingForm, setSavingForm] = useState(false);

  /* Add KR */
  const [krOpen, setKrOpen] = useState<{ okrId: number } | null>(null);
  const [krForm, setKrForm] = useState<KeyResultIn>({ name: "", target: 100, baseline: 0, current: 0, weight: 1, linked_kpi_id: null });
  const [savingKr, setSavingKr] = useState(false);

  /* Check-in */
  const [checkinOpen, setCheckinOpen] = useState<{ kr: KeyResult } | null>(null);
  const [whatifOpen, setWhatifOpen] = useState(false);
  const [checkinValue, setCheckinValue] = useState("");
  const [checkinComment, setCheckinComment] = useState("");

  /* Load */
  const refresh = async () => {
    setLoading(true);
    try {
      const t = await okrsApi.getCascade(period);
      setTree(t);
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "Error cargando OKRs" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [period]);

  useEffect(() => {
    (async () => {
      try {
        const [emps, kp] = await Promise.all([
          employeesApi.getEmployees({ pageSize: 100 }),
          kpisApi.getKpis({ pageSize: 100 }).catch(() => ({ data: [] as Array<{ id: number; name: string }> })),
        ]);
        setEmployees(emps.data);
        setKpis((kp.data || []).map((k) => ({ id: k.id, name: k.name })));
      } catch { /* silencioso */ }
    })();
  }, []);

  /* Form handlers */
  const openCreate = (parentId: number | null = null) => {
    setEditingId(null);
    setParentForNew(parentId);
    setForm({ ...EMPTY_OKR, parent_id: parentId, scope: parentId ? "team" : "company", period });
    setFormOpen(true);
  };

  const openEdit = (node: OkrTreeNode) => {
    setEditingId(node.id);
    setParentForNew(null);
    setForm({
      scope: node.scope,
      parent_id: node.parent_id,
      owner_employee_id: node.owner_employee_id,
      owner_department: node.owner_department,
      objective: node.objective,
      description: node.description,
      period: node.period,
      weight: node.weight,
      key_results: [],  // KRs se editan/agregan aparte
    });
    setFormOpen(true);
  };

  const saveOkr = async () => {
    if (!form.objective.trim() || !form.period.trim()) {
      notify({ kind: "error", msg: "Objective y período son obligatorios" });
      return;
    }
    setSavingForm(true);
    try {
      if (editingId) {
        await okrsApi.updateOkr(editingId, {
          scope: form.scope, objective: form.objective.trim(),
          description: form.description?.trim() || null,
          owner_employee_id: form.owner_employee_id || null,
          owner_department: form.owner_department?.trim() || null,
          period: form.period, weight: form.weight,
        });
      } else {
        await okrsApi.createOkr({
          ...form,
          objective: form.objective.trim(),
          description: form.description?.trim() || null,
          owner_department: form.owner_department?.trim() || null,
        });
      }
      setFormOpen(false);
      await refresh();
      notify({ kind: "success", msg: editingId ? "OKR actualizado" : "OKR creado" });
    } catch (e) {
      const err = e as { response?: { data?: { error?: string; detail?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || err.response?.data?.detail || "No se pudo guardar" });
    } finally {
      setSavingForm(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este OKR? Los hijos quedan huérfanos.")) return;
    try {
      await okrsApi.deleteOkr(id);
      await refresh();
      notify({ kind: "success", msg: "OKR eliminado" });
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "No se pudo eliminar" });
    }
  };

  const openAddKr = (okrId: number) => {
    setKrForm({ name: "", target: 100, baseline: 0, current: 0, weight: 1, linked_kpi_id: null });
    setKrOpen({ okrId });
  };

  const saveKr = async () => {
    if (!krOpen) return;
    if (!krForm.name.trim() || krForm.target === undefined) {
      notify({ kind: "error", msg: "Nombre y target son obligatorios" });
      return;
    }
    setSavingKr(true);
    try {
      await okrsApi.addKr(krOpen.okrId, { ...krForm, name: krForm.name.trim() });
      setKrOpen(null);
      await refresh();
      notify({ kind: "success", msg: "Key Result agregado" });
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "No se pudo agregar el KR" });
    } finally {
      setSavingKr(false);
    }
  };

  const handleDeleteKr = async (krId: number) => {
    if (!confirm("¿Eliminar este Key Result?")) return;
    try {
      await okrsApi.deleteKr(krId);
      await refresh();
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "No se pudo eliminar" });
    }
  };

  const openCheckin = (kr: KeyResult) => {
    setCheckinValue(String(kr.current));
    setCheckinComment("");
    setCheckinOpen({ kr });
  };

  const saveCheckin = async () => {
    if (!checkinOpen) return;
    const v = parseFloat(checkinValue);
    if (Number.isNaN(v)) {
      notify({ kind: "error", msg: "El valor debe ser numérico" });
      return;
    }
    try {
      await okrsApi.checkin({ kr_id: checkinOpen.kr.id, value: v, comment: checkinComment.trim() || undefined });
      setCheckinOpen(null);
      await refresh();
      notify({ kind: "success", msg: "Check-in registrado" });
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "No se pudo registrar el check-in" });
    }
  };

  /* Métricas resumidas (encabezado) */
  const summary = useMemo(() => {
    const flatten = (nodes: OkrTreeNode[]): OkrTreeNode[] =>
      nodes.flatMap((n) => [n, ...flatten(n.children)]);
    const all = flatten(tree);
    return {
      total: all.length,
      onTrack: all.filter((o) => o.status === "on-track" || o.status === "met" || o.status === "exceeded").length,
      atRisk: all.filter((o) => o.status === "at-risk").length,
      offTrack: all.filter((o) => o.status === "off-track").length,
      avgProgress: all.length > 0 ? all.reduce((s, o) => s + Number(o.progress), 0) / all.length : 0,
    };
  }, [tree]);

  return (
    <Box sx={{ px: { xs: "16px", md: "32px" }, pb: "32px", maxWidth: 1280, mx: "auto", color: T.ink }}>
      {/* Header */}
      <Box sx={{ pb: "16px", mb: "16px", borderBottom: `1px solid ${T.rule}`, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: "-0.025em", color: T.ink, mb: 0.5 }}>
            OKRs en cascada
          </Typography>
          <Typography variant="body2" sx={{ color: T.text2 }}>
            Empresa → equipo → individuo. Cumplimiento ponderado se propaga hacia arriba.
          </Typography>
        </Box>
        <Stack direction="row" gap={1.5} alignItems="center">
          <TextField
            size="small" label="Período" value={period}
            onChange={(e) => setPeriod(e.target.value)}
            sx={{ width: 140 }}
          />
          <Button variant="outlined" onClick={() => setWhatifOpen(true)} disabled={tree.length === 0} sx={{ borderColor: T.rule2, color: T.ink }}>
            What-if
          </Button>
          <Button variant="contained" onClick={() => openCreate(null)} sx={{ bgcolor: T.accent, color: "#FFFFFF", boxShadow: "none", "&:hover": { bgcolor: "#0496BA", boxShadow: "none" } }}>
            + Nuevo OKR
          </Button>
        </Stack>
      </Box>

      {/* Stats strip */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 1.5, mb: 2.5 }}>
        <StatCard label="OKRs totales" value={summary.total} />
        <StatCard label="En curso" value={summary.onTrack} color={T.green} />
        <StatCard label="En riesgo" value={summary.atRisk} color={T.amber} />
        <StatCard label="Avance medio" value={`${summary.avgProgress.toFixed(0)}%`} color={T.accent} />
      </Box>

      {/* Tree */}
      {loading ? (
        <Box sx={{ p: "48px", textAlign: "center" }}>
          <CircularProgress size={22} sx={{ color: T.accent }} />
        </Box>
      ) : tree.length === 0 ? (
        <Box sx={{ p: "48px 32px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg2, textAlign: "center" }}>
          <Typography variant="body1" sx={{ color: T.ink, fontWeight: 500, mb: 0.5 }}>
            Sin OKRs en {period}
          </Typography>
          <Typography variant="caption" sx={{ color: T.text3 }}>
            Creá el primer objetivo de empresa con + Nuevo OKR
          </Typography>
        </Box>
      ) : (
        <Stack gap={2}>
          {tree.map((node) => (
            <OkrCard
              key={node.id}
              node={node}
              depth={0}
              onAddChild={openCreate}
              onAddKr={openAddKr}
              onEdit={openEdit}
              onDelete={handleDelete}
              onCheckinKr={openCheckin}
              onDeleteKr={handleDeleteKr}
              employees={employees}
            />
          ))}
        </Stack>
      )}

      {/* Dialog crear/editar OKR */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          {editingId ? "Editar OKR" : parentForNew ? "Nuevo sub-OKR" : "Nuevo OKR raíz"}
        </DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ pt: 1 }}>
            <Stack direction="row" gap={2}>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Scope</InputLabel>
                <Select label="Scope" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as OkrIn["scope"] })}>
                  <MenuItem value="company">Empresa</MenuItem>
                  <MenuItem value="team">Equipo</MenuItem>
                  <MenuItem value="individual">Individual</MenuItem>
                </Select>
              </FormControl>
              <TextField size="small" label="Período *" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} fullWidth />
            </Stack>
            <TextField size="small" label="Objective *" value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} fullWidth multiline minRows={2} />
            <TextField size="small" label="Descripción" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} fullWidth multiline minRows={2} />
            <Stack direction="row" gap={2}>
              <TextField size="small" label="Peso" type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: parseFloat(e.target.value) || 1 })} sx={{ minWidth: 100 }} slotProps={{ htmlInput: { step: 0.1, min: 0.1 } }} />
              <TextField size="small" label="Departamento" value={form.owner_department || ""} onChange={(e) => setForm({ ...form, owner_department: e.target.value })} fullWidth />
            </Stack>
            {form.scope === "individual" && (
              <FormControl size="small" fullWidth>
                <InputLabel>Empleado dueño</InputLabel>
                <Select label="Empleado dueño" value={form.owner_employee_id || ""} onChange={(e) => setForm({ ...form, owner_employee_id: Number(e.target.value) || null })}>
                  <MenuItem value="">— Sin asignar —</MenuItem>
                  {employees.map((e) => (
                    <MenuItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>Cancelar</Button>
          <Button onClick={saveOkr} variant="contained" disabled={savingForm} sx={{ bgcolor: T.accent, "&:hover": { bgcolor: "#0496BA" } }}>
            {savingForm ? <CircularProgress size={16} sx={{ color: "#FFFFFF" }} /> : editingId ? "Guardar" : "Crear"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog agregar KR */}
      <Dialog open={!!krOpen} onClose={() => setKrOpen(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Nuevo Key Result</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ pt: 1 }}>
            <TextField size="small" label="Nombre *" value={krForm.name} onChange={(e) => setKrForm({ ...krForm, name: e.target.value })} fullWidth />
            <Stack direction="row" gap={2}>
              <TextField size="small" label="Baseline" type="number" value={krForm.baseline} onChange={(e) => setKrForm({ ...krForm, baseline: parseFloat(e.target.value) || 0 })} fullWidth />
              <TextField size="small" label="Target *" type="number" value={krForm.target} onChange={(e) => setKrForm({ ...krForm, target: parseFloat(e.target.value) || 0 })} fullWidth />
            </Stack>
            <Stack direction="row" gap={2}>
              <TextField size="small" label="Current" type="number" value={krForm.current} onChange={(e) => setKrForm({ ...krForm, current: parseFloat(e.target.value) || 0 })} fullWidth />
              <TextField size="small" label="Peso" type="number" value={krForm.weight} onChange={(e) => setKrForm({ ...krForm, weight: parseFloat(e.target.value) || 1 })} fullWidth slotProps={{ htmlInput: { step: 0.1, min: 0.1 } }} />
            </Stack>
            <TextField size="small" label="Unidad" value={krForm.unit || ""} onChange={(e) => setKrForm({ ...krForm, unit: e.target.value })} fullWidth placeholder="%, clientes, €..." />
            <FormControl size="small" fullWidth>
              <InputLabel>KPI vinculado (opcional)</InputLabel>
              <Select label="KPI vinculado (opcional)" value={krForm.linked_kpi_id || ""} onChange={(e) => setKrForm({ ...krForm, linked_kpi_id: Number(e.target.value) || null })}>
                <MenuItem value="">— Sin vincular —</MenuItem>
                {kpis.map((k) => (
                  <MenuItem key={k.id} value={k.id}>{k.name}</MenuItem>
                ))}
              </Select>
              <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, mt: 0.5 }}>
                Si vinculás, las mediciones del KPI hacen check-in automático al KR.
              </Typography>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setKrOpen(null)}>Cancelar</Button>
          <Button onClick={saveKr} variant="contained" disabled={savingKr} sx={{ bgcolor: T.accent, "&:hover": { bgcolor: "#0496BA" } }}>
            {savingKr ? <CircularProgress size={16} sx={{ color: "#FFFFFF" }} /> : "Agregar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog check-in */}
      <Dialog open={!!checkinOpen} onClose={() => setCheckinOpen(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Check-in</DialogTitle>
        <DialogContent>
          {checkinOpen && (
            <Stack gap={2} sx={{ pt: 1 }}>
              <Typography variant="body2" sx={{ color: T.text2, fontSize: 13 }}>
                <b>{checkinOpen.kr.name}</b><br />
                Target {checkinOpen.kr.target} · Actual {checkinOpen.kr.current}
              </Typography>
              <TextField size="small" label="Nuevo valor" type="number" value={checkinValue} onChange={(e) => setCheckinValue(e.target.value)} fullWidth autoFocus />
              <TextField size="small" label="Comentario (opcional)" value={checkinComment} onChange={(e) => setCheckinComment(e.target.value)} fullWidth multiline minRows={2} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCheckinOpen(null)}>Cancelar</Button>
          <Button onClick={saveCheckin} variant="contained" sx={{ bgcolor: T.accent, "&:hover": { bgcolor: "#0496BA" } }}>
            Registrar
          </Button>
        </DialogActions>
      </Dialog>

      <WhatIfPanel
        open={whatifOpen}
        onClose={() => setWhatifOpen(false)}
        tree={tree}
        period={period}
      />
</Box>
  );
}

/* ─── Subcomponents ─── */

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <Box sx={{ p: "14px 16px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg }}>
      <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, display: "block" }}>
        {label}
      </Typography>
      <Typography variant="h5" sx={{ color: color || T.ink, fontWeight: 700, mt: 0.5, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </Typography>
    </Box>
  );
}

function OkrCard({
  node, depth, onAddChild, onAddKr, onEdit, onDelete, onCheckinKr, onDeleteKr, employees,
}: {
  node: OkrTreeNode;
  depth: number;
  onAddChild: (parentId: number) => void;
  onAddKr: (okrId: number) => void;
  onEdit: (n: OkrTreeNode) => void;
  onDelete: (id: number) => void;
  onCheckinKr: (kr: KeyResult) => void;
  onDeleteKr: (id: number) => void;
  employees: Employee[];
}) {
  const [expanded, setExpanded] = useState(true);
  const statusColor = STATUS_COLORS[node.status] || T.text3;
  const ownerName = node.owner_employee_id
    ? employees.find((e) => e.id === node.owner_employee_id)
    : null;

  return (
    <Box sx={{ ml: depth * 3 }}>
      <Box sx={{
        p: "16px 20px",
        border: `1px solid ${T.rule}`,
        borderLeft: `3px solid ${statusColor}`,
        borderRadius: 2,
        bgcolor: T.bg,
        transition: "border-color 160ms",
        "&:hover": { borderColor: T.rule2, borderLeftColor: statusColor },
      }}>
        {/* Header del card */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" gap={1} alignItems="center" mb={0.5}>
              <Chip
                label={SCOPE_LABEL[node.scope]}
                size="small"
                sx={{ bgcolor: T.surface2, color: T.text2, fontFamily: T.mono, fontSize: 10.5, height: 20 }}
              />
              <Chip
                label={STATUS_LABEL[node.status]}
                size="small"
                sx={{ bgcolor: `${statusColor}15`, color: statusColor, fontSize: 10.5, height: 20, fontWeight: 600 }}
              />
              <Typography variant="caption" sx={{ color: T.text3, fontFamily: T.mono, fontSize: 10.5 }}>
                {node.period}
              </Typography>
              {(node.owner_department || ownerName) && (
                <Typography variant="caption" sx={{ color: T.text3, fontSize: 11 }}>
                  · {ownerName ? `${ownerName.first_name} ${ownerName.last_name}` : node.owner_department}
                </Typography>
              )}
            </Stack>
            <Typography variant="body1" sx={{ fontWeight: 600, color: T.ink, fontSize: 15, lineHeight: 1.3 }}>
              {node.objective}
            </Typography>
            {node.description && (
              <Typography variant="caption" sx={{ color: T.text2, fontSize: 12, display: "block", mt: 0.5 }}>
                {node.description}
              </Typography>
            )}
          </Box>
          <Stack direction="row" gap={0.5}>
            <Tooltip title="Agregar KR">
              <IconButton size="small" onClick={() => onAddKr(node.id)} sx={{ color: T.text2 }}>
                <PlusKrIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Agregar sub-OKR">
              <IconButton size="small" onClick={() => onAddChild(node.id)} sx={{ color: T.text2 }}>
                <PlusBranchIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Editar">
              <IconButton size="small" onClick={() => onEdit(node)} sx={{ color: T.text3 }}>
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Eliminar">
              <IconButton size="small" onClick={() => onDelete(node.id)} sx={{ color: T.text3, "&:hover": { color: T.red } }}>
                <TrashIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        {/* Progress bar */}
        <Stack direction="row" gap={1.5} alignItems="center" mt={1.5}>
          <Box sx={{ flex: 1, position: "relative" }}>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, Number(node.progress))}
              sx={{
                height: 8, borderRadius: 4, bgcolor: T.surface2,
                "& .MuiLinearProgress-bar": { bgcolor: statusColor, borderRadius: 4 },
              }}
            />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600, color: T.ink, fontVariantNumeric: "tabular-nums", minWidth: 50, textAlign: "right", fontSize: 13 }}>
            {Number(node.progress).toFixed(0)}%
          </Typography>
        </Stack>

        {/* Key Results */}
        {node.key_results.length > 0 && (
          <Box sx={{ mt: 2, pt: 1.5, borderTop: `1px solid ${T.rule}` }}>
            <Stack direction="row" alignItems="center" gap={1} mb={1}>
              <Box
                component="button"
                onClick={() => setExpanded(!expanded)}
                sx={{
                  background: "transparent", border: "none", cursor: "pointer", p: 0,
                  color: T.text3, display: "flex", alignItems: "center", gap: 0.5,
                }}
              >
                <Box sx={{ transition: "transform 160ms", transform: expanded ? "rotate(90deg)" : "rotate(0)" }}>
                  <ChevronRightIcon />
                </Box>
                <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                  Key Results ({node.key_results.length})
                </Typography>
              </Box>
            </Stack>
            {expanded && (
              <Stack gap={1}>
                {node.key_results.map((kr) => (
                  <KrRow key={kr.id} kr={kr} onCheckin={() => onCheckinKr(kr)} onDelete={() => onDeleteKr(kr.id)} />
                ))}
              </Stack>
            )}
          </Box>
        )}
      </Box>

      {/* Children — recursivo */}
      {node.children.length > 0 && (
        <Stack gap={2} mt={2}>
          {node.children.map((child) => (
            <OkrCard
              key={child.id}
              node={child}
              depth={depth + 1}
              onAddChild={onAddChild}
              onAddKr={onAddKr}
              onEdit={onEdit}
              onDelete={onDelete}
              onCheckinKr={onCheckinKr}
              onDeleteKr={onDeleteKr}
              employees={employees}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}

function KrRow({ kr, onCheckin, onDelete }: { kr: KeyResult; onCheckin: () => void; onDelete: () => void }) {
  const statusColor = kr.progress >= 100 ? T.green : kr.progress >= 70 ? T.accent : kr.progress >= 40 ? T.amber : T.red;
  return (
    <Box sx={{ p: "10px 12px", bgcolor: T.bg2, borderRadius: 1.5, display: "grid", gridTemplateColumns: "1fr 120px auto auto", gap: 1.5, alignItems: "center" }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 500, color: T.ink, fontSize: 13 }}>
          {kr.name}
          {kr.linked_kpi_id && (
            <Tooltip title={`Auto check-in desde KPI #${kr.linked_kpi_id}`}>
              <Chip label="🔗 KPI" size="small" sx={{ ml: 0.75, height: 16, fontSize: 9, bgcolor: "rgba(2,189,234,0.12)", color: T.accentD }} />
            </Tooltip>
          )}
        </Typography>
        <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, fontFamily: T.mono }}>
          {kr.baseline} → {kr.current} / {kr.target} {kr.unit || ""}
        </Typography>
      </Box>
      <Box>
        <LinearProgress
          variant="determinate"
          value={Math.min(100, Number(kr.progress))}
          sx={{ height: 5, borderRadius: 3, bgcolor: "#E5E5EA", "& .MuiLinearProgress-bar": { bgcolor: statusColor, borderRadius: 3 } }}
        />
        <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5, fontFamily: T.mono, display: "block", textAlign: "right", mt: 0.25 }}>
          {Number(kr.progress).toFixed(0)}%
        </Typography>
      </Box>
      <Button size="small" variant="outlined" onClick={onCheckin} sx={{ borderColor: T.rule2, color: T.ink, fontSize: 11, minWidth: 0, px: 1.5, "&:hover": { bgcolor: T.bg } }}>
        Check-in
      </Button>
      <IconButton size="small" onClick={onDelete} sx={{ color: T.text3, "&:hover": { color: T.red } }}>
        <TrashIcon />
      </IconButton>
    </Box>
  );
}

/* Icons */
function PlusKrIcon() { return (<svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>); }
function PlusBranchIcon() { return (<svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 3 6 21"/><polyline points="6 12 18 12 18 21"/><line x1="15" y1="9" x2="21" y2="9"/><line x1="18" y1="6" x2="18" y2="12"/></svg>); }
function EditIcon() { return (<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>); }
function TrashIcon() { return (<svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>); }
function ChevronRightIcon() { return (<svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>); }
