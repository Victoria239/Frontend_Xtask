/* Página de Empleados — listado, filtros, CRUD con formulario de 3 tabs */

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Menu,
  MenuItem as MuiMenuItem,
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
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  MoreVert as MoreIcon,
  People as PeopleIcon,
  PersonAdd as ActiveIcon,
  Work as WorkIcon,
  AttachMoney as SalaryIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  Payments as PaymentsIcon,
  Description as ContractIcon,
  CloudUpload as UploadIcon,
} from "@mui/icons-material";
import { employeesApi, projectsApi, authApi } from "../../api";
import { useAuth } from "../../context/AuthContext";
import type { Employee, EmployeeCreate, Project } from "../../types";
import { brand } from "../../theme";
import CurrencyInput from "../../components/CurrencyInput";

/* Formato de moneda */
function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("es-CO", { minimumFractionDigits: 0 })}`;
}

/* Estado del contrato */
const contractStatusConfig: Record<string, { label: string; color: "success" | "warning" | "error" | "default" }> = {
  active: { label: "Activo", color: "success" },
  inactive: { label: "Inactivo", color: "error" },
  on_leave: { label: "Licencia", color: "warning" },
  terminated: { label: "Terminado", color: "default" },
};

/* Departamentos */
const departments = [
  "Engineering", "IT", "Ventas", "Marketing",
  "Finanzas", "Recursos Humanos", "Operaciones", "Diseño",
];

/* Métodos de pago */
const paymentMethods = ["Transferencia Bancaria", "Cheque", "Efectivo", "Nequi", "Daviplata"];

/* Frecuencias de pago */
const payFrequencies = ["Mensual", "Quincenal", "Semanal"];

/* Tipos de contrato */
const contractTypes = [
  "Contrato a término indefinido",
  "Contrato a término fijo",
  "Contrato de prestación de servicios",
  "Contrato de aprendizaje",
];

/* ─── Interfaz para datos extendidos del formulario (tabs 1, 2, 3) ─── */
interface EmployeeFormData {
  /* Tab 1: Info Personal */
  first_name: string;
  last_name: string;
  identification: string;
  phone: string;
  email: string;
  address: string;
  emergency_contact: string;
  department: string;
  position: string;
  hire_date: string;
  contract_status: string;
  contract_type: string;
  /* Tab 2: Datos de Nómina */
  salary: number;
  bonus: number;
  tax_rate: number;
  deduction_base: number;
  benefits_base: number;
  payment_method: string;
  bank_account: string;
  health_insurance: string;
  vacation_days: number;
  pay_frequency: string;
  payroll_start_date: string;
  /* Tab 3: Proyecto y Contrato */
  project_id: number | "";
  /* Cuenta de acceso */
  auth_email: string;
  auth_password: string;
  auth_role: "manager" | "user";
}

const emptyForm: EmployeeFormData = {
  first_name: "",
  last_name: "",
  identification: "",
  phone: "",
  email: "",
  address: "",
  emergency_contact: "",
  department: "",
  position: "",
  hire_date: new Date().toISOString().split("T")[0],
  contract_status: "active",
  contract_type: "Contrato a término indefinido",
  salary: 0,
  bonus: 0,
  tax_rate: 0.19,
  deduction_base: 0,
  benefits_base: 0,
  payment_method: "Transferencia Bancaria",
  bank_account: "",
  health_insurance: "",
  vacation_days: 15,
  pay_frequency: "Mensual",
  payroll_start_date: "",
  project_id: "",
  auth_email: "",
  auth_password: "",
  auth_role: "user" as const,
};

export default function EmployeesPage() {
  const { user } = useAuth();
  /* Estado principal */
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterTab, setFilterTab] = useState(0);

  /* Dialog */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmployeeFormData>({ ...emptyForm });
  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  /* Menú */
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuEmployee, setMenuEmployee] = useState<Employee | null>(null);

  /* Eliminar */
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  /* Ref para refetch pendiente tras cerrar dialog */
  const pendingRefetch = useRef(false);
  const handleDialogExited = () => {
    if (pendingRefetch.current) {
      pendingRefetch.current = false;
      fetchData();
    }
  };

  /* Cargar datos */
  const fetchData = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const [empRes, projRes] = await Promise.allSettled([
        employeesApi.getEmployees({ pageSize: 100 }),
        projectsApi.getProjects({ pageSize: 100 }),
      ]);
      if (empRes.status === "fulfilled") setEmployees(empRes.value.data);
      if (projRes.status === "fulfilled") setProjects(projRes.value.data);
    } catch {
      setError("Error al cargar empleados");
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(true); }, [fetchData]);

  /* Indicadores */
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.contract_status === "active").length;
  const totalSalary = employees.reduce((sum, e) => sum + (e.salary || 0), 0);
  const avgSalary = totalEmployees > 0 ? totalSalary / totalEmployees : 0;

  const summaryCards = [
    { title: "Total Empleados", value: totalEmployees, subtitle: "Registrados en el sistema", icon: <PeopleIcon />, iconColor: brand.purple },
    { title: "Empleados Activos", value: activeEmployees, subtitle: "Con contrato vigente", icon: <ActiveIcon />, iconColor: "#10b981" },
    { title: "Nómina Total", value: formatCurrency(totalSalary), subtitle: "Salario base mensual", icon: <SalaryIcon />, iconColor: "#f59e0b" },
    { title: "Salario Promedio", value: formatCurrency(Math.round(avgSalary)), subtitle: "Por empleado", icon: <WorkIcon />, iconColor: "#3b82f6" },
  ];

  /* Filtrar empleados */
  const filterStatuses = ["all", "active", "inactive"];
  const filteredEmployees = filterTab === 0
    ? employees
    : employees.filter((e) => e.contract_status === filterStatuses[filterTab]);

  /* Abrir crear */
  const handleCreate = () => {
    setEditingEmployee(null);
    setForm({ ...emptyForm });
    setActiveTab(0);
    setFormError("");
    setDialogOpen(true);
  };

  /* Abrir editar */
  const handleEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setForm({
      ...emptyForm,
      first_name: emp.first_name,
      last_name: emp.last_name,
      department: emp.department || "",
      position: emp.position || "",
      contract_status: emp.contract_status || "active",
      salary: emp.salary || 0,
    });
    setActiveTab(0);
    setFormError("");
    setDialogOpen(true);
    handleCloseMenu();
  };

  /* Guardar */
  const handleSave = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setFormError("Nombre y Apellido son obligatorios");
      return;
    }
    if (!form.department) {
      setFormError("El departamento es obligatorio");
      return;
    }
    if (!form.position.trim()) {
      setFormError("El cargo es obligatorio");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      if (editingEmployee) {
        const updatePayload: Record<string, unknown> = {
          first_name: form.first_name,
          last_name: form.last_name,
          position: form.position || undefined,
          department: form.department || undefined,
          salary: form.salary || undefined,
          contract_status: form.contract_status,
        };
        await employeesApi.updateEmployee(editingEmployee.id, updatePayload);
      } else {
        /* Registrar cuenta de acceso si se proporcionó email y contraseña */
        let userId = user?.id ?? 1;
        if (form.auth_email && form.auth_password) {
          try {
            const regRes = await authApi.register({
              username: form.auth_email.split("@")[0],
              email: form.auth_email,
              password: form.auth_password,
              fullName: `${form.first_name} ${form.last_name}`,
              role: form.auth_role || "user",
            });
            userId = regRes.user.id;
          } catch (regErr: unknown) {
            console.error("Error al registrar usuario:", regErr);
            setFormError("Error al crear la cuenta de acceso. Verifique que el correo no esté en uso.");
            setSaving(false);
            return;
          }
        }

        const createPayload: EmployeeCreate = {
          user_id: userId,
          first_name: form.first_name,
          last_name: form.last_name,
          position: form.position || "Sin asignar",
          department: form.department || "Sin asignar",
          salary: form.salary || 0,
          contract_status: form.contract_status || "active",
        };
        const newEmp = await employeesApi.createEmployee(createPayload);

        /* Asignar proyecto si se seleccionó */
        if (form.project_id && typeof form.project_id === "number") {
          await employeesApi.assignProjects(newEmp.id, [form.project_id]);
        }
      }
      pendingRefetch.current = true;
      setDialogOpen(false);
    } catch (err: unknown) {
      console.error("Error al guardar empleado:", err);
      const axErr = err as { response?: { data?: { error?: string; detail?: string | { msg?: string }[] } } };
      const detail = axErr.response?.data?.detail;
      const backendMsg = axErr.response?.data?.error
        || (typeof detail === "string" ? detail : Array.isArray(detail) ? detail.map(d => d.msg).join(", ") : "")
        || "Revise los campos e intente de nuevo.";
      setFormError(`Error al guardar el empleado: ${backendMsg}`);
    } finally {
      setSaving(false);
    }
  };

  /* Eliminar */
  const handleDelete = (emp: Employee) => {
    handleCloseMenu();
    setDeleteTarget(emp);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await employeesApi.deleteEmployee(deleteTarget.id);
      pendingRefetch.current = true;
      setDeleteTarget(null);
    } catch {
      setError("Error al eliminar el empleado");
    }
  };

  /* Menú */
  const handleOpenMenu = (e: React.MouseEvent<HTMLElement>, emp: Employee) => {
    setAnchorEl(e.currentTarget);
    setMenuEmployee(emp);
  };
  const handleCloseMenu = () => {
    setAnchorEl(null);
    setMenuEmployee(null);
  };

  /* Actualizar campo del form */
  const updateForm = (field: keyof EmployeeFormData, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress sx={{ color: brand.purple }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Cabecera */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Empleados</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Gestión del talento humano de tu empresa
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
          sx={{
            bgcolor: brand.purple,
            "&:hover": { bgcolor: brand.purpleDark },
            textTransform: "none",
            fontWeight: 600,
            borderRadius: 2,
            px: 3,
          }}
        >
          Nuevo Empleado
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>{error}</Alert>}

      {/* Cards de resumen */}
      <Grid container spacing={2.5} mb={4}>
        {summaryCards.map((card) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={card.title}>
            <Card sx={{ height: "100%", border: "1px solid", borderColor: "divider", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={500}>{card.title}</Typography>
                    <Typography variant="h4" fontWeight={700} mt={0.5}>{card.value}</Typography>
                    <Typography variant="caption" color="text.secondary" mt={0.5} display="block">{card.subtitle}</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: `${card.iconColor}12`, color: card.iconColor, width: 44, height: 44 }}>{card.icon}</Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs filtro */}
      <Tabs
        value={filterTab}
        onChange={(_, v) => setFilterTab(v)}
        sx={{
          mb: 3,
          "& .MuiTab-root": { textTransform: "none", fontWeight: 600 },
          "& .Mui-selected": { color: brand.purple },
          "& .MuiTabs-indicator": { bgcolor: brand.purple },
        }}
      >
        <Tab label="Todos los Empleados" />
        <Tab label="Activos" />
        <Tab label="Inactivos" />
      </Tabs>

      {/* Tabla */}
      <Card sx={{ border: "1px solid", borderColor: "divider", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "#fafafa" }}>
                <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>Empleado</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>Departamento</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>Cargo</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>Salario Base</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>Estado</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "text.secondary" }} align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: "text.secondary" }}>
                    No hay empleados {filterTab === 1 ? "activos" : filterTab === 2 ? "inactivos" : ""}
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((emp) => {
                  const config = contractStatusConfig[emp.contract_status] || { label: emp.contract_status, color: "default" as const };
                  return (
                    <TableRow key={emp.id} hover sx={{ "&:last-child td": { border: 0 } }}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1.5}>
                          <Avatar sx={{ bgcolor: `${brand.purple}15`, color: brand.purple, width: 36, height: 36 }}>
                            {emp.first_name[0]}{emp.last_name[0]}
                          </Avatar>
                          <Box>
                            <Typography fontWeight={600} variant="body2">{emp.first_name} {emp.last_name}</Typography>
                            <Typography variant="caption" color="text.secondary">ID: {emp.id}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell><Typography variant="body2">{emp.department || "—"}</Typography></TableCell>
                      <TableCell><Typography variant="body2">{emp.position || "—"}</Typography></TableCell>
                      <TableCell><Typography variant="body2" fontWeight={600}>{formatCurrency(emp.salary)}</Typography></TableCell>
                      <TableCell>
                        <Chip label={config.label} color={config.color} size="small" variant="outlined" sx={{ fontWeight: 600, borderRadius: 1.5 }} />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Opciones">
                          <IconButton size="small" onClick={(e) => handleOpenMenu(e, emp)}><MoreIcon /></IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Menú acciones */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleCloseMenu} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}>
        <MuiMenuItem onClick={() => menuEmployee && handleEdit(menuEmployee)}>Editar</MuiMenuItem>
        <MuiMenuItem onClick={() => menuEmployee && handleDelete(menuEmployee)} sx={{ color: "error.main" }}>Eliminar</MuiMenuItem>
      </Menu>

      {/* ─── Dialog crear/editar empleado con 3 tabs ─── */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        TransitionProps={{ onExited: handleDialogExited }}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {editingEmployee ? "Editar Empleado" : "Nuevo Empleado"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Complete la información del {editingEmployee ? "empleado" : "nuevo empleado en el sistema de nómina"}.
            </Typography>
          </Box>
          <IconButton onClick={() => setDialogOpen(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>

        {/* Tabs del formulario */}
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="fullWidth"
          sx={{
            mx: 3,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            "& .MuiTab-root": { textTransform: "none", fontWeight: 600, minHeight: 48 },
            "& .Mui-selected": { color: brand.purple },
            "& .MuiTabs-indicator": { bgcolor: brand.purple },
          }}
        >
          <Tab icon={<PersonIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Información Personal" />
          <Tab icon={<PaymentsIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Datos de Nómina" />
          <Tab icon={<ContractIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Proyecto y Contrato" />
        </Tabs>

        <DialogContent sx={{ pt: 3, minHeight: 400 }}>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}

          {/* ── Tab 1: Información Personal ── */}
          {activeTab === 0 && (
            <Box>
              <Typography variant="h6" fontWeight={700} mb={0.5}>Información Personal</Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>Datos básicos del empleado</Typography>

              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Nombre *" value={form.first_name} onChange={(e) => updateForm("first_name", e.target.value)} fullWidth size="small" placeholder="Nombre del empleado" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Apellido *" value={form.last_name} onChange={(e) => updateForm("last_name", e.target.value)} fullWidth size="small" placeholder="Apellido del empleado" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Identificación *" value={form.identification} onChange={(e) => updateForm("identification", e.target.value)} fullWidth size="small" placeholder="Número de identificación" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Teléfono" value={form.phone} onChange={(e) => updateForm("phone", e.target.value)} fullWidth size="small" placeholder="+57 300 123 4567" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Correo Electrónico" value={form.email} onChange={(e) => updateForm("email", e.target.value)} fullWidth size="small" placeholder="ejemplo@empresa.com" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>{/* spacer */}</Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField label="Dirección" value={form.address} onChange={(e) => updateForm("address", e.target.value)} fullWidth size="small" placeholder="Dirección de residencia" />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField label="Contacto de Emergencia" value={form.emergency_contact} onChange={(e) => updateForm("emergency_contact", e.target.value)} fullWidth size="small" placeholder="Nombre y teléfono de contacto" />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Departamento *</InputLabel>
                    <Select value={form.department} label="Departamento *" onChange={(e) => updateForm("department", e.target.value)}>
                      {departments.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField label="Cargo *" value={form.position} onChange={(e) => updateForm("position", e.target.value)} fullWidth size="small" placeholder="Cargo o posición" />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>{/* spacer for alignment */}</Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField label="Fecha de Ingreso *" type="date" value={form.hire_date} onChange={(e) => updateForm("hire_date", e.target.value)} fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Estado del Contrato</InputLabel>
                    <Select value={form.contract_status} label="Estado del Contrato" onChange={(e) => updateForm("contract_status", e.target.value)}>
                      <MenuItem value="active">Activo</MenuItem>
                      <MenuItem value="inactive">Inactivo</MenuItem>
                      <MenuItem value="on_leave">Licencia</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Tipo de Contrato</InputLabel>
                    <Select value={form.contract_type} label="Tipo de Contrato" onChange={(e) => updateForm("contract_type", e.target.value)}>
                      {contractTypes.map((ct) => <MenuItem key={ct} value={ct}>{ct}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {/* Cuenta de acceso — solo al crear */}
              {!editingEmployee && (
                <Box mt={4}>
                  <Typography variant="h6" fontWeight={700} mb={0.5}>Cuenta de Acceso</Typography>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    Registre un correo y contraseña para que el empleado pueda iniciar sesión en la plataforma.
                  </Typography>
                  <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField label="Correo de acceso" type="email" value={form.auth_email} onChange={(e) => updateForm("auth_email", e.target.value)} fullWidth size="small" placeholder="empleado@empresa.com" />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField label="Contraseña" type="password" value={form.auth_password} onChange={(e) => updateForm("auth_password", e.target.value)} fullWidth size="small" placeholder="Mínimo 6 caracteres" />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Rol en el sistema</InputLabel>
                        <Select value={form.auth_role} label="Rol en el sistema" onChange={(e) => updateForm("auth_role", e.target.value)}>
                          <MenuItem value="user">Usuario</MenuItem>
                          <MenuItem value="manager">Manager</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </Box>
          )}

          {/* ── Tab 2: Datos de Nómina ── */}
          {activeTab === 1 && (
            <Box>
              <Typography variant="h6" fontWeight={700} mb={0.5}>Datos de Nómina</Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>Configuración salarial y beneficios</Typography>

              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <CurrencyInput label="Sueldo Base *" value={form.salary} onChange={(v) => updateForm("salary", v)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <CurrencyInput label="Bonificación" value={form.bonus} onChange={(v) => updateForm("bonus", v)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField label="Tasa de Impuestos" type="number" value={form.tax_rate} onChange={(e) => updateForm("tax_rate", Number(e.target.value) || 0)} fullWidth size="small" slotProps={{ input: { inputProps: { min: 0, max: 1, step: 0.01 } } }} />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <CurrencyInput label="Base Deducción" value={form.deduction_base} onChange={(v) => updateForm("deduction_base", v)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <CurrencyInput label="Beneficios Base" value={form.benefits_base} onChange={(v) => updateForm("benefits_base", v)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Método de Pago</InputLabel>
                    <Select value={form.payment_method} label="Método de Pago" onChange={(e) => updateForm("payment_method", e.target.value)}>
                      {paymentMethods.map((pm) => <MenuItem key={pm} value={pm}>{pm}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Cuenta Bancaria" value={form.bank_account} onChange={(e) => updateForm("bank_account", e.target.value)} fullWidth size="small" placeholder="Número de cuenta" />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField label="Seguro de Salud" value={form.health_insurance} onChange={(e) => updateForm("health_insurance", e.target.value)} fullWidth size="small" placeholder="EPS/Seguro médico" />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField label="Días de Vacaciones" type="number" value={form.vacation_days} onChange={(e) => updateForm("vacation_days", Number(e.target.value) || 0)} fullWidth size="small" />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Frecuencia de Pago</InputLabel>
                    <Select value={form.pay_frequency} label="Frecuencia de Pago" onChange={(e) => updateForm("pay_frequency", e.target.value)}>
                      {payFrequencies.map((pf) => <MenuItem key={pf} value={pf}>{pf}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField label="Fecha de Inicio en Nómina *" type="date" value={form.payroll_start_date} onChange={(e) => updateForm("payroll_start_date", e.target.value)} fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} />
                </Grid>
              </Grid>
            </Box>
          )}

          {/* ── Tab 3: Proyecto y Contrato ── */}
          {activeTab === 2 && (
            <Box>
              <Typography variant="h6" fontWeight={700} mb={0.5}>Proyecto y Contrato</Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>Asignación de proyecto y documentación</Typography>

              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Proyecto Asignado *</InputLabel>
                    <Select value={form.project_id} label="Proyecto Asignado *" onChange={(e) => updateForm("project_id", e.target.value)}>
                      <MenuItem value="">Sin asignar</MenuItem>
                      {projects.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="body2" fontWeight={600} mb={1}>Contrato (Opcional)</Typography>
                  <Box
                    sx={{
                      border: "2px dashed",
                      borderColor: "divider",
                      borderRadius: 2,
                      p: 4,
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "border-color 0.2s",
                      "&:hover": { borderColor: brand.purple },
                    }}
                  >
                    <UploadIcon sx={{ fontSize: 40, color: "text.secondary", mb: 1 }} />
                    <Typography variant="body2" color={brand.purple} fontWeight={600}>
                      Subir contrato
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      PDF, DOC, DOCX hasta 5MB
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
          <Box>
            {activeTab > 0 && (
              <Button onClick={() => setActiveTab(activeTab - 1)} sx={{ textTransform: "none" }}>
                Anterior
              </Button>
            )}
          </Box>
          <Box display="flex" gap={1}>
            {activeTab < 2 ? (
              <Button
                variant="contained"
                onClick={() => setActiveTab(activeTab + 1)}
                sx={{
                  bgcolor: brand.purple,
                  "&:hover": { bgcolor: brand.purpleDark },
                  textTransform: "none",
                  fontWeight: 600,
                  borderRadius: 2,
                  px: 3,
                }}
              >
                Siguiente
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving}
                sx={{
                  bgcolor: brand.purple,
                  "&:hover": { bgcolor: brand.purpleDark },
                  textTransform: "none",
                  fontWeight: 600,
                  borderRadius: 2,
                  px: 3,
                }}
              >
                {saving ? <CircularProgress size={20} /> : editingEmployee ? "Guardar cambios" : "Crear Empleado"}
              </Button>
            )}
            <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: "none" }}>
              Cancelar
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Dialog confirmar eliminación */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} TransitionProps={{ onExited: handleDialogExited }} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>¿Eliminar empleado?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Esta acción eliminará al empleado <strong>"{deleteTarget?.first_name} {deleteTarget?.last_name}"</strong> de forma permanente.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={confirmDelete} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
