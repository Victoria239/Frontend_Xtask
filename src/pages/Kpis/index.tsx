/* Módulo de KPIs — Dashboard analítico, catálogo, CRUD, detalle, alertas, reportes */

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Box, Grid, Card, CardContent, Typography, Button, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Avatar, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, FormControl, InputLabel,
  Select, MenuItem, IconButton, Tooltip, LinearProgress, InputAdornment,
} from "@mui/material";
import {
  Add as AddIcon, Close as CloseIcon, Search as SearchIcon,
  TrendingUp as UpIcon, TrendingDown as DownIcon, TrendingFlat as FlatIcon,
  CheckCircle as GreenIcon, Warning as YellowIcon, Error as RedIcon,
  Visibility as ViewIcon, Edit as EditIcon, Delete as DeleteIcon,
  FilterList as FilterIcon, Assessment as ChartIcon, NotificationsActive as AlertIcon,
  Download as DownloadIcon, ArrowBack as BackIcon, Timeline as TimelineIcon,
  Speed as SpeedIcon, BarChart as BarIcon,
} from "@mui/icons-material";
import { kpisApi, employeesApi, projectsApi } from "../../api";
import type { Kpi, Employee, Project } from "../../types";
import { brand } from "../../theme";

/* helpers */
function pct(current: number, target: number) { return target > 0 ? Math.round((current / target) * 100) : 0; }
function kpiStatus(current: number, target: number): "green" | "yellow" | "red" {
  const p = pct(current, target);
  if (p >= 90) return "green";
  if (p >= 60) return "yellow";
  return "red";
}
const statusConf = { green: { label: "Cumplido", color: "#10b981", icon: <GreenIcon /> }, yellow: { label: "Riesgo", color: "#f59e0b", icon: <YellowIcon /> }, red: { label: "Crítico", color: "#ef4444", icon: <RedIcon /> } };

/* ================================================================== */
export default function KpisPage() {
  /* ── view mode ── */
  const [view, setView] = useState<"dashboard" | "catalog" | "create" | "detail">("dashboard");
  const [mainTab, setMainTab] = useState(0); /* 0 dashboard, 1 catálogo, 2 alertas, 3 reportes */

  /* ── data ── */
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ── filters ── */
  const [fArea, setFArea] = useState("");
  const [fProject, setFProject] = useState("");
  const [fSearch, setFSearch] = useState("");

  /* ── CRUD ── */
  const [editKpi, setEditKpi] = useState<Kpi | null>(null);
  const [detailKpi, setDetailKpi] = useState<Kpi | null>(null);
  const [delKpi, setDelKpi] = useState<Kpi | null>(null);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");

  /* form */
  const [form, setForm] = useState({
    name: "", description: "", objective: "", area: "", responsible_id: "",
    formula: "", unit: "porcentaje", frequency: "mensual", source: "sistema",
    target_value: "", min_value: "", max_value: "",
    green_min: "90", yellow_min: "60", red_min: "0",
    alert_below: "", alert_above: "", alert_freq: "mensual",
    notify_system: true, notify_email: false,
  });

  const pending = useRef(false);
  const onExited = () => { if (pending.current) { pending.current = false; fetchData(); } };

  const fetchData = useCallback(async (spin = false) => {
    if (spin) setLoading(true);
    try {
      const [kR, eR, pR] = await Promise.allSettled([
        kpisApi.getKpis({ pageSize: 200 }),
        employeesApi.getEmployees({ pageSize: 100 }),
        projectsApi.getProjects({ pageSize: 100 }),
      ]);
      if (kR.status === "fulfilled") setKpis(kR.value.data);
      if (eR.status === "fulfilled") setEmployees(eR.value.data);
      if (pR.status === "fulfilled") setProjects(pR.value.data);
    } catch { setError("Error al cargar KPIs"); }
    finally { if (spin) setLoading(false); }
  }, []);
  useEffect(() => { fetchData(true); }, [fetchData]);

  /* derivados */
  const greenKpis = kpis.filter((k) => kpiStatus(k.current_value, k.target_value) === "green");
  const yellowKpis = kpis.filter((k) => kpiStatus(k.current_value, k.target_value) === "yellow");
  const redKpis = kpis.filter((k) => kpiStatus(k.current_value, k.target_value) === "red");

  const filteredKpis = kpis.filter((k) => {
    if (fSearch && !k.name.toLowerCase().includes(fSearch.toLowerCase())) return false;
    return true;
  });

  /* alerts */
  const alerts: { kpi: Kpi; reason: string; level: "green" | "yellow" | "red" }[] = [];
  kpis.forEach((k) => {
    const st = kpiStatus(k.current_value, k.target_value);
    if (st === "red") alerts.push({ kpi: k, reason: "KPI fuera de meta — valor crítico", level: "red" });
    else if (st === "yellow") alerts.push({ kpi: k, reason: "KPI en riesgo — por debajo de la meta", level: "yellow" });
  });

  /* ── form helpers ── */
  const openCreate = () => {
    setEditKpi(null);
    setForm({ name: "", description: "", objective: "", area: "", responsible_id: "", formula: "", unit: "porcentaje", frequency: "mensual", source: "sistema", target_value: "", min_value: "", max_value: "", green_min: "90", yellow_min: "60", red_min: "0", alert_below: "", alert_above: "", alert_freq: "mensual", notify_system: true, notify_email: false });
    setFormErr(""); setView("create");
  };

  const openEdit = (k: Kpi) => {
    setEditKpi(k);
    setForm({ ...form, name: k.name, description: k.description || "", target_value: String(k.target_value), unit: k.unit || "porcentaje", responsible_id: String(k.employee_id) });
    setFormErr(""); setView("create");
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.target_value) { setFormErr("Nombre y valor objetivo son obligatorios"); return; }
    setSaving(true); setFormErr("");
    try {
      if (editKpi) {
        await kpisApi.updateKpi(editKpi.id, {
          name: form.name,
          description: form.description || undefined,
          target_value: Number(form.target_value),
          unit: form.unit || undefined,
          period: form.frequency || undefined,
        });
      } else {
        await kpisApi.createKpi({
          employee_id: Number(form.responsible_id) || employees[0]?.id || 1,
          name: form.name,
          description: form.description || undefined,
          target_value: Number(form.target_value),
          current_value: 0,
          unit: form.unit || undefined,
          period: form.frequency || undefined,
        });
      }
      pending.current = true;
      setView("dashboard"); setMainTab(1);
      fetchData();
    } catch { setFormErr("Error al guardar KPI"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!delKpi) return;
    try { await kpisApi.deleteKpi(delKpi.id); pending.current = true; setDelKpi(null); fetchData(); }
    catch { setError("Error al eliminar KPI"); }
  };

  const handleEvaluate = async (k: Kpi, value: number) => {
    try { await kpisApi.evaluateKpi(k.id, value); fetchData(); }
    catch { setError("Error al evaluar KPI"); }
  };

  /* ── render ── */
  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh"><CircularProgress sx={{ color: brand.purple }} /></Box>;

  /* ── Vista CREAR / EDITAR ── */
  if (view === "create") return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Button startIcon={<BackIcon />} onClick={() => setView("dashboard")} sx={{ textTransform: "none", fontWeight: 600 }}>Volver</Button>
        <Typography variant="h4" fontWeight={800}>{editKpi ? "Editar" : "Nuevo"} KPI</Typography>
      </Box>
      {formErr && <Alert severity="error" sx={{ mb: 2 }}>{formErr}</Alert>}

      <Grid container spacing={3}>
        {/* Información básica */}
        <Grid size={12}><Card sx={{ border: "1px solid", borderColor: "divider" }}><CardContent>
          <Typography variant="h6" fontWeight={700} mb={2}>Información Básica</Typography>
          <Grid container spacing={2}>
            <Grid size={12}><TextField label="Nombre del KPI *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth size="small" /></Grid>
            <Grid size={12}><TextField label="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} fullWidth size="small" multiline rows={2} /></Grid>
            <Grid size={12}><TextField label="Objetivo del KPI" value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} fullWidth size="small" /></Grid>
            <Grid size={6}>
              <FormControl fullWidth size="small"><InputLabel>Área o departamento</InputLabel>
                <Select value={form.area} label="Área o departamento" onChange={(e) => setForm({ ...form, area: e.target.value })}>
                  <MenuItem value="">Seleccionar</MenuItem>
                  <MenuItem value="tech">Tecnología</MenuItem><MenuItem value="ops">Operaciones</MenuItem>
                  <MenuItem value="ventas">Ventas</MenuItem><MenuItem value="rrhh">RRHH</MenuItem><MenuItem value="admin">Administración</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={6}>
              <FormControl fullWidth size="small"><InputLabel>Responsable</InputLabel>
                <Select value={form.responsible_id} label="Responsable" onChange={(e) => setForm({ ...form, responsible_id: e.target.value })}>
                  <MenuItem value="">Seleccionar</MenuItem>
                  {employees.map((e) => <MenuItem key={e.id} value={String(e.id)}>{e.first_name} {e.last_name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent></Card></Grid>

        {/* Definición técnica */}
        <Grid size={12}><Card sx={{ border: "1px solid", borderColor: "divider" }}><CardContent>
          <Typography variant="h6" fontWeight={700} mb={2}>Definición Técnica</Typography>
          <Grid container spacing={2}>
            <Grid size={12}><TextField label="Fórmula de cálculo" value={form.formula} onChange={(e) => setForm({ ...form, formula: e.target.value })} fullWidth size="small" /></Grid>
            <Grid size={4}>
              <FormControl fullWidth size="small"><InputLabel>Unidad de medida</InputLabel>
                <Select value={form.unit} label="Unidad de medida" onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                  <MenuItem value="porcentaje">Porcentaje</MenuItem><MenuItem value="tiempo">Tiempo</MenuItem>
                  <MenuItem value="cantidad">Cantidad</MenuItem><MenuItem value="dinero">Dinero</MenuItem><MenuItem value="indice">Índice</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={4}>
              <FormControl fullWidth size="small"><InputLabel>Frecuencia</InputLabel>
                <Select value={form.frequency} label="Frecuencia" onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
                  <MenuItem value="diaria">Diaria</MenuItem><MenuItem value="semanal">Semanal</MenuItem>
                  <MenuItem value="mensual">Mensual</MenuItem><MenuItem value="trimestral">Trimestral</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={4}>
              <FormControl fullWidth size="small"><InputLabel>Fuente de datos</InputLabel>
                <Select value={form.source} label="Fuente de datos" onChange={(e) => setForm({ ...form, source: e.target.value })}>
                  <MenuItem value="sistema">Sistema</MenuItem><MenuItem value="api">API</MenuItem>
                  <MenuItem value="manual">Cálculo manual</MenuItem><MenuItem value="bd">Base de datos</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent></Card></Grid>

        {/* Objetivos y metas */}
        <Grid size={12}><Card sx={{ border: "1px solid", borderColor: "divider" }}><CardContent>
          <Typography variant="h6" fontWeight={700} mb={2}>Objetivos y Metas</Typography>
          <Grid container spacing={2}>
            <Grid size={4}><TextField label="Valor objetivo *" type="number" value={form.target_value} onChange={(e) => setForm({ ...form, target_value: e.target.value })} fullWidth size="small" /></Grid>
            <Grid size={4}><TextField label="Valor mínimo aceptable" type="number" value={form.min_value} onChange={(e) => setForm({ ...form, min_value: e.target.value })} fullWidth size="small" /></Grid>
            <Grid size={4}><TextField label="Valor máximo esperado" type="number" value={form.max_value} onChange={(e) => setForm({ ...form, max_value: e.target.value })} fullWidth size="small" /></Grid>
          </Grid>
          <Typography variant="subtitle2" fontWeight={700} mt={2} mb={1}>Rangos de estado</Typography>
          <Grid container spacing={2}>
            <Grid size={4}><TextField label="Verde (cumplimiento) ≥ %" type="number" value={form.green_min} onChange={(e) => setForm({ ...form, green_min: e.target.value })} fullWidth size="small" slotProps={{ input: { startAdornment: <InputAdornment position="start"><GreenIcon sx={{ color: "#10b981", fontSize: 18 }} /></InputAdornment> } }} /></Grid>
            <Grid size={4}><TextField label="Amarillo (riesgo) ≥ %" type="number" value={form.yellow_min} onChange={(e) => setForm({ ...form, yellow_min: e.target.value })} fullWidth size="small" slotProps={{ input: { startAdornment: <InputAdornment position="start"><YellowIcon sx={{ color: "#f59e0b", fontSize: 18 }} /></InputAdornment> } }} /></Grid>
            <Grid size={4}><TextField label="Rojo (incumplimiento) < %" type="number" value={form.red_min} onChange={(e) => setForm({ ...form, red_min: e.target.value })} fullWidth size="small" slotProps={{ input: { startAdornment: <InputAdornment position="start"><RedIcon sx={{ color: "#ef4444", fontSize: 18 }} /></InputAdornment> } }} /></Grid>
          </Grid>
        </CardContent></Card></Grid>

        {/* Configuración de alertas */}
        <Grid size={12}><Card sx={{ border: "1px solid", borderColor: "divider" }}><CardContent>
          <Typography variant="h6" fontWeight={700} mb={2}>Configuración de Alertas</Typography>
          <Grid container spacing={2}>
            <Grid size={4}><TextField label="Alerta si baja de" type="number" value={form.alert_below} onChange={(e) => setForm({ ...form, alert_below: e.target.value })} fullWidth size="small" /></Grid>
            <Grid size={4}><TextField label="Alerta si supera" type="number" value={form.alert_above} onChange={(e) => setForm({ ...form, alert_above: e.target.value })} fullWidth size="small" /></Grid>
            <Grid size={4}>
              <FormControl fullWidth size="small"><InputLabel>Frecuencia revisión</InputLabel>
                <Select value={form.alert_freq} label="Frecuencia revisión" onChange={(e) => setForm({ ...form, alert_freq: e.target.value })}>
                  <MenuItem value="diaria">Diaria</MenuItem><MenuItem value="semanal">Semanal</MenuItem><MenuItem value="mensual">Mensual</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent></Card></Grid>
      </Grid>

      <Box display="flex" justifyContent="flex-end" gap={1} mt={3}>
        <Button onClick={() => setView("dashboard")} sx={{ textTransform: "none" }}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}
          sx={{ bgcolor: brand.purple, "&:hover": { bgcolor: brand.purpleDark }, textTransform: "none", fontWeight: 600, borderRadius: 2, px: 4 }}>
          {saving ? <CircularProgress size={20} /> : editKpi ? "Guardar Cambios" : "Crear KPI"}
        </Button>
      </Box>
    </Box>
  );

  /* ── Vista DETALLE ── */
  if (view === "detail" && detailKpi) {
    const st = kpiStatus(detailKpi.current_value, detailKpi.target_value);
    const sc = statusConf[st];
    const emp = employees.find((e) => e.id === detailKpi.employee_id);
    const p = pct(detailKpi.current_value, detailKpi.target_value);
    return (
      <Box>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Button startIcon={<BackIcon />} onClick={() => { setView("dashboard"); setDetailKpi(null); }} sx={{ textTransform: "none", fontWeight: 600 }}>Volver</Button>
          <Typography variant="h4" fontWeight={800}>{detailKpi.name}</Typography>
          <Chip label={sc.label} size="small" sx={{ bgcolor: `${sc.color}15`, color: sc.color, fontWeight: 700 }} />
        </Box>

        {/* info */}
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card sx={{ border: "1px solid", borderColor: "divider", height: "100%" }}><CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}>Información del KPI</Typography>
              <Grid container spacing={2}>
                <Grid size={6}><Typography variant="caption" color="text.secondary">Descripción</Typography><Typography variant="body2">{detailKpi.description || "—"}</Typography></Grid>
                <Grid size={6}><Typography variant="caption" color="text.secondary">Responsable</Typography><Typography variant="body2">{emp ? `${emp.first_name} ${emp.last_name}` : "—"}</Typography></Grid>
                <Grid size={6}><Typography variant="caption" color="text.secondary">Unidad</Typography><Typography variant="body2">{detailKpi.unit || "—"}</Typography></Grid>
                <Grid size={6}><Typography variant="caption" color="text.secondary">Periodo</Typography><Typography variant="body2">{detailKpi.period || "—"}</Typography></Grid>
                <Grid size={6}><Typography variant="caption" color="text.secondary">Meta</Typography><Typography variant="body2" fontWeight={700}>{detailKpi.target_value}</Typography></Grid>
                <Grid size={6}><Typography variant="caption" color="text.secondary">Valor Actual</Typography><Typography variant="body2" fontWeight={700} color={sc.color}>{detailKpi.current_value}</Typography></Grid>
              </Grid>
            </CardContent></Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ border: "1px solid", borderColor: "divider", height: "100%" }}><CardContent sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 4 }}>
              <Box sx={{ position: "relative", display: "inline-flex", mb: 2 }}>
                <CircularProgress variant="determinate" value={Math.min(p, 100)} size={120} thickness={6} sx={{ color: sc.color }} />
                <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Typography variant="h4" fontWeight={800} color={sc.color}>{p}%</Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary">Cumplimiento vs Meta</Typography>
              <Chip label={sc.label} sx={{ mt: 1, bgcolor: `${sc.color}15`, color: sc.color, fontWeight: 700 }} />
            </CardContent></Card>
          </Grid>
        </Grid>

        {/* tendencia visual */}
        <Card sx={{ mb: 3, border: "1px solid", borderColor: "divider" }}><CardContent>
          <Typography variant="h6" fontWeight={700} mb={2}>Tendencia Histórica</Typography>
          <Box display="flex" alignItems="center" justifyContent="center" minHeight={120}>
            <Box textAlign="center">
              <TimelineIcon sx={{ fontSize: 48, color: "text.secondary" }} />
              <Typography variant="body2" color="text.secondary" mt={1}>Los datos históricos se irán acumulando con cada evaluación</Typography>
            </Box>
          </Box>
        </CardContent></Card>

        {/* historial */}
        <Card sx={{ border: "1px solid", borderColor: "divider" }}><CardContent>
          <Typography variant="h6" fontWeight={700} mb={2}>Historial del KPI</Typography>
          <TableContainer><Table size="small">
            <TableHead><TableRow sx={{ bgcolor: "#fafafa" }}>
              <TableCell sx={{ fontWeight: 700 }}>Fecha</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Valor</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Actualizado por</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Comentario</TableCell>
            </TableRow></TableHead>
            <TableBody>
              <TableRow>
                <TableCell>{new Date(detailKpi.updated_at).toLocaleDateString("es-CO")}</TableCell>
                <TableCell><Typography fontWeight={700} color={sc.color}>{detailKpi.current_value}</Typography></TableCell>
                <TableCell>{emp ? `${emp.first_name} ${emp.last_name}` : "Sistema"}</TableCell>
                <TableCell>Última evaluación registrada</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{new Date(detailKpi.created_at).toLocaleDateString("es-CO")}</TableCell>
                <TableCell>0</TableCell>
                <TableCell>Sistema</TableCell>
                <TableCell>KPI creado</TableCell>
              </TableRow>
            </TableBody>
          </Table></TableContainer>
        </CardContent></Card>

        <Box display="flex" gap={1} mt={3}>
          <Button variant="outlined" startIcon={<EditIcon />} onClick={() => openEdit(detailKpi)} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>Editar</Button>
          <Button variant="contained" color="error" startIcon={<DeleteIcon />} onClick={() => setDelKpi(detailKpi)} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>Eliminar</Button>
        </Box>
      </Box>
    );
  }

  /* ── Vista PRINCIPAL (Dashboard + Catálogo + Alertas + Reportes) ── */
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" fontWeight={800}>KPIs</Typography>
          <Typography variant="body2" color="text.secondary">Dashboard de indicadores clave de rendimiento</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
          sx={{ bgcolor: brand.purple, "&:hover": { bgcolor: brand.purpleDark }, textTransform: "none", fontWeight: 600, borderRadius: 2, px: 3 }}>
          Nuevo KPI
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      <Tabs value={mainTab} onChange={(_, v) => setMainTab(v)} sx={{ mb: 3, borderBottom: "2px solid", borderColor: "divider",
        "& .MuiTab-root": { textTransform: "none", fontWeight: 600 }, "& .Mui-selected": { color: brand.purple }, "& .MuiTabs-indicator": { bgcolor: brand.purple } }}>
        <Tab icon={<SpeedIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Dashboard" />
        <Tab icon={<BarIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Catálogo" />
        <Tab icon={<AlertIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`Alertas (${alerts.length})`} />
        <Tab icon={<DownloadIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Reportes" />
      </Tabs>

      {/* ════════════ TAB 0: DASHBOARD ════════════ */}
      {mainTab === 0 && (
        <Box>
          {/* filtros */}
          <Card sx={{ mb: 3, border: "1px solid", borderColor: "divider" }}><CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
            <Typography variant="subtitle2" fontWeight={700} mb={1.5} display="flex" alignItems="center" gap={1}><FilterIcon fontSize="small" /> Filtros</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 3 }}>
                <FormControl fullWidth size="small"><InputLabel>Área</InputLabel>
                  <Select value={fArea} label="Área" onChange={(e) => setFArea(e.target.value)}>
                    <MenuItem value="">Todas</MenuItem><MenuItem value="tech">Tecnología</MenuItem><MenuItem value="ops">Operaciones</MenuItem><MenuItem value="ventas">Ventas</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <FormControl fullWidth size="small"><InputLabel>Proyecto</InputLabel>
                  <Select value={fProject} label="Proyecto" onChange={(e) => setFProject(e.target.value)}>
                    <MenuItem value="">Todos</MenuItem>
                    {projects.map((p) => <MenuItem key={p.id} value={String(p.id)}>{p.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <FormControl fullWidth size="small"><InputLabel>Responsable</InputLabel>
                  <Select value="" label="Responsable">
                    <MenuItem value="">Todos</MenuItem>
                    {employees.map((e) => <MenuItem key={e.id} value={String(e.id)}>{e.first_name} {e.last_name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <FormControl fullWidth size="small"><InputLabel>Tipo de KPI</InputLabel>
                  <Select value="" label="Tipo de KPI">
                    <MenuItem value="">Todos</MenuItem><MenuItem value="porcentaje">Porcentaje</MenuItem><MenuItem value="cantidad">Cantidad</MenuItem><MenuItem value="dinero">Dinero</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent></Card>

          {/* KPI cards */}
          <Grid container spacing={2} mb={3}>
            {kpis.length === 0 ? (
              <Grid size={12}><Card sx={{ border: "1px solid", borderColor: "divider" }}><CardContent sx={{ textAlign: "center", py: 6 }}>
                <SpeedIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
                <Typography variant="h6" fontWeight={700}>No hay KPIs registrados</Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>Crea tu primer indicador para comenzar a medir el rendimiento.</Typography>
                <Button variant="contained" onClick={openCreate} sx={{ bgcolor: brand.purple, "&:hover": { bgcolor: brand.purpleDark }, textTransform: "none", fontWeight: 600, borderRadius: 2 }}>Crear Primer KPI</Button>
              </CardContent></Card></Grid>
            ) : kpis.map((k) => {
              const st = kpiStatus(k.current_value, k.target_value);
              const sc = statusConf[st];
              const p = pct(k.current_value, k.target_value);
              const emp = employees.find((e) => e.id === k.employee_id);
              return (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={k.id}>
                  <Card sx={{ border: "1px solid", borderColor: "divider", cursor: "pointer", "&:hover": { borderColor: sc.color, boxShadow: `0 0 0 1px ${sc.color}30` } }}
                    onClick={() => { setDetailKpi(k); setView("detail"); }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={700}>{k.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{emp ? `${emp.first_name} ${emp.last_name}` : "Sin asignar"}</Typography>
                        </Box>
                        <Chip label={sc.label} size="small" sx={{ bgcolor: `${sc.color}15`, color: sc.color, fontWeight: 700, fontSize: 11 }} />
                      </Box>
                      <Box display="flex" alignItems="baseline" gap={1} mb={1}>
                        <Typography variant="h4" fontWeight={800}>{k.current_value}</Typography>
                        <Typography variant="body2" color="text.secondary">/ {k.target_value} {k.unit || ""}</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={Math.min(p, 100)} sx={{ height: 6, borderRadius: 3, bgcolor: `${sc.color}20`, "& .MuiLinearProgress-bar": { bgcolor: sc.color, borderRadius: 3 } }} />
                      <Box display="flex" justifyContent="space-between" mt={1}>
                        <Typography variant="caption" color={sc.color} fontWeight={600}>{p}% cumplimiento</Typography>
                        {p >= 50 ? <UpIcon sx={{ fontSize: 16, color: "#10b981" }} /> : <DownIcon sx={{ fontSize: 16, color: "#ef4444" }} />}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {/* distribución */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ height: "100%", border: "1px solid", borderColor: "divider" }}><CardContent>
                <Typography variant="subtitle1" fontWeight={700} mb={2}>Distribución de KPIs</Typography>
                {[
                  { label: "Cumplidos", count: greenKpis.length, color: "#10b981" },
                  { label: "En riesgo", count: yellowKpis.length, color: "#f59e0b" },
                  { label: "Críticos", count: redKpis.length, color: "#ef4444" },
                ].map((r) => (
                  <Box key={r.label} display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: r.color }} />
                      <Typography variant="body2">{r.label}</Typography>
                    </Box>
                    <Chip label={r.count} size="small" sx={{ bgcolor: `${r.color}15`, color: r.color, fontWeight: 700, minWidth: 32 }} />
                  </Box>
                ))}
              </CardContent></Card>
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <Card sx={{ height: "100%", border: "1px solid", borderColor: "divider" }}><CardContent>
                <Typography variant="subtitle1" fontWeight={700} mb={2}>Comparativo — Actual vs Meta</Typography>
                {kpis.slice(0, 5).map((k) => {
                  const p = pct(k.current_value, k.target_value);
                  const sc = statusConf[kpiStatus(k.current_value, k.target_value)];
                  return (
                    <Box key={k.id} mb={2}>
                      <Box display="flex" justifyContent="space-between" mb={.5}>
                        <Typography variant="body2" fontWeight={600}>{k.name}</Typography>
                        <Typography variant="caption" color={sc.color} fontWeight={600}>{k.current_value} / {k.target_value}</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={Math.min(p, 100)} sx={{ height: 8, borderRadius: 4, bgcolor: "#f3f4f6", "& .MuiLinearProgress-bar": { bgcolor: sc.color, borderRadius: 4 } }} />
                    </Box>
                  );
                })}
                {!kpis.length && <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>Sin datos</Typography>}
              </CardContent></Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ════════════ TAB 1: CATÁLOGO ════════════ */}
      {mainTab === 1 && (
        <Box>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <TextField size="small" placeholder="Buscar KPI..." value={fSearch} onChange={(e) => setFSearch(e.target.value)}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
              sx={{ width: 260 }} />
            <Box flex={1} />
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
              sx={{ bgcolor: brand.purple, "&:hover": { bgcolor: brand.purpleDark }, textTransform: "none", fontWeight: 600, borderRadius: 2 }}>
              Nuevo KPI
            </Button>
          </Box>

          <Card sx={{ border: "1px solid", borderColor: "divider" }}>
            <TableContainer><Table>
              <TableHead><TableRow sx={{ bgcolor: "#fafafa" }}>
                <TableCell sx={{ fontWeight: 700 }}>Nombre</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Responsable</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Frecuencia</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Meta</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actual</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actualización</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Acciones</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {filteredKpis.length === 0 ? (
                  <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: "text.secondary" }}>No hay KPIs</TableCell></TableRow>
                ) : filteredKpis.map((k) => {
                  const st = kpiStatus(k.current_value, k.target_value);
                  const sc = statusConf[st];
                  const emp = employees.find((e) => e.id === k.employee_id);
                  return (
                    <TableRow key={k.id} hover>
                      <TableCell><Typography variant="body2" fontWeight={700}>{k.name}</Typography></TableCell>
                      <TableCell><Typography variant="body2">{emp ? `${emp.first_name} ${emp.last_name}` : "—"}</Typography></TableCell>
                      <TableCell>{k.period || "—"}</TableCell>
                      <TableCell><Typography fontWeight={600}>{k.target_value}</Typography></TableCell>
                      <TableCell><Typography fontWeight={700} color={sc.color}>{k.current_value}</Typography></TableCell>
                      <TableCell><Chip label={sc.label} size="small" sx={{ bgcolor: `${sc.color}15`, color: sc.color, fontWeight: 700 }} /></TableCell>
                      <TableCell><Typography variant="caption" color="text.secondary">{new Date(k.updated_at).toLocaleDateString("es-CO")}</Typography></TableCell>
                      <TableCell align="right">
                        <Tooltip title="Ver detalle"><IconButton size="small" onClick={() => { setDetailKpi(k); setView("detail"); }}><ViewIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Editar"><IconButton size="small" onClick={() => openEdit(k)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => setDelKpi(k)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table></TableContainer>
          </Card>
        </Box>
      )}

      {/* ════════════ TAB 2: ALERTAS ════════════ */}
      {mainTab === 2 && (
        <Box>
          <Typography variant="h5" fontWeight={800} mb={3}>Alertas de KPIs</Typography>
          {alerts.length === 0 ? (
            <Card sx={{ border: "1px solid", borderColor: "divider" }}><CardContent sx={{ textAlign: "center", py: 6 }}>
              <GreenIcon sx={{ fontSize: 64, color: "#10b981", mb: 2 }} />
              <Typography variant="h6" fontWeight={700}>Todos los KPIs están en orden</Typography>
              <Typography variant="body2" color="text.secondary">No hay alertas activas en este momento.</Typography>
            </CardContent></Card>
          ) : alerts.map((a, i) => {
            const sc = statusConf[a.level];
            return (
              <Card key={i} sx={{ mb: 1.5, border: "1px solid", borderColor: `${sc.color}40` }}>
                <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, p: 2, "&:last-child": { pb: 2 } }}>
                  <Avatar sx={{ bgcolor: `${sc.color}15`, color: sc.color }}>{sc.icon}</Avatar>
                  <Box flex={1}>
                    <Typography fontWeight={700}>{a.kpi.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{a.reason}</Typography>
                    <Typography variant="caption" color="text.secondary">{new Date(a.kpi.updated_at).toLocaleDateString("es-CO")}</Typography>
                  </Box>
                  <Chip label={sc.label} size="small" sx={{ bgcolor: `${sc.color}15`, color: sc.color, fontWeight: 700 }} />
                  <Button size="small" onClick={() => { setDetailKpi(a.kpi); setView("detail"); }} sx={{ textTransform: "none", fontWeight: 600, color: brand.purple }}>Ver</Button>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {/* ════════════ TAB 3: REPORTES ════════════ */}
      {mainTab === 3 && (
        <Box>
          <Typography variant="h5" fontWeight={800} mb={3}>Reportes de KPIs</Typography>
          <Grid container spacing={2}>
            {[
              { title: "Reporte de KPIs por periodo", desc: "Estado y cumplimiento de todos los indicadores" },
              { title: "Análisis de cumplimiento", desc: "Porcentaje de KPIs cumplidos vs en riesgo" },
              { title: "Evolución histórica", desc: "Tendencia de los indicadores en el tiempo" },
            ].map((r) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={r.title}>
                <Card sx={{ border: "1px solid", borderColor: "divider", "&:hover": { borderColor: brand.purple }, cursor: "pointer" }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={700} mb={.5}>{r.title}</Typography>
                    <Typography variant="body2" color="text.secondary" mb={2}>{r.desc}</Typography>
                    <Box display="flex" gap={1}>
                      <Chip label="PDF" size="small" icon={<DownloadIcon sx={{ fontSize: 14 }} />} sx={{ fontWeight: 600 }} />
                      <Chip label="Excel" size="small" icon={<DownloadIcon sx={{ fontSize: 14 }} />} sx={{ fontWeight: 600 }} />
                      <Chip label="CSV" size="small" icon={<DownloadIcon sx={{ fontSize: 14 }} />} sx={{ fontWeight: 600 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Dialog eliminar KPI */}
      <Dialog open={Boolean(delKpi)} onClose={() => setDelKpi(null)} TransitionProps={{ onExited }} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>¿Eliminar KPI?</DialogTitle>
        <DialogContent><Typography variant="body2" color="text.secondary">Se eliminará <strong>{delKpi?.name}</strong> de forma permanente.</Typography></DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDelKpi(null)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDelete} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
