/* KPIs · vista por empleado (C-01).
 *
 * Layout:
 *   ┌──────────────┬─────────────────────────────────────────────┐
 *   │ Lista        │  Header del empleado seleccionado           │
 *   │ empleados    ├─────────────────────────────────────────────┤
 *   │ con KPI count│  Grid de KPI cards (target, actual, %)      │
 *   │              │  Cada card: nombre, sparkline, badge status │
 *   └──────────────┴─────────────────────────────────────────────┘
 *
 * Click en KPI → modal con histórico de measurements (sparkline + tabla).
 */

import { useEffect, useMemo, useState } from "react";
import {
  Box, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Stack, Typography, Button, TextField, Alert,
  Tabs, Tab, Table, TableBody, TableCell, TableHead, TableRow,
  IconButton, Tooltip, MenuItem, Select, FormControl, InputLabel,
} from "@mui/material";
import { kpisApi, employeesApi } from "../../api";
import type { Kpi, KpiMeasurement, Employee } from "../../types";
import { notify } from "../../hooks/useToast";

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
  accent2: "#01E3D5",
  accentD: "#0A4D70",
  brand: "#251948",
  amber: "#E08A0E",
  green: "#01B89E",
  red: "#D14040",
  mono: "'JetBrains Mono', monospace",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  in_progress: "En curso",
  "on-track": "En track",
  on_track: "En track",
  "at-risk": "En riesgo",
  at_risk: "En riesgo",
  met: "Cumplido",
  exceeded: "Sobrepasado",
  failed: "No cumplido",
};
const STATUS_COLOR: Record<string, string> = {
  pending: T.text3,
  in_progress: T.amber,
  "on-track": T.green,
  on_track: T.green,
  "at-risk": T.amber,
  at_risk: T.amber,
  met: T.green,
  exceeded: T.accent,
  failed: T.red,
};

/* Form vacío para crear KPI nuevo — campos que el backend persiste */
const EMPTY_FORM = {
  employee_id: 0,
  name: "",
  description: "",
  metric_type: "numeric" as string,
  unit: "",
  target_value: 0,
  weight: 1,
  period: "",
  periodicity: "monthly" as string,
};
type KpiFormState = typeof EMPTY_FORM;

export default function KpisPage() {
  const [tab, setTab] = useState<"employee" | "catalog">("employee");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [activeEmp, setActiveEmp] = useState<number | null>(null);
  const [loadingEmp, setLoadingEmp] = useState(true);
  const [loadingKpis, setLoadingKpis] = useState(false);
  const [detail, setDetail] = useState<Kpi | null>(null);
  const [measurements, setMeasurements] = useState<KpiMeasurement[]>([]);
  const [loadingMeasurements, setLoadingMeasurements] = useState(false);
  const [evalValue, setEvalValue] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  
  /* Catálogo */
  const [allKpis, setAllKpis] = useState<Kpi[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterEmp, setFilterEmp] = useState<number | "">("");
  const [filterPeriod, setFilterPeriod] = useState<string>("");

  /* Form crear/editar */
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<KpiFormState>(EMPTY_FORM);
  const [formSaving, setFormSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  /* Carga empleados (al montar) */
  useEffect(() => {
    (async () => {
      try {
        const res = await employeesApi.getEmployees({ pageSize: 100 });
        setEmployees(res.data);
        if (res.data.length > 0 && activeEmp == null) setActiveEmp(res.data[0].id);
      } catch (e) {
        const err = e as { response?: { data?: { error?: string } } };
        notify({ kind: "error", msg: err.response?.data?.error || "No se cargaron los empleados" });
      } finally {
        setLoadingEmp(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Carga KPIs del empleado activo */
  useEffect(() => {
    if (activeEmp == null) return;
    let cancel = false;
    setLoadingKpis(true);
    kpisApi.getKpis({ employee_id: activeEmp, pageSize: 100 })  /* max 100 */
      .then((res) => { if (!cancel) setKpis(res.data); })
      .catch((e) => {
        const err = e as { response?: { data?: { error?: string } } };
        if (!cancel) notify({ kind: "error", msg: err.response?.data?.error || "No se cargaron los KPIs" });
      })
      .finally(() => { if (!cancel) setLoadingKpis(false); });
    return () => { cancel = true; };
  }, [activeEmp]);

  /* Cuando abrís el modal, carga measurements */
  useEffect(() => {
    if (!detail) return;
    let cancel = false;
    setLoadingMeasurements(true);
    setEvalValue(String(detail.actual_value));
    kpisApi.getMeasurements(detail.id)
      .then((m) => { if (!cancel) setMeasurements(m); })
      .catch((e) => {
        const err = e as { response?: { data?: { error?: string } } };
        if (!cancel) notify({ kind: "error", msg: err.response?.data?.error || "No se cargó el histórico" });
      })
      .finally(() => { if (!cancel) setLoadingMeasurements(false); });
    return () => { cancel = true; };
  }, [detail]);

  const handleEvaluate = async () => {
    if (!detail) return;
    const num = parseFloat(evalValue);
    if (Number.isNaN(num)) { notify({ kind: "error", msg: "Valor inválido" }); return; }
    setEvaluating(true);
    try {
      const updated = await kpisApi.evaluateKpi(detail.id, num);
      setKpis((prev) => prev.map((k) => k.id === updated.id ? updated : k));
      setDetail(updated);
      notify({ kind: "success", msg: "Resultado actualizado" });
      kpisApi.getMeasurements(updated.id).then(setMeasurements).catch(() => {});
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "No se pudo actualizar" });
    } finally {
      setEvaluating(false);
    }
  };

  const activeEmployee = useMemo(
    () => employees.find((e) => e.id === activeEmp) || null,
    [employees, activeEmp]
  );

  /* ── Catálogo: carga todos los KPIs (sin filtro empleado) ── */
  const loadAllKpis = async () => {
    setLoadingAll(true);
    try {
      const params: Record<string, unknown> = { pageSize: 100 };
      if (filterStatus) params.status = filterStatus;
      if (filterEmp) params.employee_id = filterEmp;
      if (filterPeriod) params.period = filterPeriod;
      const res = await kpisApi.getKpis(params);
      setAllKpis(res.data);
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "No se cargó el catálogo" });
    } finally {
      setLoadingAll(false);
    }
  };
  useEffect(() => {
    if (tab === "catalog") loadAllKpis();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, filterStatus, filterEmp, filterPeriod]);

  /* ── Form CRUD ── */
  const openCreate = () => {
    setFormMode("create");
    setEditingId(null);
    const defaultPeriod = `${new Date().getFullYear()}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
    setForm({ ...EMPTY_FORM, employee_id: employees[0]?.id || 0, period: defaultPeriod });
    setFormOpen(true);
  };
  const openEdit = (k: Kpi) => {
    setFormMode("edit");
    setEditingId(k.id);
    setForm({
      employee_id: k.employee_id,
      name: k.name,
      description: k.description || "",
      metric_type: k.metric_type || "numeric",
      unit: k.unit || "",
      target_value: k.target_value,
      weight: k.weight,
      period: k.period,
      periodicity: k.periodicity,
    });
    setFormOpen(true);
  };
  const saveForm = async () => {
    if (!form.name.trim() || !form.period.trim() || !form.employee_id || form.target_value <= 0) {
      notify({ kind: "error", msg: "Nombre, empleado, período y target son obligatorios" });
      return;
    }
    setFormSaving(true);
    try {
      if (formMode === "create") {
        await kpisApi.createKpi({
          employee_id: form.employee_id,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          metric_type: form.metric_type,
          unit: form.unit.trim() || undefined,
          target_value: form.target_value,
          weight: form.weight,
          period: form.period.trim(),
          periodicity: form.periodicity,
        });
        notify({ kind: "success", msg: "KPI creado" });
      } else if (editingId != null) {
        await kpisApi.updateKpi(editingId, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          metric_type: form.metric_type,
          unit: form.unit.trim() || undefined,
          target_value: form.target_value,
          weight: form.weight,
          period: form.period.trim(),
          periodicity: form.periodicity,
        });
        notify({ kind: "success", msg: "KPI actualizado" });
      }
      setFormOpen(false);
      loadAllKpis();
      if (activeEmp != null) {
        kpisApi.getKpis({ employee_id: activeEmp, pageSize: 100 }).then((r) => setKpis(r.data));
      }
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "No se pudo guardar (¿rol manager?)" });
    } finally {
      setFormSaving(false);
    }
  };
  const deleteKpi = async (id: number, name: string) => {
    if (!confirm(`¿Eliminar el KPI "${name}"? Esto borra todas sus mediciones.`)) return;
    setDeletingId(id);
    try {
      await kpisApi.deleteKpi(id);
      notify({ kind: "success", msg: "KPI eliminado" });
      loadAllKpis();
      if (activeEmp != null) {
        kpisApi.getKpis({ employee_id: activeEmp, pageSize: 100 }).then((r) => setKpis(r.data));
      }
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "No se pudo eliminar (¿rol admin?)" });
    } finally {
      setDeletingId(null);
    }
  };

  const employeeName = (id: number) => {
    const e = employees.find((x) => x.id === id);
    return e ? `${e.first_name} ${e.last_name}` : `Empleado #${id}`;
  };
  const allPeriods = useMemo(() => Array.from(new Set(allKpis.map((k) => k.period))).sort().reverse(), [allKpis]);

  const empMetrics = useMemo(() => {
    if (kpis.length === 0) return { total: 0, met: 0, atRisk: 0, avgPct: 0 };
    const met = kpis.filter((k) => k.status === "met" || k.status === "exceeded" || k.status === "on-track" || k.status === "on_track").length;
    const atRisk = kpis.filter((k) => k.status === "at-risk" || k.status === "at_risk" || k.status === "failed").length;
    const avgPct = kpis.reduce((sum, k) => {
      const pct = k.target_value > 0 ? (k.actual_value / k.target_value) * 100 : 0;
      return sum + pct;
    }, 0) / kpis.length;
    return { total: kpis.length, met, atRisk, avgPct };
  }, [kpis]);

  return (
    <Box sx={{ px: { xs: "16px", md: "32px" }, pb: "32px", maxWidth: 1280, mx: "auto", color: T.ink }}>
      {/* Header de la página */}
      <Box sx={{ pb: "16px", mb: "16px", borderBottom: `1px solid ${T.rule}`, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: "-0.025em", color: T.ink, mb: 0.5 }}>
            KPIs y OKRs
          </Typography>
          <Typography variant="body2" sx={{ color: T.text2 }}>
            Mediciones por empleado · cumplimiento de objetivos del período
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={openCreate}
          sx={{ bgcolor: T.accent, color: "#FFFFFF", boxShadow: "none", "&:hover": { bgcolor: "#0496BA", boxShadow: "none" } }}
        >
          + Nuevo KPI
        </Button>
      </Box>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          mb: "20px",
          minHeight: 40,
          "& .MuiTabs-indicator": { backgroundColor: T.accent, height: 2 },
          "& .MuiTab-root": { minHeight: 40, textTransform: "none", fontWeight: 500, fontSize: 14, color: T.text2 },
          "& .Mui-selected": { color: `${T.ink} !important` },
        }}
      >
        <Tab value="employee" label="Por empleado" />
        <Tab value="catalog" label="Catálogo" />
      </Tabs>

      {tab === "employee" && (
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "260px 1fr" }, gap: "24px", minHeight: "60vh" }}>
        {/* ── Empleados list ── */}
        <Box sx={{ border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg, overflow: "hidden", height: "fit-content" }}>
          <Box sx={{ p: "14px 16px", borderBottom: `1px solid ${T.rule}`, bgcolor: T.bg2 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: T.text2, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 11 }}>
              Empleados
            </Typography>
          </Box>
          {loadingEmp ? (
            <Box sx={{ p: "32px", textAlign: "center" }}>
              <CircularProgress size={20} sx={{ color: T.accent }} />
            </Box>
          ) : employees.length === 0 ? (
            <Box sx={{ p: "24px", textAlign: "center" }}>
              <Typography variant="body2" sx={{ color: T.text3 }}>Sin empleados registrados</Typography>
            </Box>
          ) : (
            <Box sx={{ maxHeight: "60vh", overflowY: "auto", p: "8px" }}>
              {employees.map((emp) => (
                <Box
                  key={emp.id}
                  onClick={() => setActiveEmp(emp.id)}
                  sx={{
                    p: "10px 12px", borderRadius: 1.5, cursor: "pointer",
                    bgcolor: activeEmp === emp.id ? T.surface2 : "transparent",
                    "&:hover": { bgcolor: T.bg2 },
                    transition: "background 120ms",
                    display: "flex", alignItems: "center", gap: "10px",
                  }}
                >
                  <Box sx={{
                    width: 30, height: 30, borderRadius: "50%",
                    bgcolor: activeEmp === emp.id ? T.brand : T.surface2,
                    color: activeEmp === emp.id ? "#FFFFFF" : T.text2,
                    display: "grid", placeItems: "center",
                    fontFamily: T.mono, fontSize: 11, fontWeight: 600,
                    border: `1px solid ${T.rule2}`,
                    flexShrink: 0,
                  }}>
                    {((emp.first_name || "") + " " + (emp.last_name || "")).split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?"}
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" sx={{
                      fontSize: 13, fontWeight: 500, color: T.ink,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {emp.first_name} {emp.last_name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: T.text3, fontSize: 11 }}>
                      {emp.position || "—"}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* ── KPIs del empleado activo ── */}
        <Box>
          {activeEmployee && (
            <>
              {/* Header empleado + métricas resumen */}
              <Box sx={{
                p: "20px", border: `1px solid ${T.rule}`, borderRadius: 2,
                bgcolor: T.bg, mb: "20px",
              }}>
                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2} alignItems={{ xs: "flex-start", md: "center" }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: T.ink, letterSpacing: "-0.012em" }}>
                      {activeEmployee.first_name} {activeEmployee.last_name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: T.text2 }}>
                      {activeEmployee.position || "—"} · {activeEmployee.department || "Sin departamento"}
                    </Typography>
                  </Box>
                  <Stack direction="row" gap={3}>
                    <MetricChip label="Total" value={empMetrics.total.toString()} />
                    <MetricChip label="En track" value={empMetrics.met.toString()} color={T.green} />
                    <MetricChip label="En riesgo" value={empMetrics.atRisk.toString()} color={empMetrics.atRisk > 0 ? T.amber : T.text3} />
                    <MetricChip label="Promedio" value={`${empMetrics.avgPct.toFixed(0)}%`} color={empMetrics.avgPct >= 80 ? T.green : empMetrics.avgPct >= 50 ? T.amber : T.red} />
                  </Stack>
                </Stack>
              </Box>

              {/* Grid de KPIs */}
              {loadingKpis ? (
                <Box sx={{ p: "48px", textAlign: "center" }}>
                  <CircularProgress size={24} sx={{ color: T.accent }} />
                </Box>
              ) : kpis.length === 0 ? (
                <Box sx={{ p: "48px 32px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg2, textAlign: "center" }}>
                  <Typography variant="body1" sx={{ color: T.ink, fontWeight: 500, mb: 0.5 }}>
                    Sin KPIs registrados
                  </Typography>
                  <Typography variant="caption" sx={{ color: T.text3 }}>
                    Este empleado aún no tiene objetivos definidos para el período actual
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "1fr 1fr" }, gap: "16px" }}>
                  {kpis.map((kpi) => (
                    <KpiCard key={kpi.id} kpi={kpi} onClick={() => setDetail(kpi)} />
                  ))}
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>
      )}

      {tab === "catalog" && (
        <CatalogTab
          allKpis={allKpis}
          loading={loadingAll}
          employees={employees}
          employeeName={employeeName}
          allPeriods={allPeriods}
          filterStatus={filterStatus} setFilterStatus={setFilterStatus}
          filterEmp={filterEmp} setFilterEmp={setFilterEmp}
          filterPeriod={filterPeriod} setFilterPeriod={setFilterPeriod}
          onEdit={openEdit} onDelete={deleteKpi} deletingId={deletingId}
          onOpenDetail={setDetail}
        />
      )}

      {/* ── Form crear/editar KPI ── */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          {formMode === "create" ? "Nuevo KPI" : "Editar KPI"}
        </DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ pt: 1 }}>
            <TextField
              label="Nombre *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              fullWidth size="small"
            />
            <TextField
              label="Descripción"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              fullWidth size="small" multiline rows={2}
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Empleado *</InputLabel>
              <Select
                label="Empleado *"
                value={form.employee_id || ""}
                onChange={(e) => setForm({ ...form, employee_id: Number(e.target.value) })}
                disabled={formMode === "edit"}
              >
                {employees.map((emp) => (
                  <MenuItem key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} — {emp.position || "—"}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction="row" gap={2}>
              <FormControl size="small" fullWidth>
                <InputLabel>Tipo de métrica</InputLabel>
                <Select
                  label="Tipo de métrica"
                  value={form.metric_type}
                  onChange={(e) => setForm({ ...form, metric_type: e.target.value })}
                >
                  <MenuItem value="numeric">Numérico</MenuItem>
                  <MenuItem value="percentage">Porcentaje</MenuItem>
                  <MenuItem value="currency">Monetario</MenuItem>
                  <MenuItem value="boolean">Booleano</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Unidad"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                fullWidth size="small"
                placeholder="ej. releases, %, €"
              />
            </Stack>
            <Stack direction="row" gap={2}>
              <TextField
                label="Target *"
                type="number"
                value={form.target_value}
                onChange={(e) => setForm({ ...form, target_value: Number(e.target.value) })}
                fullWidth size="small"
              />
              <TextField
                label="Peso"
                type="number"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })}
                fullWidth size="small"
                helperText="1.0 = peso normal"
              />
            </Stack>
            <Stack direction="row" gap={2}>
              <TextField
                label="Período *"
                value={form.period}
                onChange={(e) => setForm({ ...form, period: e.target.value })}
                fullWidth size="small"
                placeholder="2026-Q2, 2026-06, etc."
              />
              <FormControl size="small" fullWidth>
                <InputLabel>Periodicidad</InputLabel>
                <Select
                  label="Periodicidad"
                  value={form.periodicity}
                  onChange={(e) => setForm({ ...form, periodicity: e.target.value })}
                >
                  <MenuItem value="weekly">Semanal</MenuItem>
                  <MenuItem value="monthly">Mensual</MenuItem>
                  <MenuItem value="quarterly">Trimestral</MenuItem>
                  <MenuItem value="annual">Anual</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>Cancelar</Button>
          <Button
            onClick={saveForm}
            variant="contained"
            disabled={formSaving}
            sx={{ bgcolor: T.accent, "&:hover": { bgcolor: "#0496BA" } }}
          >
            {formSaving ? <CircularProgress size={16} sx={{ color: "#FFFFFF" }} /> : formMode === "create" ? "Crear" : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal detalle KPI con histórico */}
      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="md" fullWidth>
        {detail && (
          <>
            <DialogTitle sx={{ pb: 1, color: T.ink }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>{detail.name}</Typography>
              <Typography variant="caption" sx={{ color: T.text3, fontFamily: T.mono, fontSize: 11 }}>
                KPI #{detail.id} · {detail.period} · {detail.periodicity}
              </Typography>
            </DialogTitle>
            <DialogContent sx={{ pt: 1 }}>
              {detail.description && (
                <Typography variant="body2" sx={{ color: T.text2, mb: 2 }}>{detail.description}</Typography>
              )}

              {/* Resumen */}
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 2, mb: 3 }}>
                <DetailChip label="Target" value={`${fmt(detail.target_value)}${detail.unit ? ` ${detail.unit}` : ""}`} />
                <DetailChip label="Actual" value={`${fmt(detail.actual_value)}${detail.unit ? ` ${detail.unit}` : ""}`} color={statusColor(detail.status)} />
                <DetailChip label="Cumplimiento" value={`${pctOf(detail).toFixed(0)}%`} color={statusColor(detail.status)} />
              </Box>

              {/* Sparkline histórico */}
              <Typography variant="caption" sx={{ color: T.text3, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 11, fontWeight: 600 }}>
                Histórico de mediciones
              </Typography>
              <Box sx={{ mt: 1, p: "16px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg2 }}>
                {loadingMeasurements ? (
                  <Box sx={{ p: "24px", textAlign: "center" }}>
                    <CircularProgress size={20} sx={{ color: T.accent }} />
                  </Box>
                ) : measurements.length === 0 ? (
                  <Typography variant="body2" sx={{ color: T.text3, textAlign: "center", p: 2 }}>
                    Sin mediciones registradas todavía
                  </Typography>
                ) : (
                  <>
                    <Sparkline data={measurements.map((m) => m.value)} target={detail.target_value} height={80} />
                    <Box sx={{ mt: 2, maxHeight: 180, overflowY: "auto" }}>
                      {[...measurements].reverse().map((m) => (
                        <Box key={m.id} sx={{
                          display: "grid", gridTemplateColumns: "1fr auto auto", gap: 2,
                          py: "8px", borderBottom: `1px solid ${T.rule}`, alignItems: "center",
                          "&:last-child": { borderBottom: "none" },
                        }}>
                          <Typography variant="caption" sx={{ color: T.text3, fontFamily: T.mono, fontSize: 11 }}>
                            {new Date(m.recorded_at).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}
                          </Typography>
                          <Typography variant="caption" sx={{ color: T.text2, fontSize: 11 }}>
                            {m.source || "manual"}
                          </Typography>
                          <Typography variant="body2" sx={{ color: T.ink, fontFamily: T.mono, fontWeight: 600 }}>
                            {fmt(m.value)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </>
                )}
              </Box>

              {/* Actualizar valor */}
              <Box sx={{ mt: 3, p: "16px", border: `1px solid ${T.rule}`, borderRadius: 2 }}>
                <Typography variant="caption" sx={{ color: T.text3, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 11, fontWeight: 600 }}>
                  Actualizar valor actual
                </Typography>
                <Stack direction="row" gap={1.5} sx={{ mt: 1 }} alignItems="flex-end">
                  <TextField
                    size="small"
                    type="number"
                    value={evalValue}
                    onChange={(e) => setEvalValue(e.target.value)}
                    label={`Nuevo valor${detail.unit ? ` (${detail.unit})` : ""}`}
                    fullWidth
                  />
                  <Button
                    variant="contained"
                    onClick={handleEvaluate}
                    disabled={evaluating || parseFloat(evalValue) === detail.actual_value}
                    sx={{ bgcolor: T.accent, color: "#FFFFFF", "&:hover": { bgcolor: "#0496BA" }, minWidth: 110 }}
                  >
                    {evaluating ? <CircularProgress size={16} sx={{ color: "#FFFFFF" }} /> : "Registrar"}
                  </Button>
                </Stack>
                <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, mt: 0.5, display: "block" }}>
                  Cada registro crea una medición y recalcula el status del KPI
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetail(null)}>Cerrar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
</Box>
  );
}

/* ─── Subcomponents ─────────────────────────────────────── */

function KpiCard({ kpi, onClick }: { kpi: Kpi; onClick: () => void }) {
  const pct = pctOf(kpi);
  const cap = Math.min(100, pct);
  const color = statusColor(kpi.status);
  return (
    <Box
      onClick={onClick}
      sx={{
        p: "18px 20px",
        border: `1px solid ${T.rule}`,
        borderRadius: 2,
        bgcolor: T.bg,
        cursor: "pointer",
        transition: "all 160ms",
        "&:hover": { borderColor: T.rule2, transform: "translateY(-1px)" },
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1} mb={1.5}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: T.ink, fontSize: 14, lineHeight: 1.3 }}>
          {kpi.name}
        </Typography>
        <Chip
          label={STATUS_LABEL[kpi.status] || kpi.status}
          size="small"
          sx={{
            bgcolor: alpha(color, 0.1),
            color,
            fontWeight: 600,
            fontSize: 10.5,
            height: 22,
            fontFamily: T.mono,
            flexShrink: 0,
          }}
        />
      </Stack>

      {/* Valores */}
      <Stack direction="row" alignItems="baseline" gap={1} mb={1.5}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: T.ink, fontFamily: T.mono, letterSpacing: "-0.02em" }}>
          {fmt(kpi.actual_value)}
        </Typography>
        <Typography variant="caption" sx={{ color: T.text3, fontFamily: T.mono, fontSize: 12 }}>
          / {fmt(kpi.target_value)} {kpi.unit || ""}
        </Typography>
      </Stack>

      {/* Progress bar */}
      <Box sx={{ height: 6, bgcolor: T.surface2, borderRadius: 999, overflow: "hidden", mb: 1 }}>
        <Box sx={{
          width: `${cap}%`, height: "100%",
          bgcolor: color,
          transition: "width 320ms cubic-bezier(0.23, 1, 0.32, 1)",
        }} />
      </Box>

      <Stack direction="row" justifyContent="space-between">
        <Typography variant="caption" sx={{ color: T.text3, fontSize: 11 }}>
          {pct.toFixed(0)}% cumplimiento
        </Typography>
        <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, fontFamily: T.mono }}>
          {kpi.period}
        </Typography>
      </Stack>
    </Box>
  );
}

function MetricChip({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: T.text3, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 10.5, fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 700, color: color || T.ink, fontFamily: T.mono, fontSize: 18, mt: 0.25 }}>
        {value}
      </Typography>
    </Box>
  );
}

function DetailChip({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Box sx={{ p: "12px 16px", bgcolor: T.bg2, borderRadius: 2, border: `1px solid ${T.rule}` }}>
      <Typography variant="caption" sx={{ color: T.text3, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 10.5, fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="body1" sx={{ fontWeight: 700, color: color || T.ink, fontFamily: T.mono, mt: 0.5 }}>
        {value}
      </Typography>
    </Box>
  );
}

function Sparkline({ data, target, height = 80 }: { data: number[]; target: number; height?: number }) {
  if (data.length === 0) return null;
  const width = 600;
  const max = Math.max(...data, target) * 1.1;
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const ptY = (v: number) => height - ((v - min) / range) * height;
  const path = data.map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${ptY(v).toFixed(1)}`).join(" ");
  const areaPath = path + ` L${width},${height} L0,${height} Z`;
  const targetY = ptY(target);

  return (
    <Box sx={{ width: "100%", overflow: "hidden" }}>
      <svg viewBox={`0 0 ${width} ${height + 4}`} preserveAspectRatio="none" style={{ width: "100%", height }}>
        <defs>
          <linearGradient id="spark-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#02BDEA" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#02BDEA" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" y1={targetY} x2={width} y2={targetY} stroke="#D14040" strokeDasharray="4 4" strokeWidth="1" opacity="0.6" />
        <text x={width - 6} y={targetY - 4} fontSize="9" fill="#D14040" textAnchor="end" fontFamily="monospace">target {fmt(target)}</text>
        <path d={areaPath} fill="url(#spark-grad)" />
        <path d={path} fill="none" stroke="#02BDEA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((v, i) => (
          <circle key={i} cx={i * step} cy={ptY(v)} r="2.5" fill="#02BDEA" />
        ))}
      </svg>
    </Box>
  );
}

/* ─── Helpers ───────────────────────────────────────────── */
function pctOf(k: Kpi) {
  if (k.target_value <= 0) return 0;
  return (k.actual_value / k.target_value) * 100;
}
function statusColor(s: string) { return STATUS_COLOR[s] || T.text3; }
function fmt(v: number) {
  return v % 1 === 0 ? v.toLocaleString("es-ES") : v.toFixed(2).replace(/\.0+$/, "");
}
function alpha(hex: string, a: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/* ─── CatalogTab — tabla con todos los KPIs + filtros + CRUD ─────────────── */

interface CatalogTabProps {
  allKpis: Kpi[];
  loading: boolean;
  employees: Employee[];
  employeeName: (id: number) => string;
  allPeriods: string[];
  filterStatus: string;     setFilterStatus: (v: string) => void;
  filterEmp: number | "";   setFilterEmp: (v: number | "") => void;
  filterPeriod: string;     setFilterPeriod: (v: string) => void;
  onEdit: (k: Kpi) => void;
  onDelete: (id: number, name: string) => void;
  deletingId: number | null;
  onOpenDetail: (k: Kpi) => void;
}

function CatalogTab({
  allKpis, loading, employees, employeeName, allPeriods,
  filterStatus, setFilterStatus, filterEmp, setFilterEmp, filterPeriod, setFilterPeriod,
  onEdit, onDelete, deletingId, onOpenDetail,
}: CatalogTabProps) {
  return (
    <Box>
      {/* Filtros */}
      <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Estado</InputLabel>
          <Select label="Estado" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="pending">Pendiente</MenuItem>
            <MenuItem value="in_progress">En curso</MenuItem>
            <MenuItem value="on-track">En track</MenuItem>
            <MenuItem value="at-risk">En riesgo</MenuItem>
            <MenuItem value="met">Cumplido</MenuItem>
            <MenuItem value="exceeded">Sobrepasado</MenuItem>
            <MenuItem value="failed">No cumplido</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Empleado</InputLabel>
          <Select label="Empleado" value={filterEmp} onChange={(e) => setFilterEmp(e.target.value === "" ? "" : Number(e.target.value))}>
            <MenuItem value="">Todos</MenuItem>
            {employees.map((emp) => (
              <MenuItem key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Período</InputLabel>
          <Select label="Período" value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)}>
            <MenuItem value="">Todos</MenuItem>
            {allPeriods.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </Select>
        </FormControl>
      </Stack>

      {/* Tabla */}
      <Box sx={{ border: `1px solid ${T.rule}`, borderRadius: 2, overflow: "hidden", bgcolor: T.bg }}>
        {loading ? (
          <Box sx={{ p: "48px", textAlign: "center" }}>
            <CircularProgress size={22} sx={{ color: T.accent }} />
          </Box>
        ) : allKpis.length === 0 ? (
          <Box sx={{ p: "48px", textAlign: "center" }}>
            <Typography variant="body2" sx={{ color: T.text2, mb: 0.5, fontWeight: 500 }}>
              Sin KPIs en el catálogo
            </Typography>
            <Typography variant="caption" sx={{ color: T.text3 }}>
              Click en "+ Nuevo KPI" arriba para crear el primero
            </Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: T.bg2 }}>
                <TableCell sx={{ fontWeight: 600, fontSize: 12, color: T.text2, textTransform: "uppercase", letterSpacing: "0.04em" }}>Nombre</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 12, color: T.text2, textTransform: "uppercase", letterSpacing: "0.04em" }}>Empleado</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 12, color: T.text2, textTransform: "uppercase", letterSpacing: "0.04em" }}>Período</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, fontSize: 12, color: T.text2, textTransform: "uppercase", letterSpacing: "0.04em" }}>Target</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, fontSize: 12, color: T.text2, textTransform: "uppercase", letterSpacing: "0.04em" }}>Actual</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 12, color: T.text2, textTransform: "uppercase", letterSpacing: "0.04em" }}>Estado</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {allKpis.map((k) => {
                const color = STATUS_COLOR[k.status] || T.text3;
                return (
                  <TableRow key={k.id} sx={{ "&:hover": { bgcolor: T.bg2 }, transition: "background 120ms" }}>
                    <TableCell>
                      <Box
                        onClick={() => onOpenDetail(k)}
                        sx={{ cursor: "pointer", "&:hover": { color: T.accent } }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 500, color: T.ink, fontSize: 13.5 }}>{k.name}</Typography>
                        {k.description && (
                          <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, display: "block", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {k.description}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: 13, color: T.text2 }}>{employeeName(k.employee_id)}</TableCell>
                    <TableCell sx={{ fontFamily: T.mono, fontSize: 12, color: T.text2 }}>{k.period}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: T.mono, fontSize: 13 }}>{k.target_value % 1 === 0 ? k.target_value : k.target_value.toFixed(2)} {k.unit || ""}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: T.mono, fontSize: 13, color: T.ink, fontWeight: 600 }}>{k.actual_value % 1 === 0 ? k.actual_value : k.actual_value.toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip
                        label={STATUS_LABEL[k.status] || k.status}
                        size="small"
                        sx={{ bgcolor: alpha(color, 0.1), color, fontWeight: 600, fontSize: 10.5, fontFamily: T.mono, height: 22 }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => onEdit(k)} sx={{ color: T.text3, "&:hover": { color: T.accent } }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z"/>
                          </svg>
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton
                          size="small"
                          disabled={deletingId === k.id}
                          onClick={() => onDelete(k.id, k.name)}
                          sx={{ color: T.text3, "&:hover": { color: T.red } }}
                        >
                          {deletingId === k.id ? (
                            <CircularProgress size={14} sx={{ color: T.red }} />
                          ) : (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                            </svg>
                          )}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Box>

      {/* Footer count */}
      {!loading && allKpis.length > 0 && (
        <Typography variant="caption" sx={{ color: T.text3, mt: 1.5, display: "block", textAlign: "right" }}>
          {allKpis.length} KPI{allKpis.length !== 1 ? "s" : ""} en el catálogo
        </Typography>
      )}
    </Box>
  );
}
