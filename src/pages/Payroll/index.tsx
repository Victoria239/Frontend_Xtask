/* Módulo de Nómina — página principal con listado y creación */

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Avatar,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  People as PeopleIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as BonusIcon,
  EventAvailable as PaidIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  CalendarMonth as CalendarIcon,
  Person as PersonIcon,
  Preview as PreviewIcon,
  CloudUpload as UploadIcon,
  FilterList as FilterIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { employeesApi, projectsApi, payrollApi } from "../../api";
import type { Employee, Project, Payroll } from "../../types";
import { brand } from "../../theme";

function fmtMoney(n: number) {
  return `$ ${n.toLocaleString("es-CO", { minimumFractionDigits: 0 })}`;
}

/* ================================================================== */
export default function PayrollPage() {
  const navigate = useNavigate();

  /* ── datos ── */
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ── filtros ── */
  const [fProject, setFProject] = useState("");
  const [fEmployee, setFEmployee] = useState("");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");

  /* ── wizard crear nómina ── */
  const [dlgOpen, setDlgOpen] = useState(false);
  const [wizTab, setWizTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [wizStart, setWizStart] = useState("");
  const [wizEnd, setWizEnd] = useState("");
  const [wizProj, setWizProj] = useState("");
  const [selEmps, setSelEmps] = useState<number[]>([]);
  const [empData, setEmpData] = useState<Record<number, { salary: number; bonus: number }>>({});

  /* refetch seguro */
  const pending = useRef(false);
  const onExited = () => { if (pending.current) { pending.current = false; fetchData(); } };

  /* ── fetch ── */
  const fetchData = useCallback(async (spin = false) => {
    if (spin) setLoading(true);
    try {
      const [eR, pR, nR] = await Promise.allSettled([
        employeesApi.getEmployees({ pageSize: 100 }),
        projectsApi.getProjects({ pageSize: 100 }),
        payrollApi.getPayrolls({ pageSize: 200 }),
      ]);
      if (eR.status === "fulfilled") setEmployees(eR.value.data);
      if (pR.status === "fulfilled") setProjects(pR.value.data);
      if (nR.status === "fulfilled") setPayrolls(nR.value.data);
    } catch { setError("Error al cargar datos de nómina"); }
    finally { if (spin) setLoading(false); }
  }, []);
  useEffect(() => { fetchData(true); }, [fetchData]);

  /* ── indicadores ── */
  const activeEmps = employees.filter((e) => e.contract_status === "active").length;
  const totalMonth = employees.reduce((s, e) => s + (e.salary || 0), 0);
  const totalBonus = payrolls.reduce((s, p) => s + (p.bonuses || 0), 0);
  const paidN = payrolls.filter((p) => p.status === "pago" || p.status === "paid").length;
  const paidPct = payrolls.length ? Math.round((paidN / payrolls.length) * 100) : 0;

  const cards = [
    { t: "Empleados Activos", v: activeEmps, s: "Personal activo", icon: <PeopleIcon />, c: brand.purple },
    { t: "Nómina Mensual", v: fmtMoney(totalMonth), s: "Total mes actual", icon: <MoneyIcon />, c: "#10b981" },
    { t: "Bonificaciones", v: fmtMoney(totalBonus), s: "Bonos del mes", icon: <BonusIcon />, c: "#f59e0b" },
    { t: "Pagos Procesados", v: `${paidPct}%`, s: "Del total programado", icon: <PaidIcon />, c: "#3b82f6" },
  ];

  /* nóminas agrupadas por empleado */
  const payByEmp: Record<number, Payroll[]> = {};
  payrolls.forEach((p) => { (payByEmp[p.employee_id] ??= []).push(p); });

  /* empleados filtrados */
  const filteredEmps = employees.filter((e) => {
    if (fEmployee && e.id !== Number(fEmployee)) return false;
    return true;
  });

  /* ── wizard helpers ── */
  const openWizard = () => {
    setWizTab(0); setWizStart(""); setWizEnd(""); setWizProj("");
    setSelEmps([]); setEmpData({}); setFormErr(""); setDlgOpen(true);
  };

  const toggleEmp = (id: number) =>
    setSelEmps((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const genPreview = () => {
    const d: Record<number, { salary: number; bonus: number }> = {};
    selEmps.forEach((id) => { const e = employees.find((x) => x.id === id); d[id] = { salary: e?.salary || 0, bonus: 0 }; });
    setEmpData(d); setWizTab(2);
  };

  const totS = Object.values(empData).reduce((s, v) => s + v.salary, 0);
  const totB = Object.values(empData).reduce((s, v) => s + v.bonus, 0);

  const handleCreate = async () => {
    if (!wizStart || !wizEnd) { setFormErr("Las fechas son obligatorias"); return; }
    if (!selEmps.length) { setFormErr("Seleccione al menos un empleado"); return; }
    setSaving(true); setFormErr("");
    try {
      const period = wizStart.slice(0, 7);
      for (const id of selEmps) {
        const d = empData[id] || { salary: 0, bonus: 0 };
        await payrollApi.createPayroll({ employee_id: id, period, base_salary: d.salary, bonuses: d.bonus, deductions: 0 });
      }
      pending.current = true; setDlgOpen(false);
    } catch (err) { console.error(err); setFormErr("Error al crear nóminas"); }
    finally { setSaving(false); }
  };

  /* ── render ── */
  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh"><CircularProgress sx={{ color: brand.purple }} /></Box>;

  return (
    <Box>
      {/* cabecera */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Typography variant="h4" fontWeight={800}>Módulo de Nómina</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openWizard}
          sx={{ bgcolor: brand.purple, "&:hover": { bgcolor: brand.purpleDark }, textTransform: "none", fontWeight: 600, borderRadius: 2, px: 3 }}>
          Crear Nómina
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>{error}</Alert>}

      {/* filtros */}
      <Card sx={{ mb: 3, border: "1px solid", borderColor: "divider", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
        <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
          <Typography variant="subtitle2" fontWeight={700} mb={2} display="flex" alignItems="center" gap={1}>
            <FilterIcon fontSize="small" /> Filtros
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 3 }}>
              <FormControl fullWidth size="small"><InputLabel>Proyecto</InputLabel>
                <Select value={fProject} label="Proyecto" onChange={(e) => setFProject(e.target.value)}>
                  <MenuItem value="">Todos los proyectos</MenuItem>
                  {projects.map((p) => <MenuItem key={p.id} value={String(p.id)}>{p.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <FormControl fullWidth size="small"><InputLabel>Empleado</InputLabel>
                <Select value={fEmployee} label="Empleado" onChange={(e) => setFEmployee(e.target.value)}>
                  <MenuItem value="">Todos los empleados</MenuItem>
                  {employees.map((e) => <MenuItem key={e.id} value={String(e.id)}>{e.first_name} {e.last_name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField label="Fecha desde" type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField label="Fecha hasta" type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* cards resumen */}
      <Grid container spacing={2.5} mb={4}>
        {cards.map((c) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={c.t}>
            <Card sx={{ height: "100%", border: "1px solid", borderColor: "divider", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
              <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={500}>{c.t}</Typography>
                    <Typography variant="h4" fontWeight={700} mt={0.5}>{c.v}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>{c.s}</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: `${c.c}12`, color: c.c, width: 44, height: 44 }}>{c.icon}</Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* lista empleados */}
      <Card sx={{ border: "1px solid", borderColor: "divider", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight={700} display="flex" alignItems="center" gap={1}>
              <PeopleIcon sx={{ color: brand.purple }} /> Empleados Registrados
            </Typography>
            <Typography variant="body2" color="text.secondary">{filteredEmps.length} empleado{filteredEmps.length !== 1 ? "s" : ""}</Typography>
          </Box>

          {filteredEmps.length === 0
            ? <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>No hay empleados registrados</Typography>
            : filteredEmps.map((emp) => {
                const cnt = (payByEmp[emp.id] || []).length;
                return (
                  <Box key={emp.id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 2, mb: 1, borderRadius: 2, border: "1px solid", borderColor: "divider", "&:hover": { bgcolor: "#fafafa" } }}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar sx={{ bgcolor: `${brand.purple}15`, color: brand.purple, width: 48, height: 48 }}>{emp.first_name[0]}{emp.last_name[0]}</Avatar>
                      <Box>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography fontWeight={700}>{emp.first_name} {emp.last_name}</Typography>
                          <Chip label={emp.contract_status === "active" ? "activo" : emp.contract_status} color={emp.contract_status === "active" ? "success" : "default"} size="small" sx={{ fontWeight: 600, fontSize: 11, height: 22 }} />
                        </Box>
                        <Typography variant="body2" color="text.secondary">{emp.position} - {emp.department}</Typography>
                        <Typography variant="caption" color="text.secondary" display="flex" gap={2} mt={0.3}>
                          <span>💰 {fmtMoney(emp.salary)}</span>
                          <span>📋 {cnt} nómina{cnt !== 1 ? "s" : ""}</span>
                        </Typography>
                      </Box>
                    </Box>
                    <Tooltip title="Ver detalles"><Button variant="outlined" size="small" startIcon={<ViewIcon />} onClick={() => navigate(`/nominas/empleado/${emp.id}`)}
                      sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, borderColor: "divider", color: "text.primary", "&:hover": { borderColor: brand.purple, color: brand.purple } }}>
                      Ver detalles
                    </Button></Tooltip>
                  </Box>
                );
              })
          }
        </CardContent>
      </Card>

      {/* ════════════ Dialog — Wizard Crear Nómina ════════════ */}
      <Dialog open={dlgOpen} onClose={() => setDlgOpen(false)} TransitionProps={{ onExited }} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>Crear Nueva Nómina</Typography>
            <Typography variant="body2" color="text.secondary">Asistente para crear y procesar una nueva nómina por periodo.</Typography>
          </Box>
          <IconButton onClick={() => setDlgOpen(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>

        <Tabs value={wizTab} variant="fullWidth"
          sx={{ mx: 3, border: "1px solid", borderColor: "divider", borderRadius: 2,
            "& .MuiTab-root": { textTransform: "none", fontWeight: 600, minHeight: 48 },
            "& .Mui-selected": { color: brand.purple }, "& .MuiTabs-indicator": { bgcolor: brand.purple } }}>
          <Tab icon={<CalendarIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Configuración" onClick={() => setWizTab(0)} />
          <Tab icon={<PersonIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Empleados" disabled={!wizStart || !wizEnd} onClick={() => wizStart && wizEnd && setWizTab(1)} />
          <Tab icon={<PreviewIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Vista Previa" disabled={!selEmps.length} onClick={() => selEmps.length && genPreview()} />
        </Tabs>

        <DialogContent sx={{ pt: 3, minHeight: 350 }}>
          {formErr && <Alert severity="error" sx={{ mb: 2 }}>{formErr}</Alert>}

          {/* ── Tab 0 Configuración ── */}
          {wizTab === 0 && (
            <Box>
              <Typography variant="h6" fontWeight={700} mb={.5}>Configuración del Periodo</Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>Define el rango de fechas y proyecto para la nómina</Typography>
              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Fecha de Inicio *" type="date" value={wizStart} onChange={(e) => setWizStart(e.target.value)} fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Fecha de Fin *" type="date" value={wizEnd} onChange={(e) => setWizEnd(e.target.value)} fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <FormControl fullWidth size="small"><InputLabel>Proyecto (Opcional)</InputLabel>
                    <Select value={wizProj} label="Proyecto (Opcional)" onChange={(e) => setWizProj(e.target.value)}>
                      <MenuItem value="">Todos los proyectos</MenuItem>
                      {projects.map((p) => <MenuItem key={p.id} value={String(p.id)}>{p.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="body2" fontWeight={600} mb={1}>Soportes de Seguridad Social (Opcional)</Typography>
                  <Box sx={{ border: "2px dashed", borderColor: "divider", borderRadius: 2, p: 4, textAlign: "center", cursor: "pointer", "&:hover": { borderColor: brand.purple } }}>
                    <UploadIcon sx={{ fontSize: 40, color: "text.secondary", mb: 1 }} />
                    <Typography variant="body2" color={brand.purple} fontWeight={600}>Subir documentos de seguridad social</Typography>
                    <Typography variant="caption" color="text.secondary">PDF, DOC, DOCX, XLS, XLSX hasta 10MB</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* ── Tab 1 Empleados ── */}
          {wizTab === 1 && (
            <Box>
              <Typography variant="h6" fontWeight={700} mb={.5}>Seleccionar Empleados</Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>Elige los empleados que se incluirán en esta nómina</Typography>
              {employees.filter((e) => e.contract_status === "active").map((emp) => (
                <Box key={emp.id} onClick={() => toggleEmp(emp.id)}
                  sx={{ display: "flex", alignItems: "center", gap: 2, p: 1.5, mb: 1, borderRadius: 2, cursor: "pointer",
                    border: "1px solid", borderColor: selEmps.includes(emp.id) ? brand.purple : "divider",
                    bgcolor: selEmps.includes(emp.id) ? `${brand.purple}08` : "transparent", "&:hover": { borderColor: brand.purple } }}>
                  <Checkbox checked={selEmps.includes(emp.id)} sx={{ "&.Mui-checked": { color: brand.purple } }} />
                  <Box>
                    <Typography fontWeight={600}>{emp.first_name} {emp.last_name}</Typography>
                    <Typography variant="body2" color="text.secondary">{emp.position} - {emp.department}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          {/* ── Tab 2 Vista Previa ── */}
          {wizTab === 2 && (
            <Box>
              <Typography variant="h6" fontWeight={700} mb={.5}>Vista Previa de la Nómina</Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>Revisa los cálculos antes de crear la nómina definitiva</Typography>
              <Grid container spacing={2} mb={3}>
                <Grid size={{ xs: 4 }}>
                  <Card sx={{ border: "1px solid", borderColor: "divider" }}><CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                    <Typography variant="caption" color="text.secondary">Total Sueldos</Typography>
                    <Typography variant="h5" fontWeight={700}>{fmtMoney(totS)}</Typography>
                  </CardContent></Card>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Card sx={{ border: "1px solid", borderColor: "divider" }}><CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                    <Typography variant="caption" color="text.secondary">Total Bonos</Typography>
                    <Typography variant="h5" fontWeight={700}>{fmtMoney(totB)}</Typography>
                  </CardContent></Card>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Card sx={{ border: "1px solid", borderColor: "divider" }}><CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                    <Typography variant="caption" color="text.secondary">Total Neto</Typography>
                    <Typography variant="h5" fontWeight={700} color="#10b981">{fmtMoney(totS + totB)}</Typography>
                  </CardContent></Card>
                </Grid>
              </Grid>

              <TableContainer>
                <Table size="small">
                  <TableHead><TableRow sx={{ bgcolor: "#fafafa" }}>
                    <TableCell sx={{ fontWeight: 700 }}>Empleado</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Sueldo</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Bonos</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Total</TableCell>
                  </TableRow></TableHead>
                  <TableBody>
                    {selEmps.map((id) => {
                      const emp = employees.find((e) => e.id === id);
                      const d = empData[id] || { salary: 0, bonus: 0 };
                      return (
                        <TableRow key={id}>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Checkbox checked sx={{ "&.Mui-checked": { color: brand.purple } }} size="small" />
                              <Typography variant="body2" fontWeight={600}>{emp?.first_name} {emp?.last_name}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <TextField size="small" type="number" value={d.salary || ""} sx={{ width: 130 }}
                              onChange={(e) => setEmpData((p) => ({ ...p, [id]: { ...p[id], salary: Number(e.target.value) || 0 } }))} />
                          </TableCell>
                          <TableCell align="center">
                            <TextField size="small" type="number" value={d.bonus || ""} sx={{ width: 130 }}
                              onChange={(e) => setEmpData((p) => ({ ...p, [id]: { ...p[id], bonus: Number(e.target.value) || 0 } }))} />
                          </TableCell>
                          <TableCell align="right"><Typography fontWeight={700}>{fmtMoney(d.salary + d.bonus)}</Typography></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
          <Box>{wizTab > 0 && <Button onClick={() => setWizTab(wizTab - 1)} sx={{ textTransform: "none" }}>Anterior</Button>}</Box>
          <Box display="flex" gap={1}>
            {wizTab === 0 && (
              <Button variant="contained" disabled={!wizStart || !wizEnd} onClick={() => setWizTab(1)}
                sx={{ bgcolor: brand.purple, "&:hover": { bgcolor: brand.purpleDark }, textTransform: "none", fontWeight: 600, borderRadius: 2, px: 3 }}>
                Continuar
              </Button>
            )}
            {wizTab === 1 && (
              <Button variant="contained" disabled={!selEmps.length} onClick={genPreview}
                sx={{ bgcolor: brand.purple, "&:hover": { bgcolor: brand.purpleDark }, textTransform: "none", fontWeight: 600, borderRadius: 2, px: 3 }}>
                Generar Vista Previa
              </Button>
            )}
            {wizTab === 2 && (<>
              <Button onClick={() => setDlgOpen(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
              <Button variant="contained" onClick={handleCreate} disabled={saving}
                sx={{ bgcolor: brand.purple, "&:hover": { bgcolor: brand.purpleDark }, textTransform: "none", fontWeight: 600, borderRadius: 2, px: 3 }}>
                {saving ? <CircularProgress size={20} /> : "Crear Nómina"}
              </Button>
            </>)}
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
