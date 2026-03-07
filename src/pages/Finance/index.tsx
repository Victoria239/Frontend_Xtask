/* Módulo de Finanzas — Presupuestos, Nómina, Facturación, Reportes */

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
  AttachMoney as MoneyIcon, TrendingUp as TrendIcon, PieChart as PieIcon,
  Receipt as InvoiceIcon, Assessment as ReportIcon, People as PeopleIcon,
  Visibility as ViewIcon, Edit as EditIcon, Delete as DeleteIcon,
  FilterList as FilterIcon, CloudUpload as UploadIcon, Description as DocIcon,
  CheckCircle as CheckIcon, Warning as WarnIcon, Error as ErrorIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { financeApi, projectsApi, payrollApi, employeesApi } from "../../api";
import type { Budget, Invoice, Project, Payroll, Employee } from "../../types";
import { brand } from "../../theme";
import CurrencyInput from "../../components/CurrencyInput";

function fmtMoney(n: number) { return `$ ${n.toLocaleString("es-CO", { minimumFractionDigits: 0 })}`; }
function fmtDate(d: string | null) { return d ? new Date(d).toLocaleDateString("es-CO") : "—"; }

/* ================================================================== */
export default function FinancePage() {
  const navigate = useNavigate();
  const [mainTab, setMainTab] = useState(0);

  /* datos */
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const pending = useRef(false);
  const onExited = () => { if (pending.current) { pending.current = false; fetchData(); } };

  const fetchData = useCallback(async (spin = false) => {
    if (spin) setLoading(true);
    try {
      const [bR, iR, pR, nR, eR] = await Promise.allSettled([
        financeApi.getBudgets({ pageSize: 200 }),
        financeApi.getInvoices({ pageSize: 200 }),
        projectsApi.getProjects({ pageSize: 100 }),
        payrollApi.getPayrolls({ pageSize: 200 }),
        employeesApi.getEmployees({ pageSize: 100 }),
      ]);
      if (bR.status === "fulfilled") setBudgets(bR.value.data);
      if (iR.status === "fulfilled") setInvoices(iR.value.data);
      if (pR.status === "fulfilled") setProjects(pR.value.data);
      if (nR.status === "fulfilled") setPayrolls(nR.value.data);
      if (eR.status === "fulfilled") setEmployees(eR.value.data);
    } catch { setError("Error al cargar datos financieros"); }
    finally { if (spin) setLoading(false); }
  }, []);
  useEffect(() => { fetchData(true); }, [fetchData]);

  /* ── Presupuestos state ── */
  const [budgetFilter, setBudgetFilter] = useState("all");
  const [budgetSearch, setBudgetSearch] = useState("");
  const [budgetArea, setBudgetArea] = useState("");
  const [budgetDlg, setBudgetDlg] = useState(false);
  const [editBudget, setEditBudget] = useState<Budget | null>(null);
  const [bForm, setBForm] = useState({ name: "", total_amount: 0, description: "", start_date: "", end_date: "", area: "", execution_pct: "", warranty_pct: "", reserves: 0 });
  const [bSaving, setBSaving] = useState(false);
  const [bErr, setBErr] = useState("");

  /* ── Facturación state ── */
  const [selProject, setSelProject] = useState<string>("");
  const [invDlg, setInvDlg] = useState(false);
  const [iForm, setIForm] = useState({ name: "", type: "ingreso", vendor: "", concept: "", subtotal: 0, total: 0, issue_date: "", due_date: "", payment_method: "" });
  const [iSaving, setISaving] = useState(false);
  const [iErr, setIErr] = useState("");

  /* ── Delete ── */
  const [delBudget, setDelBudget] = useState<Budget | null>(null);
  const [delInvoice, setDelInvoice] = useState<Invoice | null>(null);

  /* === Presupuestos logic === */
  const filteredBudgets = budgets.filter((b) => {
    if (budgetFilter === "active" && b.status !== "active") return false;
    if (budgetFilter === "alert" && !(b.spent_amount / b.total_amount > 0.8 && b.status === "active")) return false;
    if (budgetFilter === "completed" && b.status !== "completed") return false;
    if (budgetSearch && !b.name.toLowerCase().includes(budgetSearch.toLowerCase())) return false;
    return true;
  });

  const totalBudgeted = budgets.reduce((s, b) => s + b.total_amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent_amount, 0);
  const activeBudgets = budgets.filter((b) => b.status === "active").length;
  const alertBudgets = budgets.filter((b) => b.total_amount > 0 && b.spent_amount / b.total_amount > 0.8 && b.status === "active").length;
  const completedBudgets = budgets.filter((b) => b.status === "completed").length;
  const execPct = totalBudgeted > 0 ? ((totalSpent / totalBudgeted) * 100).toFixed(1) : "0.0";

  const openBudgetCreate = () => {
    setEditBudget(null);
    setBForm({ name: "", total_amount: 0, description: "", start_date: "", end_date: "", area: "", execution_pct: "", warranty_pct: "", reserves: 0 });
    setBErr(""); setBudgetDlg(true);
  };

  const handleSaveBudget = async () => {
    if (!bForm.name.trim() || !bForm.total_amount) { setBErr("Nombre y monto son obligatorios"); return; }
    const budgetAmount = bForm.total_amount;
    setBSaving(true); setBErr("");
    try {
      const payload = {
        name: bForm.name,
        total_amount: budgetAmount,
        description: bForm.description || undefined,
        start_date: bForm.start_date || undefined,
        end_date: bForm.end_date || undefined,
      };
      if (editBudget) {
        await financeApi.updateBudget(editBudget.id, payload);
      } else {
        await financeApi.createBudget(payload);
      }
      pending.current = true; setBudgetDlg(false);
    } catch { setBErr("Error al guardar presupuesto"); }
    finally { setBSaving(false); }
  };

  const handleDeleteBudget = async () => {
    if (!delBudget) return;
    try { await financeApi.deleteBudget(delBudget.id); pending.current = true; setDelBudget(null); }
    catch { setError("Error al eliminar presupuesto"); }
  };

  /* === Facturación logic === */
  const projInvoices = invoices.filter((i) => !selProject || String(i.budget_id) === selProject);
  const paidInv = projInvoices.filter((i) => i.status === "paid" || i.status === "pagada").length;
  const pendingInv = projInvoices.filter((i) => i.status === "pending" || i.status === "pendiente").length;
  const overdueInv = projInvoices.filter((i) => i.status === "overdue" || i.status === "vencida").length;
  const rejectedInv = projInvoices.filter((i) => i.status === "rejected" || i.status === "rechazada").length;
  const totalInvoiced = projInvoices.reduce((s, i) => s + i.amount, 0);
  const paidPct = projInvoices.length ? ((paidInv / projInvoices.length) * 100).toFixed(1) : "0.0";

  const openInvoiceCreate = () => {
    setIForm({ name: "", type: "ingreso", vendor: "", concept: "", subtotal: 0, total: 0, issue_date: "", due_date: "", payment_method: "" });
    setIErr(""); setInvDlg(true);
  };

  const handleSaveInvoice = async () => {
    if (!iForm.name.trim()) { setIErr("El nombre es obligatorio"); return; }
    setISaving(true); setIErr("");
    try {
      await financeApi.createInvoice({
        invoice_number: iForm.name,
        vendor: iForm.vendor || iForm.type,
        amount: iForm.total || iForm.subtotal || 0,
        issue_date: iForm.issue_date || undefined,
        due_date: iForm.due_date || undefined,
        budget_id: selProject ? Number(selProject) : undefined,
      });
      pending.current = true; setInvDlg(false);
    } catch { setIErr("Error al crear factura"); }
    finally { setISaving(false); }
  };

  const handleDeleteInvoice = async () => {
    if (!delInvoice) return;
    try { await financeApi.deleteInvoice(delInvoice.id); pending.current = true; setDelInvoice(null); }
    catch { setError("Error al eliminar factura"); }
  };

  const handleInvoiceStatus = async (inv: Invoice, status: string) => {
    try { await financeApi.changeInvoiceStatus(inv.id, status); fetchData(); }
    catch { setError("Error al cambiar estado"); }
  };

  /* ── render ── */
  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh"><CircularProgress sx={{ color: brand.purple }} /></Box>;

  return (
    <Box>
      {/* cabecera */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Finanzas</Typography>
          <Typography variant="body2" color="text.secondary">Gestión de presupuestos y finanzas</Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="outlined" startIcon={<PeopleIcon />} onClick={() => navigate("/finanzas/recursos")}
            sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, borderColor: "divider", color: "text.primary" }}>
            Recursos
          </Button>
          {mainTab === 0 && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openBudgetCreate}
              sx={{ bgcolor: brand.purple, "&:hover": { bgcolor: brand.purpleDark }, textTransform: "none", fontWeight: 600, borderRadius: 2, px: 3 }}>
              Nuevo Presupuesto
            </Button>
          )}
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      {/* tabs principales */}
      <Tabs value={mainTab} onChange={(_, v) => setMainTab(v)} sx={{ mb: 3, borderBottom: "2px solid", borderColor: "divider",
        "& .MuiTab-root": { textTransform: "none", fontWeight: 600 }, "& .Mui-selected": { color: brand.purple }, "& .MuiTabs-indicator": { bgcolor: brand.purple } }}>
        <Tab icon={<MoneyIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Presupuestos" />
        <Tab icon={<PeopleIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Nómina" />
        <Tab icon={<InvoiceIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Facturación" />
        <Tab icon={<ReportIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Reportes" />
      </Tabs>

      {/* ════════════ TAB 0: PRESUPUESTOS ════════════ */}
      {mainTab === 0 && (
        <Box>
          {/* cards resumen */}
          <Grid container spacing={2} mb={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ border: "1px solid", borderColor: "divider" }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">Total Presupuestado</Typography>
                  <Typography variant="h4" fontWeight={800} display="flex" alignItems="center" gap={1}>
                    <MoneyIcon sx={{ color: brand.purple }} /> {fmtMoney(totalBudgeted)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">{activeBudgets} presupuestos activos</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ border: "1px solid", borderColor: "divider" }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">Total Gastado</Typography>
                  <Typography variant="h4" fontWeight={800} display="flex" alignItems="center" gap={1}>
                    <TrendIcon sx={{ color: "#10b981" }} /> {fmtMoney(totalSpent)}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1} mt={1}>
                    <Typography variant="caption" color="text.secondary">Ejecución</Typography>
                    <Box flex={1}><LinearProgress variant="determinate" value={Number(execPct)} sx={{ height: 8, borderRadius: 4, bgcolor: "#e5e7eb", "& .MuiLinearProgress-bar": { bgcolor: "#06b6d4", borderRadius: 4 } }} /></Box>
                    <Typography variant="caption" fontWeight={600}>{execPct}%</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ border: "1px solid", borderColor: "divider" }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">Distribución por Estado</Typography>
                  <Box display="flex" gap={1} mt={1} flexWrap="wrap">
                    <Chip label={`Activo: ${activeBudgets}`} size="small" sx={{ bgcolor: "#dbeafe", color: "#2563eb", fontWeight: 600 }} />
                    <Chip label={`Alerta: ${alertBudgets}`} size="small" sx={{ bgcolor: "#fef3c7", color: "#d97706", fontWeight: 600 }} />
                    <Chip label={`Completado: ${completedBudgets}`} size="small" sx={{ bgcolor: "#d1fae5", color: "#059669", fontWeight: 600 }} />
                  </Box>
                  <Typography variant="caption" color="text.secondary" display="block" mt={1}>Basado en el porcentaje de ejecución</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* filtros */}
          <Box display="flex" alignItems="center" gap={1} mb={2} flexWrap="wrap">
            {["all", "active", "alert", "completed"].map((f) => (
              <Chip key={f} label={f === "all" ? "Todos" : f === "active" ? "Activos" : f === "alert" ? "En Alerta" : "Completados"}
                onClick={() => setBudgetFilter(f)} variant={budgetFilter === f ? "filled" : "outlined"}
                sx={{ fontWeight: 600, ...(budgetFilter === f ? { bgcolor: brand.purple, color: "#fff" } : {}) }} />
            ))}
            <Box flex={1} />
            <TextField size="small" placeholder="Buscar presupuesto..." value={budgetSearch} onChange={(e) => setBudgetSearch(e.target.value)}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
              sx={{ width: 220 }} />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Todas las áreas</InputLabel>
              <Select value={budgetArea} label="Todas las áreas" onChange={(e) => setBudgetArea(e.target.value)}>
                <MenuItem value="">Todas las áreas</MenuItem>
                <MenuItem value="tech">Tecnología</MenuItem>
                <MenuItem value="ops">Operaciones</MenuItem>
                <MenuItem value="admin">Administración</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* tabla presupuestos */}
          <Card sx={{ border: "1px solid", borderColor: "divider" }}>
            <TableContainer>
              <Table>
                <TableHead><TableRow sx={{ bgcolor: "#fafafa" }}>
                  <TableCell sx={{ fontWeight: 700 }}>Nombre</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Monto</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>% Ejecución</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Monto Ejecución</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Reservas</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {filteredBudgets.length === 0 ? (
                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>No hay presupuestos</TableCell></TableRow>
                  ) : filteredBudgets.map((b) => {
                    const pct = b.total_amount > 0 ? ((b.spent_amount / b.total_amount) * 100) : 0;
                    const stColor = b.status === "completed" ? "success" : pct > 80 ? "warning" : "info";
                    const stLabel = b.status === "completed" ? "Completado" : "Activo";
                    return (
                      <TableRow key={b.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700}>{b.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{fmtDate(b.start_date)} - {fmtDate(b.end_date)}</Typography>
                        </TableCell>
                        <TableCell><Typography variant="body2" fontWeight={600}>{fmtMoney(b.total_amount)}</Typography></TableCell>
                        <TableCell><Typography variant="body2" fontWeight={600}>{pct.toFixed(1)}%</Typography></TableCell>
                        <TableCell><Typography variant="body2">{b.spent_amount > 0 ? fmtMoney(b.spent_amount) : "N/A"}</Typography></TableCell>
                        <TableCell><Typography variant="body2" color="text.secondary">N/A</Typography></TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={.5}>
                            {stColor === "success" ? <CheckIcon sx={{ fontSize: 16, color: "#10b981" }} /> : <Tooltip title="Expandir"><AddIcon sx={{ fontSize: 16, color: "#3b82f6", cursor: "pointer" }} /></Tooltip>}
                            <Chip label={stLabel} color={stColor} size="small" sx={{ fontWeight: 600, fontSize: 11 }} />
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>
      )}

      {/* ════════════ TAB 1: NÓMINA (resumen) ════════════ */}
      {mainTab === 1 && (
        <Box>
          <Grid container spacing={2} mb={3}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ border: "1px solid", borderColor: "divider" }}><CardContent>
                <Typography variant="caption" color="text.secondary">Empleados Activos</Typography>
                <Typography variant="h4" fontWeight={700}>{employees.filter((e) => e.contract_status === "active").length}</Typography>
              </CardContent></Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ border: "1px solid", borderColor: "divider" }}><CardContent>
                <Typography variant="caption" color="text.secondary">Nómina Total Mensual</Typography>
                <Typography variant="h4" fontWeight={700}>{fmtMoney(employees.reduce((s, e) => s + (e.salary || 0), 0))}</Typography>
              </CardContent></Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ border: "1px solid", borderColor: "divider" }}><CardContent>
                <Typography variant="caption" color="text.secondary">Nóminas Pendientes</Typography>
                <Typography variant="h4" fontWeight={700} color="#f59e0b">{payrolls.filter((p) => p.status === "pending").length}</Typography>
              </CardContent></Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ border: "1px solid", borderColor: "divider" }}><CardContent>
                <Typography variant="caption" color="text.secondary">Pagos Realizados</Typography>
                <Typography variant="h4" fontWeight={700} color="#10b981">{payrolls.filter((p) => p.status === "pago" || p.status === "paid").length}</Typography>
              </CardContent></Card>
            </Grid>
          </Grid>

          <Card sx={{ border: "1px solid", borderColor: "divider" }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight={700}>Nóminas Recientes</Typography>
                <Button variant="outlined" onClick={() => navigate("/nominas")} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, borderColor: brand.purple, color: brand.purple }}>
                  Ir a Módulo de Nómina
                </Button>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead><TableRow sx={{ bgcolor: "#fafafa" }}>
                    <TableCell sx={{ fontWeight: 700 }}>Empleado</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Periodo</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Neto</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
                  </TableRow></TableHead>
                  <TableBody>
                    {payrolls.slice(0, 10).map((p) => {
                      const emp = employees.find((e) => e.id === p.employee_id);
                      return (
                        <TableRow key={p.id} hover>
                          <TableCell><Typography variant="body2" fontWeight={600}>{emp ? `${emp.first_name} ${emp.last_name}` : `Emp #${p.employee_id}`}</Typography></TableCell>
                          <TableCell>{p.period}</TableCell>
                          <TableCell><Typography variant="body2" fontWeight={700} color="#10b981">{fmtMoney(p.net_salary)}</Typography></TableCell>
                          <TableCell><Chip label={p.status === "pago" || p.status === "paid" ? "Pagado" : "Pendiente"} color={p.status === "pago" || p.status === "paid" ? "success" : "warning"} size="small" sx={{ fontWeight: 600 }} /></TableCell>
                        </TableRow>
                      );
                    })}
                    {!payrolls.length && <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: "text.secondary" }}>Sin nóminas</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* ════════════ TAB 2: FACTURACIÓN ════════════ */}
      {mainTab === 2 && (
        <Box>
          <Typography variant="h5" fontWeight={800} mb={.5}>Facturación</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>Gestión de facturas por proyecto</Typography>

          {/* selector proyecto */}
          <Card sx={{ mb: 3, border: "1px solid", borderColor: "divider" }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={700} mb={1.5} display="flex" alignItems="center" gap={1}>
                <DocIcon sx={{ color: brand.purple }} /> Seleccionar Proyecto
              </Typography>
              <FormControl fullWidth size="small">
                <Select value={selProject} displayEmpty onChange={(e) => setSelProject(e.target.value)}>
                  <MenuItem value="">Todos los proyectos</MenuItem>
                  {projects.map((p) => (
                    <MenuItem key={p.id} value={String(p.id)}>
                      {p.name} {budgets.filter((b) => String(b.id) === String(p.id)).length > 0
                        ? ` · ${fmtMoney(budgets.find((b) => String(b.id) === String(p.id))?.total_amount || 0)}`
                        : ""}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </CardContent>
          </Card>

          {/* cards facturación */}
          <Grid container spacing={2} mb={3}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ border: "1px solid", borderColor: "divider" }}><CardContent>
                <Typography variant="caption" color="text.secondary">Total Facturado</Typography>
                <Typography variant="h5" fontWeight={700}>{fmtMoney(totalInvoiced)}</Typography>
                <Typography variant="caption" color="text.secondary">Todos los proyectos</Typography>
              </CardContent></Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ border: "1px solid", borderColor: "divider" }}><CardContent>
                <Typography variant="caption" color="text.secondary">% Facturas Pagadas</Typography>
                <Typography variant="h5" fontWeight={700} color="#10b981">{paidPct}%</Typography>
                <Box mt={.5}><LinearProgress variant="determinate" value={Number(paidPct)} sx={{ height: 6, borderRadius: 3, bgcolor: "#e5e7eb", "& .MuiLinearProgress-bar": { bgcolor: "#06b6d4" } }} /></Box>
              </CardContent></Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ border: "1px solid", borderColor: "divider" }}><CardContent>
                <Typography variant="caption" color="text.secondary">Días Promedio Pago</Typography>
                <Typography variant="h5" fontWeight={700} color="#f59e0b">15 <Typography component="span" variant="body2" color="text.secondary">días</Typography></Typography>
                <Typography variant="caption" color="text.secondary">Tiempo promedio de cobro</Typography>
              </CardContent></Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ border: "1px solid", borderColor: "divider" }}><CardContent>
                <Typography variant="caption" color="text.secondary">Facturas Vencidas</Typography>
                <Typography variant="h5" fontWeight={700} color="#ef4444">{overdueInv}</Typography>
                <Typography variant="caption" color="text.secondary">Requieren atención inmediata</Typography>
              </CardContent></Card>
            </Grid>
          </Grid>

          {/* distribución + proyección */}
          <Grid container spacing={2} mb={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: "100%", border: "1px solid", borderColor: "divider" }}><CardContent>
                <Typography variant="subtitle1" fontWeight={700} display="flex" alignItems="center" gap={1} mb={2}>
                  <PieIcon sx={{ color: brand.purple }} /> Distribución por Estado
                </Typography>
                {[
                  { label: "Pagadas", color: "#10b981", count: paidInv },
                  { label: "Pendientes", color: "#f59e0b", count: pendingInv },
                  { label: "Vencidas", color: "#ef4444", count: overdueInv },
                  { label: "Rechazadas", color: "#6b7280", count: rejectedInv },
                ].map((r) => (
                  <Box key={r.label} display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: r.color }} />
                      <Typography variant="body2" fontWeight={500}>{r.label}</Typography>
                    </Box>
                    <Chip label={r.count} size="small" sx={{ bgcolor: `${r.color}15`, color: r.color, fontWeight: 700, minWidth: 32 }} />
                  </Box>
                ))}
              </CardContent></Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: "100%", border: "1px solid", borderColor: "divider" }}><CardContent>
                <Typography variant="subtitle1" fontWeight={700} display="flex" alignItems="center" gap={1} mb={2}>
                  <TrendIcon sx={{ color: "#06b6d4" }} /> Proyección Próximos 30 Días
                </Typography>
                <Typography variant="caption" color="text.secondary">Ingresos esperados</Typography>
                <Typography variant="h4" fontWeight={800} color="#06b6d4" mb={2}>{fmtMoney(0)}</Typography>
                <Box display="flex" justifyContent="space-between" mb={.5}>
                  <Typography variant="body2" color="text.secondary">Pendiente de cobro</Typography>
                  <Typography variant="body2" fontWeight={600}>{fmtMoney(projInvoices.filter((i) => i.status === "pending" || i.status === "pendiente").reduce((s, i) => s + i.amount, 0))}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Total pagado</Typography>
                  <Typography variant="body2" fontWeight={600}>{fmtMoney(projInvoices.filter((i) => i.status === "paid" || i.status === "pagada").reduce((s, i) => s + i.amount, 0))}</Typography>
                </Box>
              </CardContent></Card>
            </Grid>
          </Grid>

          {/* lista facturas */}
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openInvoiceCreate}
              sx={{ bgcolor: brand.purple, "&:hover": { bgcolor: brand.purpleDark }, textTransform: "none", fontWeight: 600, borderRadius: 2 }}>
              Nueva Factura
            </Button>
            <Button variant="outlined" startIcon={<FilterIcon />} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>Filtros</Button>
          </Box>

          <Card sx={{ border: "1px solid", borderColor: "divider" }}>
            {projInvoices.length === 0 ? (
              <CardContent sx={{ textAlign: "center", py: 6 }}>
                <DocIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
                <Typography variant="h6" fontWeight={700}>No hay facturas registradas</Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>Comenzar creando la primera factura para este proyecto.</Typography>
                <Button variant="contained" onClick={openInvoiceCreate}
                  sx={{ bgcolor: brand.purple, "&:hover": { bgcolor: brand.purpleDark }, textTransform: "none", fontWeight: 600, borderRadius: 2 }}>
                  Crear Primera Factura
                </Button>
              </CardContent>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead><TableRow sx={{ bgcolor: "#fafafa" }}>
                    <TableCell sx={{ fontWeight: 700 }}>Factura</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Proveedor/Cliente</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Monto</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Emisión</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Vencimiento</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Acciones</TableCell>
                  </TableRow></TableHead>
                  <TableBody>
                    {projInvoices.map((inv) => (
                      <TableRow key={inv.id} hover>
                        <TableCell><Typography variant="body2" fontWeight={700}>{inv.invoice_number}</Typography></TableCell>
                        <TableCell>{inv.vendor}</TableCell>
                        <TableCell><Typography variant="body2" fontWeight={700} color="#10b981">{fmtMoney(inv.amount)}</Typography></TableCell>
                        <TableCell>{fmtDate(inv.issue_date)}</TableCell>
                        <TableCell>{fmtDate(inv.due_date)}</TableCell>
                        <TableCell>
                          <FormControl size="small" sx={{ minWidth: 120 }}>
                            <Select value={inv.status} onChange={(e) => handleInvoiceStatus(inv, e.target.value)}
                              sx={{ fontWeight: 600, fontSize: 13, "& .MuiSelect-select": { py: .5 } }}>
                              <MenuItem value="pending">Pendiente</MenuItem>
                              <MenuItem value="paid">Pagada</MenuItem>
                              <MenuItem value="overdue">Vencida</MenuItem>
                              <MenuItem value="rejected">Rechazada</MenuItem>
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Eliminar"><IconButton size="small" onClick={() => setDelInvoice(inv)} color="error"><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
        </Box>
      )}

      {/* ════════════ TAB 3: REPORTES ════════════ */}
      {mainTab === 3 && (
        <Box>
          <Typography variant="h5" fontWeight={800} mb={3}>Reportes Financieros</Typography>
          <Grid container spacing={2}>
            {[
              { title: "Reporte de Presupuestos", desc: "Estado de ejecución de todos los presupuestos activos", icon: <MoneyIcon /> },
              { title: "Reporte de Nómina", desc: "Resumen de pagos de nómina por periodo", icon: <PeopleIcon /> },
              { title: "Reporte de Facturación", desc: "Estado de facturas emitidas y recibidas", icon: <InvoiceIcon /> },
              { title: "Reporte General", desc: "Consolidado financiero de la organización", icon: <ReportIcon /> },
            ].map((r) => (
              <Grid size={{ xs: 12, sm: 6 }} key={r.title}>
                <Card sx={{ border: "1px solid", borderColor: "divider", "&:hover": { borderColor: brand.purple }, cursor: "pointer" }}>
                  <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Avatar sx={{ bgcolor: `${brand.purple}12`, color: brand.purple, width: 48, height: 48 }}>{r.icon}</Avatar>
                    <Box flex={1}>
                      <Typography variant="subtitle1" fontWeight={700}>{r.title}</Typography>
                      <Typography variant="body2" color="text.secondary">{r.desc}</Typography>
                    </Box>
                    <Box display="flex" gap={.5}>
                      <Tooltip title="PDF"><IconButton size="small"><DownloadIcon fontSize="small" /></IconButton></Tooltip>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* ════════════ DIALOGS ════════════ */}

      {/* Dialog crear/editar presupuesto */}
      <Dialog open={budgetDlg} onClose={() => setBudgetDlg(false)} TransitionProps={{ onExited }} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6" fontWeight={700}>{editBudget ? "Editar" : "Nuevo"} Presupuesto</Typography>
          <IconButton onClick={() => setBudgetDlg(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          {bErr && <Alert severity="error" sx={{ mb: 2 }}>{bErr}</Alert>}
          <Grid container spacing={2} mt={0}>
            <Grid size={12}><TextField label="Nombre del presupuesto *" value={bForm.name} onChange={(e) => setBForm({ ...bForm, name: e.target.value })} fullWidth size="small" /></Grid>
            <Grid size={12}><CurrencyInput label="Monto total *" value={bForm.total_amount} onChange={(v) => setBForm({ ...bForm, total_amount: v })} /></Grid>
            <Grid size={6}><TextField label="Fecha inicio" type="date" value={bForm.start_date} onChange={(e) => setBForm({ ...bForm, start_date: e.target.value })} fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} /></Grid>
            <Grid size={6}><TextField label="Fecha fin" type="date" value={bForm.end_date} onChange={(e) => setBForm({ ...bForm, end_date: e.target.value })} fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} /></Grid>
            <Grid size={12}>
              <FormControl fullWidth size="small"><InputLabel>Área</InputLabel>
                <Select value={bForm.area} label="Área" onChange={(e) => setBForm({ ...bForm, area: e.target.value })}>
                  <MenuItem value="">Seleccionar</MenuItem>
                  <MenuItem value="tech">Tecnología</MenuItem>
                  <MenuItem value="ops">Operaciones</MenuItem>
                  <MenuItem value="admin">Administración</MenuItem>
                  <MenuItem value="rrhh">Recursos Humanos</MenuItem>
                  <MenuItem value="ventas">Ventas</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={12}><TextField label="Descripción (opcional)" value={bForm.description} onChange={(e) => setBForm({ ...bForm, description: e.target.value })} fullWidth size="small" multiline rows={2} /></Grid>
            <Grid size={6}><TextField label="% Ejecución" type="number" value={bForm.execution_pct} onChange={(e) => setBForm({ ...bForm, execution_pct: e.target.value })} fullWidth size="small" /></Grid>
            <Grid size={6}><TextField label="% Garantía" type="number" value={bForm.warranty_pct} onChange={(e) => setBForm({ ...bForm, warranty_pct: e.target.value })} fullWidth size="small" /></Grid>
            <Grid size={12}><CurrencyInput label="Reservas financieras" value={bForm.reserves} onChange={(v) => setBForm({ ...bForm, reserves: v })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBudgetDlg(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveBudget} disabled={bSaving}
            sx={{ bgcolor: brand.purple, "&:hover": { bgcolor: brand.purpleDark }, textTransform: "none", fontWeight: 600, borderRadius: 2 }}>
            {bSaving ? <CircularProgress size={20} /> : editBudget ? "Guardar" : "Crear Presupuesto"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog crear factura */}
      <Dialog open={invDlg} onClose={() => setInvDlg(false)} TransitionProps={{ onExited }} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6" fontWeight={700}>Nueva Factura</Typography>
          <IconButton onClick={() => setInvDlg(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          {iErr && <Alert severity="error" sx={{ mb: 2 }}>{iErr}</Alert>}
          <Grid container spacing={2} mt={0}>
            <Grid size={12}><TextField label="Nombre de factura *" value={iForm.name} onChange={(e) => setIForm({ ...iForm, name: e.target.value })} fullWidth size="small" /></Grid>
            <Grid size={6}>
              <FormControl fullWidth size="small"><InputLabel>Tipo</InputLabel>
                <Select value={iForm.type} label="Tipo" onChange={(e) => setIForm({ ...iForm, type: e.target.value })}>
                  <MenuItem value="ingreso">Ingreso</MenuItem>
                  <MenuItem value="egreso">Egreso</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={6}><TextField label="Cliente o Proveedor" value={iForm.vendor} onChange={(e) => setIForm({ ...iForm, vendor: e.target.value })} fullWidth size="small" /></Grid>
            <Grid size={12}><TextField label="Concepto" value={iForm.concept} onChange={(e) => setIForm({ ...iForm, concept: e.target.value })} fullWidth size="small" /></Grid>
            <Grid size={6}><CurrencyInput label="Valor subtotal" value={iForm.subtotal} onChange={(v) => setIForm({ ...iForm, subtotal: v })} /></Grid>
            <Grid size={6}><CurrencyInput label="Total" value={iForm.total} onChange={(v) => setIForm({ ...iForm, total: v })} /></Grid>
            <Grid size={6}><TextField label="Fecha emisión" type="date" value={iForm.issue_date} onChange={(e) => setIForm({ ...iForm, issue_date: e.target.value })} fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} /></Grid>
            <Grid size={6}><TextField label="Fecha vencimiento" type="date" value={iForm.due_date} onChange={(e) => setIForm({ ...iForm, due_date: e.target.value })} fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} /></Grid>
            <Grid size={12}>
              <FormControl fullWidth size="small"><InputLabel>Medio de pago</InputLabel>
                <Select value={iForm.payment_method} label="Medio de pago" onChange={(e) => setIForm({ ...iForm, payment_method: e.target.value })}>
                  <MenuItem value="">Seleccionar</MenuItem>
                  <MenuItem value="transferencia">Transferencia</MenuItem>
                  <MenuItem value="efectivo">Efectivo</MenuItem>
                  <MenuItem value="tarjeta">Tarjeta</MenuItem>
                  <MenuItem value="cheque">Cheque</MenuItem>
                  <MenuItem value="pse">PSE</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={12}>
              <Typography variant="body2" fontWeight={600} mb={1}>Soporte (Opcional)</Typography>
              <Box sx={{ border: "2px dashed", borderColor: "divider", borderRadius: 2, p: 3, textAlign: "center", cursor: "pointer", "&:hover": { borderColor: brand.purple } }}>
                <UploadIcon sx={{ fontSize: 32, color: "text.secondary", mb: .5 }} />
                <Typography variant="body2" color={brand.purple} fontWeight={600}>Subir soporte</Typography>
                <Typography variant="caption" color="text.secondary">PDF, JPG, PNG hasta 10MB</Typography>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setInvDlg(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveInvoice} disabled={iSaving}
            sx={{ bgcolor: brand.purple, "&:hover": { bgcolor: brand.purpleDark }, textTransform: "none", fontWeight: 600, borderRadius: 2 }}>
            {iSaving ? <CircularProgress size={20} /> : "Crear Factura"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog eliminar presupuesto */}
      <Dialog open={Boolean(delBudget)} onClose={() => setDelBudget(null)} TransitionProps={{ onExited }} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>¿Eliminar presupuesto?</DialogTitle>
        <DialogContent><Typography variant="body2" color="text.secondary">Se eliminará <strong>{delBudget?.name}</strong> de forma permanente.</Typography></DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDelBudget(null)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDeleteBudget} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>Eliminar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog eliminar factura */}
      <Dialog open={Boolean(delInvoice)} onClose={() => setDelInvoice(null)} TransitionProps={{ onExited }} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>¿Eliminar factura?</DialogTitle>
        <DialogContent><Typography variant="body2" color="text.secondary">Se eliminará la factura <strong>{delInvoice?.invoice_number}</strong> de forma permanente.</Typography></DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDelInvoice(null)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDeleteInvoice} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
