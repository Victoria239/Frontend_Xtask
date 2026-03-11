/* Detalle de empleado en módulo de nómina — 6 tabs */

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Menu,
  MenuItem as MuiMenuItem,
} from "@mui/material";
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  PictureAsPdf as PdfIcon,
  Payment as PseIcon,
  Work as WorkIcon,
  CalendarMonth as CalIcon,
  AttachMoney as MoneyIcon,
  CardGiftcard as BonusIcon,
  AccessTime as TimeIcon,
  Description as DocIcon,
  CloudUpload as UploadIcon,
  Close as CloseIcon,
  MoreVert as MoreIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { employeesApi, payrollApi, projectsApi } from "../../api";
import type { Employee, Payroll, Project } from "../../types";
import { brand } from "../../theme";

function fmtMoney(n: number) { return `$ ${n.toLocaleString("es-CO", { minimumFractionDigits: 0 })}`; }
function fmtDate(d: string | null) {
  if (!d) return "Sin fecha";
  return new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
}

/* ── Mini calendario ── */
function MiniCalendar({ highlightDate }: { highlightDate: string | null }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();
  const monthName = now.toLocaleDateString("es-CO", { month: "long", year: "numeric" }).toUpperCase();

  const highlightDay = highlightDate ? new Date(highlightDate) : null;
  const isHighlightMonth = highlightDay && highlightDay.getMonth() === month && highlightDay.getFullYear() === year;
  const hDay = isHighlightMonth ? highlightDay!.getDate() : null;

  const days = ["D", "L", "M", "X", "J", "V", "S"];
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={700} textAlign="center" mb={1}>{monthName}</Typography>
      <Box display="grid" gridTemplateColumns="repeat(7, 1fr)" gap={0.3} textAlign="center">
        {days.map((d) => <Typography key={d} variant="caption" fontWeight={700} color="text.secondary">{d}</Typography>)}
        {cells.map((d, i) => (
          <Box key={i} sx={{
            width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", mx: "auto",
            fontSize: 12, fontWeight: d === today || d === hDay ? 700 : 400,
            bgcolor: d === today ? brand.purple : d === hDay ? "#10b981" : "transparent",
            color: d === today || d === hDay ? "#fff" : d ? "text.primary" : "transparent",
          }}>
            {d || ""}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/* ================================================================== */
export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const empId = Number(id);

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(0);

  /* dialogs */
  const [detailPayroll, setDetailPayroll] = useState<Payroll | null>(null);
  const [payDlg, setPayDlg] = useState<Payroll | null>(null);
  const [payDate, setPayDate] = useState("");
  const [payBonus, setPayBonus] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Payroll | null>(null);
  const [deleteEmpDlg, setDeleteEmpDlg] = useState(false);
  const [assignDlg, setAssignDlg] = useState(false);
  const [assignProjId, setAssignProjId] = useState("");

  /* menu */
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuPayroll, setMenuPayroll] = useState<Payroll | null>(null);

  const pending = useRef(false);
  const onExited = () => { if (pending.current) { pending.current = false; fetchData(); } };

  const fetchData = useCallback(async (spin = false) => {
    if (spin) setLoading(true);
    try {
      const [empR, payR, projR] = await Promise.allSettled([
        employeesApi.getEmployee(empId),
        payrollApi.getPayrolls({ employee_id: empId, pageSize: 200 }),
        projectsApi.getProjects({ pageSize: 100 }),
      ]);
      if (empR.status === "fulfilled") setEmployee(empR.value);
      if (payR.status === "fulfilled") setPayrolls(payR.value.data);
      if (projR.status === "fulfilled") setAllProjects(projR.value.data);
    } catch { setError("Error al cargar datos"); }
    finally { if (spin) setLoading(false); }
  }, [empId]);

  useEffect(() => { fetchData(true); }, [fetchData]);

  /* derivados */
  const paidPayrolls = payrolls.filter((p) => p.status === "pago" || p.status === "paid");
  const lastPaid = paidPayrolls.sort((a, b) => (b.paid_date || "").localeCompare(a.paid_date || ""))[0] || null;
  const totalPaid = paidPayrolls.reduce((s, p) => s + p.net_salary, 0);
  const totalBonuses = payrolls.reduce((s, p) => s + (p.bonuses || 0), 0);
  const avgBonus = payrolls.length ? totalBonuses / payrolls.length : 0;
  const hireDate = employee?.created_at ? new Date(employee.created_at) : null;
  const yearsWorked = hireDate ? Math.floor((Date.now() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0;

  /* acciones nómina */
  const handleStatusChange = async (payroll: Payroll, newStatus: string) => {
    try {
      await payrollApi.changePayrollStatus(payroll.id, newStatus);
      fetchData();
    } catch { setError("Error al cambiar estado"); }
  };

  const handleDeletePayroll = async () => {
    if (!deleteTarget) return;
    try {
      await payrollApi.deletePayroll(deleteTarget.id);
      pending.current = true;
      setDeleteTarget(null);
    } catch { setError("Error al eliminar nómina"); }
  };

  const handleDeleteEmployee = async () => {
    try {
      await employeesApi.deleteEmployee(empId);
      navigate("/nominas");
    } catch { setError("Error al eliminar empleado"); }
  };

  const handleConfirmPay = async () => {
    if (!payDlg) return;
    try {
      await payrollApi.changePayrollStatus(payDlg.id, "pago");
      if (payDate) await payrollApi.updatePayroll(payDlg.id, { paid_date: payDate });
      pending.current = true;
      setPayDlg(null);
    } catch { setError("Error al confirmar pago"); }
  };

  const handleAssignProject = async () => {
    if (!assignProjId) return;
    try {
      await employeesApi.assignProjects(empId, [Number(assignProjId)]);
      pending.current = true;
      setAssignDlg(false);
      setAssignProjId("");
    } catch { setError("Error al asignar proyecto"); }
  };

  const exportPdf = (p: Payroll) => {
    const emp = employee;
    const content = `
DETALLE DE NÓMINA
=================
Empleado: ${emp?.first_name} ${emp?.last_name}
Periodo: ${p.period}
Sueldo Base: ${fmtMoney(p.base_salary)}
Bonificaciones: ${fmtMoney(p.bonuses)}
Deducciones: ${fmtMoney(p.deductions)}
Neto: ${fmtMoney(p.net_salary)}
Estado: ${p.status}
Fecha de pago: ${fmtDate(p.paid_date)}
    `.trim();
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `nomina_${emp?.first_name}_${p.period}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh"><CircularProgress sx={{ color: brand.purple }} /></Box>;
  if (!employee) return <Alert severity="error">Empleado no encontrado</Alert>;

  const statusColor = employee.contract_status === "active" ? "success" : employee.contract_status === "inactive" ? "error" : "warning";

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      {/* breadcrumb + cabecera */}
      <Typography variant="caption" color="text.secondary" mb={1} display="block">
        Nómina &gt; {employee.first_name} {employee.last_name}
      </Typography>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button startIcon={<BackIcon />} onClick={() => navigate("/nominas")} sx={{ textTransform: "none", fontWeight: 600 }}>Volver</Button>
          <Typography variant="h5" fontWeight={800}>{employee.first_name} {employee.last_name}</Typography>
          <Chip label={employee.contract_status === "active" ? "activo" : employee.contract_status} color={statusColor} size="small" sx={{ fontWeight: 600 }} />
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="outlined" startIcon={<EditIcon />} onClick={() => navigate("/empleados")} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>Editar</Button>
          <Button variant="contained" color="error" startIcon={<DeleteIcon />} onClick={() => setDeleteEmpDlg(true)} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>Eliminar</Button>
        </Box>
      </Box>

      <Typography variant="body2" color="text.secondary" mb={2}>{employee.position} - {employee.department}</Typography>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3, borderBottom: "2px solid", borderColor: "divider",
        "& .MuiTab-root": { textTransform: "none", fontWeight: 600 }, "& .Mui-selected": { color: brand.purple }, "& .MuiTabs-indicator": { bgcolor: brand.purple } }}>
        <Tab label="Resumen" />
        <Tab label="Información Personal" />
        <Tab label="Nóminas" />
        <Tab label="Proyectos" />
        <Tab label="Documentos" />
        <Tab label="Actividad" />
      </Tabs>

      {/* ════════════ Tab 0: Resumen ════════════ */}
      {activeTab === 0 && (
        <Box>
          {/* cards resumen */}
          <Grid container spacing={2} mb={3}>
            {[
              { t: "Proyectos Asignados", v: String(allProjects.length), s: allProjects.map((p) => p.name).join(", ") || "Ninguno", icon: <WorkIcon />, c: brand.purple },
              { t: "Antigüedad", v: `${yearsWorked} año${yearsWorked !== 1 ? "s" : ""}`, s: hireDate ? `Desde ${fmtDate(employee.created_at)}` : "", icon: <TimeIcon />, c: "#f59e0b" },
              { t: "Sueldo Base", v: fmtMoney(employee.salary), s: "mensual", icon: <MoneyIcon />, c: "#10b981" },
              { t: "Bonificaciones", v: fmtMoney(Math.round(avgBonus)), s: "Mensual promedio", icon: <BonusIcon />, c: "#ef4444" },
            ].map((c) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={c.t}>
                <Card sx={{ height: "100%", border: "1px solid", borderColor: "divider" }}>
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>{c.t}</Typography>
                        <Typography variant="h5" fontWeight={700} mt={.5} color={c.c}>{c.v}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block" mt={.3} noWrap>{c.s}</Typography>
                      </Box>
                      <Avatar sx={{ bgcolor: `${c.c}12`, color: c.c, width: 40, height: 40 }}>{c.icon}</Avatar>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* último pago */}
          <Card sx={{ mb: 3, border: "1px solid", borderColor: "divider" }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={1}>Último Pago Realizado</Typography>
              {lastPaid ? (
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h4" fontWeight={800} color="#10b981">{fmtMoney(lastPaid.net_salary)}</Typography>
                    <Typography variant="body2" color="text.secondary">{fmtDate(lastPaid.paid_date)}</Typography>
                  </Box>
                  <Chip label="Pagado" color="success" sx={{ fontWeight: 600 }} />
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">No hay pagos realizados aún</Typography>
              )}
            </CardContent>
          </Card>

          {/* cronograma + calendario */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ height: "100%", border: "1px solid", borderColor: "divider" }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={700} mb={.5}>Cronograma de Pagos</Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mb={2}>Últimos pagos realizados</Typography>
                  {paidPayrolls.slice(0, 5).map((p) => (
                    <Box key={p.id} display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">{fmtDate(p.paid_date)}</Typography>
                        <Typography variant="body2" fontWeight={600}>{p.period}</Typography>
                      </Box>
                      <Typography variant="body2" fontWeight={700}>{fmtMoney(p.net_salary)}</Typography>
                    </Box>
                  ))}
                  {!paidPayrolls.length && <Typography variant="body2" color="text.secondary">Sin pagos</Typography>}
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ height: "100%", border: "1px solid", borderColor: "divider" }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={700} mb={.5}>Distribución Gastos</Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mb={2}>Por tipo de pago</Typography>
                  <Box display="flex" justifyContent="center" alignItems="center" minHeight={120}>
                    <Box textAlign="center">
                      <Box sx={{ width: 100, height: 100, borderRadius: "50%", border: `8px solid ${brand.purple}`, display: "flex", alignItems: "center", justifyContent: "center", mx: "auto" }}>
                        <Box textAlign="center">
                          <Typography variant="caption" color="text.secondary">Total</Typography>
                          <Typography variant="body2" fontWeight={700}>{fmtMoney(totalPaid)}</Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ height: "100%", border: "1px solid", borderColor: "divider" }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={700} mb={.5}>Calendario</Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mb={2}>Nóminas recientes</Typography>
                  <MiniCalendar highlightDate={lastPaid?.paid_date || null} />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ════════════ Tab 1: Información Personal ════════════ */}
      {activeTab === 1 && (
        <Card sx={{ border: "1px solid", borderColor: "divider" }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} mb={2}>Información Personal</Typography>
            <Grid container spacing={2}>
              {[
                { label: "Nombre", value: employee.first_name },
                { label: "Apellido", value: employee.last_name },
                { label: "Cargo", value: employee.position || "—" },
                { label: "Departamento", value: employee.department || "—" },
                { label: "Salario Base", value: fmtMoney(employee.salary) },
                { label: "Estado Contrato", value: employee.contract_status },
                { label: "Fecha de Registro", value: fmtDate(employee.created_at) },
                { label: "Última Actualización", value: fmtDate(employee.updated_at) },
              ].map((item) => (
                <Grid size={{ xs: 12, sm: 6 }} key={item.label}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>{item.label}</Typography>
                  <Typography variant="body1" fontWeight={500}>{item.value}</Typography>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* ════════════ Tab 2: Nóminas ════════════ */}
      {activeTab === 2 && (
        <Card sx={{ border: "1px solid", borderColor: "divider" }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} mb={.5} display="flex" alignItems="center" gap={1}>
              <CalIcon sx={{ color: brand.purple }} /> Historial de Nóminas
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Registro histórico de pagos de nómina del empleado ({payrolls.length} registro{payrolls.length !== 1 ? "s" : ""})
            </Typography>

            <TableContainer>
              <Table>
                <TableHead><TableRow sx={{ bgcolor: "#fafafa" }}>
                  <TableCell sx={{ fontWeight: 700 }}>Periodo</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Valor Neto</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Fecha Pago</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Acciones</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {payrolls.length === 0 ? (
                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: "text.secondary" }}>No hay nóminas registradas</TableCell></TableRow>
                  ) : payrolls.map((p) => (
                    <TableRow key={p.id} hover>
                      <TableCell><Typography variant="body2" fontWeight={600}>{p.period}</Typography></TableCell>
                      <TableCell><Typography variant="body2" fontWeight={700} color="#10b981">{fmtMoney(p.net_salary)}</Typography></TableCell>
                      <TableCell>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <Select value={p.status} onChange={(e) => handleStatusChange(p, e.target.value)}
                            sx={{ fontWeight: 600, fontSize: 13, "& .MuiSelect-select": { py: .5 } }}>
                            <MenuItem value="pending">Pendiente</MenuItem>
                            <MenuItem value="pago">Pagado</MenuItem>
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{p.paid_date ? fmtDate(p.paid_date) : "-"}</Typography></TableCell>
                      <TableCell align="right">
                        <Tooltip title="Ver detalle"><IconButton size="small" onClick={() => setDetailPayroll(p)}><ViewIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Editar / Pagar"><IconButton size="small" onClick={() => { setPayDlg(p); setPayDate(new Date().toISOString().split("T")[0]); setPayBonus(""); }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Más opciones"><IconButton size="small" onClick={(e) => { setMenuAnchor(e.currentTarget); setMenuPayroll(p); }}><MoreIcon fontSize="small" /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* ════════════ Tab 3: Proyectos ════════════ */}
      {activeTab === 3 && (
        <Card sx={{ border: "1px solid", borderColor: "divider" }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={700}>Proyectos Asignados</Typography>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setAssignDlg(true)}
                sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, borderColor: brand.purple, color: brand.purple }}>
                Asignar Proyecto
              </Button>
            </Box>
            {allProjects.length === 0
              ? <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>No hay proyectos asignados</Typography>
              : allProjects.map((p) => (
                <Box key={p.id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 2, mb: 1, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar sx={{ bgcolor: `${brand.purple}15`, color: brand.purple }}><WorkIcon /></Avatar>
                    <Box>
                      <Typography fontWeight={700}>{p.name}</Typography>
                      <Typography variant="body2" color="text.secondary">{p.status}</Typography>
                    </Box>
                  </Box>
                  <Chip label={p.status === "active" ? "Activo" : p.status} color={p.status === "active" ? "success" : "default"} size="small" sx={{ fontWeight: 600 }} />
                </Box>
              ))
            }
          </CardContent>
        </Card>
      )}

      {/* ════════════ Tab 4: Documentos ════════════ */}
      {activeTab === 4 && (
        <Card sx={{ border: "1px solid", borderColor: "divider" }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} mb={2}>Documentos</Typography>
            <Box sx={{ border: "2px dashed", borderColor: "divider", borderRadius: 2, p: 6, textAlign: "center", cursor: "pointer", "&:hover": { borderColor: brand.purple } }}>
              <UploadIcon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
              <Typography variant="body1" color={brand.purple} fontWeight={600}>Subir documentos</Typography>
              <Typography variant="body2" color="text.secondary">PDF, DOC, DOCX, XLS, XLSX hasta 10MB</Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* ════════════ Tab 5: Actividad ════════════ */}
      {activeTab === 5 && (
        <Card sx={{ border: "1px solid", borderColor: "divider" }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} mb={2}>Actividad Reciente</Typography>
            {payrolls.slice(0, 10).map((p) => (
              <Box key={p.id} display="flex" alignItems="flex-start" gap={2} mb={2}>
                <Avatar sx={{ bgcolor: `${brand.purple}15`, color: brand.purple, width: 32, height: 32 }}><MoneyIcon sx={{ fontSize: 16 }} /></Avatar>
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    Nómina {p.period} — {p.status === "pago" || p.status === "paid" ? "Pagada" : "Pendiente"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">{fmtDate(p.created_at)} · {fmtMoney(p.net_salary)}</Typography>
                </Box>
              </Box>
            ))}
            {!payrolls.length && <Typography variant="body2" color="text.secondary">Sin actividad registrada</Typography>}
          </CardContent>
        </Card>
      )}

      {/* ════════════ Dialogs ════════════ */}

      {/* Dialog detalle nómina */}
      <Dialog open={Boolean(detailPayroll)} onClose={() => setDetailPayroll(null)} TransitionProps={{ onExited }} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box>
            <Typography variant="h6" fontWeight={700} display="flex" alignItems="center" gap={1}><MoneyIcon sx={{ color: brand.purple }} /> Detalle de Nómina</Typography>
            <Typography variant="body2" color="text.secondary">Información completa del pago de nómina</Typography>
          </Box>
          <IconButton onClick={() => setDetailPayroll(null)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        {detailPayroll && (
          <DialogContent>
            <Box mb={2}>
              <Grid container spacing={1}>
                <Grid size={6}><Typography variant="caption" color={brand.purple} fontWeight={600}>Periodo</Typography><Typography variant="body2" fontWeight={600}>{detailPayroll.period}</Typography></Grid>
                <Grid size={6}><Typography variant="caption" color={brand.purple} fontWeight={600}>Proyecto</Typography><Typography variant="body2" fontWeight={600}>—</Typography></Grid>
              </Grid>
            </Box>
            <Box mb={2}>
              {[
                { label: "Sueldo Base:", value: fmtMoney(detailPayroll.base_salary), color: "text.primary" },
                { label: "Bonificaciones:", value: `+${fmtMoney(detailPayroll.bonuses)}`, color: "#10b981" },
                { label: "Deducciones:", value: `-${fmtMoney(detailPayroll.deductions)}`, color: "#ef4444" },
              ].map((r) => (
                <Box key={r.label} display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" fontWeight={600} color={r.label.includes("Bonif") ? "#10b981" : r.label.includes("Deduc") ? "#ef4444" : "text.primary"}>{r.label}</Typography>
                  <Typography variant="body2" fontWeight={600} color={r.color}>{r.value}</Typography>
                </Box>
              ))}
              <Box display="flex" justifyContent="space-between" mt={2} pt={1} borderTop="1px solid" borderColor="divider">
                <Typography variant="body1" fontWeight={800}>Total:</Typography>
                <Typography variant="body1" fontWeight={800} color="#10b981">{fmtMoney(detailPayroll.net_salary)}</Typography>
              </Box>
            </Box>
            <Grid container spacing={2} mb={2}>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" gap={.5}><CalIcon sx={{ fontSize: 14 }} /> Fecha de Pago</Typography>
                <Typography variant="body2" fontWeight={500}>{detailPayroll.paid_date ? fmtDate(detailPayroll.paid_date) : "Sin fecha"}</Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary">Método de Pago</Typography>
                <Typography variant="body2" fontWeight={500}>Transferencia</Typography>
              </Grid>
            </Grid>
            <Typography variant="caption" color="text.secondary">Estado</Typography>
            <Box mb={2}><Chip label={detailPayroll.status === "pago" || detailPayroll.status === "paid" ? "pagado" : "pendiente"} color={detailPayroll.status === "pago" || detailPayroll.status === "paid" ? "success" : "warning"} size="small" sx={{ fontWeight: 600 }} /></Box>
          </DialogContent>
        )}
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="contained" color="error" startIcon={<DeleteIcon />} onClick={() => { if (detailPayroll) { setDeleteTarget(detailPayroll); setDetailPayroll(null); } }} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>Eliminar</Button>
          <Button variant="outlined" startIcon={<PdfIcon />} onClick={() => { if (detailPayroll) exportPdf(detailPayroll); }} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>Exportar PDF</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog pagar / confirmar */}
      <Dialog open={Boolean(payDlg)} onClose={() => setPayDlg(null)} TransitionProps={{ onExited }} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        {payDlg && (
          <>
            <DialogTitle>
              <Typography variant="h6" fontWeight={700}>Detalle de Nómina</Typography>
              <Typography variant="body2" color="text.secondary">{employee.first_name} {employee.last_name} · {payDlg.period}</Typography>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={1.5} mb={3}>
                <Grid size={6}><Card sx={{ border: "1px solid", borderColor: "divider" }}><CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Typography variant="caption" color="text.secondary">Sueldo Base</Typography>
                  <Typography variant="h6" fontWeight={700}>{fmtMoney(payDlg.base_salary)}</Typography>
                </CardContent></Card></Grid>
                <Grid size={6}><Card sx={{ border: "1px solid", borderColor: "divider" }}><CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Typography variant="caption" color="text.secondary">Bonificaciones</Typography>
                  <Typography variant="h6" fontWeight={700}>{fmtMoney(payDlg.bonuses)}</Typography>
                </CardContent></Card></Grid>
                <Grid size={6}><Card sx={{ border: "1px solid", borderColor: "divider" }}><CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Typography variant="caption" color="text.secondary">Deducciones</Typography>
                  <Typography variant="h6" fontWeight={700}>{fmtMoney(payDlg.deductions)}</Typography>
                </CardContent></Card></Grid>
                <Grid size={6}><Card sx={{ border: "1px solid", borderColor: "divider" }}><CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Typography variant="caption" color="#10b981">Neto a pagar</Typography>
                  <Typography variant="h6" fontWeight={700} color="#10b981">{fmtMoney(payDlg.net_salary)}</Typography>
                </CardContent></Card></Grid>
              </Grid>

              <Typography variant="subtitle2" fontWeight={700} mb={1.5}>Registrar pago</Typography>
              <Grid container spacing={2} mb={2}>
                <Grid size={6}>
                  <TextField label="Mes" value={payDlg.period} disabled fullWidth size="small" />
                </Grid>
                <Grid size={6}>
                  <TextField label="Fecha de pago" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} />
                </Grid>
              </Grid>
              <TextField label="Bonificación adicional (opcional)" value={payBonus} onChange={(e) => setPayBonus(e.target.value)} fullWidth size="small" multiline rows={2} placeholder="Ingrese detalles de bonificación adicional..." sx={{ mb: 2 }} />

              <Typography variant="caption" color="text.secondary">Estado</Typography>
              <Box mb={1}><Chip label={payDlg.status === "pago" || payDlg.status === "paid" ? "pagado" : "pendiente"} color={payDlg.status === "pago" || payDlg.status === "paid" ? "success" : "warning"} size="small" sx={{ fontWeight: 600 }} /></Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, flexDirection: "column", gap: 1 }}>
              <Button fullWidth variant="contained" startIcon={<PseIcon />}
                sx={{ bgcolor: brand.purple, "&:hover": { bgcolor: brand.purpleDark }, textTransform: "none", fontWeight: 600, borderRadius: 2, py: 1.2 }}>
                Pagar con PSE
              </Button>
              <Button fullWidth variant="outlined" onClick={handleConfirmPay}
                sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>
                Confirmar pago
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Menu opciones nómina */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => { setMenuAnchor(null); setMenuPayroll(null); }}>
        <MuiMenuItem onClick={() => { if (menuPayroll) exportPdf(menuPayroll); setMenuAnchor(null); }}>Exportar PDF</MuiMenuItem>
        <MuiMenuItem onClick={() => { if (menuPayroll) { setDeleteTarget(menuPayroll); } setMenuAnchor(null); }} sx={{ color: "error.main" }}>Eliminar</MuiMenuItem>
      </Menu>

      {/* Dialog eliminar nómina */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} TransitionProps={{ onExited }} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>¿Eliminar nómina?</DialogTitle>
        <DialogContent><Typography variant="body2" color="text.secondary">Esta acción eliminará la nómina del periodo <strong>{deleteTarget?.period}</strong> de forma permanente.</Typography></DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDeletePayroll} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>Eliminar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog eliminar empleado */}
      <Dialog open={deleteEmpDlg} onClose={() => setDeleteEmpDlg(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>¿Eliminar empleado?</DialogTitle>
        <DialogContent><Typography variant="body2" color="text.secondary">Esta acción eliminará al empleado <strong>{employee.first_name} {employee.last_name}</strong> y todas sus nóminas de forma permanente.</Typography></DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteEmpDlg(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDeleteEmployee} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>Eliminar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog asignar proyecto */}
      <Dialog open={assignDlg} onClose={() => setAssignDlg(false)} TransitionProps={{ onExited }} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Asignar Proyecto</DialogTitle>
        <DialogContent>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>Proyecto</InputLabel>
            <Select value={assignProjId} label="Proyecto" onChange={(e) => setAssignProjId(e.target.value)}>
              {allProjects.map((p) => <MenuItem key={p.id} value={String(p.id)}>{p.name}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAssignDlg(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" disabled={!assignProjId} onClick={handleAssignProject}
            sx={{ bgcolor: brand.purple, "&:hover": { bgcolor: brand.purpleDark }, textTransform: "none", fontWeight: 600, borderRadius: 2 }}>
            Asignar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
