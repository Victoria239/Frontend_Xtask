/* Página de Proyectos — listado, filtros, CRUD completo */

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
  Folder as ProjectsIcon,
  TrendingUp as ActiveIcon,
  CheckCircle as CompletedIcon,
  AccountBalance as BudgetIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { projectsApi, employeesApi, financeApi } from "../../api";
import type { Project, ProjectCreate, Employee } from "../../types";
import { brand } from "../../theme";

/* Mapeo de estados a colores y labels */
const statusConfig: Record<string, { label: string; color: "success" | "info" | "warning" | "error" | "default" }> = {
  active: { label: "Activo", color: "success" },
  completed: { label: "Completado", color: "info" },
  on_hold: { label: "En pausa", color: "warning" },
  cancelled: { label: "Cancelado", color: "error" },
};

/* Departamentos disponibles */
const departments = [
  "Tecnología", "Ventas", "Marketing", "Finanzas",
  "Recursos Humanos", "Operaciones", "Engineering", "IT",
];

/* Formato de fecha legible */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Sin fecha";
  return new Date(dateStr).toLocaleDateString("es-CO", {
    day: "numeric", month: "short", year: "numeric",
  });
}

/* Formato de moneda */
function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("es-CO", { minimumFractionDigits: 0 })}`;
}

/* Estado vacío del formulario */
const emptyForm: ProjectCreate = {
  name: "",
  description: "",
  status: "active",
  start_date: new Date().toISOString().split("T")[0],
  end_date: "",
  responsible_id: undefined,
};

export default function ProjectsPage() {
  /* Estado principal */
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tabValue, setTabValue] = useState(0);

  /* Indicadores */
  const [indicators, setIndicators] = useState({
    total: 0, activos: 0, completados: 0, enProgreso: 0,
  });

  /* Presupuestos por proyecto */
  const [budgetMap, setBudgetMap] = useState<Record<number, number>>({});

  /* Empleados para el select de responsable */
  const [employees, setEmployees] = useState<Employee[]>([]);

  /* Dialog crear/editar */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form, setForm] = useState<ProjectCreate>({ ...emptyForm });
  const [budgetAmount, setBudgetAmount] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  /* Menú de acciones por fila */
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuProject, setMenuProject] = useState<Project | null>(null);

  /* Ref para refetch pendiente tras cerrar dialog */
  const pendingRefetch = useRef(false);
  const handleDialogExited = () => {
    if (pendingRefetch.current) {
      pendingRefetch.current = false;
      fetchData();
    }
  };

  /* Cargar datos (showSpinner=true solo en carga inicial) */
  const fetchData = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const [projRes, indRes, empRes, budRes] = await Promise.allSettled([
        projectsApi.getProjects({ pageSize: 100 }),
        projectsApi.getProjectIndicators(),
        employeesApi.getEmployees({ pageSize: 100 }),
        financeApi.getBudgets({ pageSize: 100 }),
      ]);

      if (projRes.status === "fulfilled") setProjects(projRes.value.data);
      if (indRes.status === "fulfilled") setIndicators(indRes.value);
      if (empRes.status === "fulfilled") setEmployees(empRes.value.data);

      /* Sumar presupuestos por proyecto */
      if (budRes.status === "fulfilled") {
        const map: Record<number, number> = {};
        budRes.value.data.forEach((b: { project_id: number; total_amount: number }) => {
          map[b.project_id] = (map[b.project_id] || 0) + b.total_amount;
        });
        setBudgetMap(map);
      }
    } catch {
      setError("Error al cargar proyectos");
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(true); }, [fetchData]);

  /* Presupuesto total combinado */
  const totalBudget = Object.values(budgetMap).reduce((sum, v) => sum + v, 0);

  /* Cards de resumen */
  const summaryCards = [
    { title: "Total Proyectos", value: indicators.total, subtitle: "De todos los departamentos", icon: <ProjectsIcon />, iconColor: brand.purple },
    { title: "Proyectos Activos", value: indicators.activos, subtitle: "Actualmente en progreso", icon: <ActiveIcon />, iconColor: "#10b981" },
    { title: "Completados", value: indicators.completados, subtitle: "Finalizados exitosamente", icon: <CompletedIcon />, iconColor: "#3b82f6" },
    { title: "Presupuesto Total", value: formatCurrency(totalBudget), subtitle: "Todos los proyectos combinados", icon: <BudgetIcon />, iconColor: "#f59e0b" },
  ];

  /* Filtrar proyectos por tab */
  const tabFilters = ["all", "active", "completed"];
  const filteredProjects = tabValue === 0
    ? projects
    : projects.filter((p) => p.status === tabFilters[tabValue]);

  /* Abrir dialog para crear */
  const handleCreate = () => {
    setEditingProject(null);
    setForm({ ...emptyForm });
    setBudgetAmount(0);
    setFormError("");
    setDialogOpen(true);
  };

  /* Abrir dialog para editar */
  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setForm({
      name: project.name,
      description: project.description || "",
      status: project.status,
      start_date: project.start_date || "",
      end_date: project.end_date || "",
      responsible_id: project.responsible_id || undefined,
    });
    setBudgetAmount(budgetMap[project.id] || 0);
    setFormError("");
    setDialogOpen(true);
    handleCloseMenu();
  };

  /* Guardar proyecto (crear o editar) */
  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError("El nombre del proyecto es obligatorio");
      return;
    }
    /* start_date obligatoria solo al crear */
    if (!editingProject && !form.start_date) {
      setFormError("La fecha de inicio es obligatoria");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      if (editingProject) {
        /* Editar: solo enviar campos permitidos por ProjectUpdate */
        const updatePayload: Record<string, unknown> = {
          name: form.name,
        };
        if (form.description) updatePayload.description = form.description;
        if (form.start_date) updatePayload.start_date = form.start_date;
        if (form.end_date) updatePayload.end_date = form.end_date;
        if (form.responsible_id) updatePayload.responsible_id = form.responsible_id;

        await projectsApi.updateProject(editingProject.id, updatePayload);

        /* Si el estado cambió, actualizarlo por separado */
        if (form.status && form.status !== editingProject.status) {
          await projectsApi.changeProjectStatus(editingProject.id, form.status);
        }

        /* Si se agregó presupuesto y el proyecto no tenía, crearlo */
        const currentBudget = budgetMap[editingProject.id] || 0;
        if (budgetAmount > 0 && currentBudget === 0) {
          await financeApi.createBudget({
            name: `Presupuesto ${form.name}`,
            total_amount: budgetAmount,
            project_id: editingProject.id,
          });
        }
      } else {
        /* Crear proyecto */
        const createPayload = {
          name: form.name,
          status: form.status || "active",
          start_date: form.start_date || undefined,
          end_date: form.end_date || undefined,
          description: form.description || undefined,
          responsible_id: form.responsible_id || undefined,
        };
        const newProject = await projectsApi.createProject(createPayload);

        /* Si se indicó presupuesto, crearlo asociado al proyecto */
        if (budgetAmount > 0 && newProject?.id) {
          await financeApi.createBudget({
            name: `Presupuesto ${createPayload.name}`,
            total_amount: budgetAmount,
            project_id: newProject.id,
          });
        }
      }
      pendingRefetch.current = true;
      setDialogOpen(false);
    } catch (err) {
      console.error("Error al guardar proyecto:", err);
      setFormError("Error al guardar el proyecto. Revise los campos e intente de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  /* Confirmación de eliminación */
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  /* Eliminar proyecto */
  const handleDelete = (project: Project) => {
    handleCloseMenu();
    setDeleteTarget(project);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await projectsApi.deleteProject(deleteTarget.id);
      pendingRefetch.current = true;
      setDeleteTarget(null);
    } catch {
      setError("Error al eliminar el proyecto");
    }
  };

  /* Cambiar estado */
  const handleStatusChange = async (project: Project, newStatus: string) => {
    handleCloseMenu();
    try {
      await projectsApi.changeProjectStatus(project.id, newStatus);
      fetchData();
    } catch {
      setError("Error al cambiar el estado");
    }
  };

  /* Menú contextual */
  const handleOpenMenu = (e: React.MouseEvent<HTMLElement>, project: Project) => {
    setAnchorEl(e.currentTarget);
    setMenuProject(project);
  };
  const handleCloseMenu = () => {
    setAnchorEl(null);
    setMenuProject(null);
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
          <Typography variant="h4" fontWeight={800}>
            Proyectos
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Administra y supervisa todos los proyectos de tu empresa
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
          Nuevo Proyecto
        </Button>
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Cards de resumen */}
      <Grid container spacing={2.5} mb={4}>
        {summaryCards.map((card) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={card.title}>
            <Card sx={{
              height: "100%",
              border: "1px solid",
              borderColor: "divider",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}>
              <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={500}>
                      {card.title}
                    </Typography>
                    <Typography variant="h4" fontWeight={700} mt={0.5}>
                      {card.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
                      {card.subtitle}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: `${card.iconColor}12`, color: card.iconColor, width: 44, height: 44 }}>
                    {card.icon}
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs de filtro */}
      <Tabs
        value={tabValue}
        onChange={(_, v) => setTabValue(v)}
        sx={{
          mb: 3,
          "& .MuiTab-root": { textTransform: "none", fontWeight: 600 },
          "& .Mui-selected": { color: brand.purple },
          "& .MuiTabs-indicator": { bgcolor: brand.purple },
        }}
      >
        <Tab label="Todos los Proyectos" />
        <Tab label="Activos" />
        <Tab label="Completados" />
      </Tabs>

      {/* Tabla de proyectos */}
      <Card sx={{ border: "1px solid", borderColor: "divider", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "#fafafa" }}>
                <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>Nombre del Proyecto</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>Presupuesto</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>Cronograma</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>Estado</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "text.secondary" }} align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6, color: "text.secondary" }}>
                    No hay proyectos {tabValue === 1 ? "activos" : tabValue === 2 ? "completados" : ""}
                  </TableCell>
                </TableRow>
              ) : (
                filteredProjects.map((project) => {
                  const budget = budgetMap[project.id] || 0;
                  const config = statusConfig[project.status] || { label: project.status, color: "default" as const };
                  return (
                    <TableRow key={project.id} hover sx={{ "&:last-child td": { border: 0 } }}>
                      {/* Nombre */}
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1.5}>
                          <Avatar sx={{ bgcolor: `${brand.purple}15`, color: brand.purple, width: 36, height: 36 }}>
                            <ProjectsIcon fontSize="small" />
                          </Avatar>
                          <Box>
                            <Typography fontWeight={600} variant="body2">
                              {project.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {project.description || "Sin descripción"}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      {/* Presupuesto */}
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {budget > 0 ? formatCurrency(budget) : "—"}
                        </Typography>
                      </TableCell>

                      {/* Cronograma */}
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(project.start_date)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {project.end_date ? `hasta ${formatDate(project.end_date)}` : "Sin fecha límite"}
                        </Typography>
                      </TableCell>

                      {/* Estado */}
                      <TableCell>
                        <Chip
                          label={config.label}
                          color={config.color}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 600, borderRadius: 1.5 }}
                        />
                      </TableCell>

                      {/* Acciones */}
                      <TableCell align="right">
                        <Tooltip title="Opciones">
                          <IconButton size="small" onClick={(e) => handleOpenMenu(e, project)}>
                            <MoreIcon />
                          </IconButton>
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

      {/* Menú contextual de acciones */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MuiMenuItem onClick={() => menuProject && handleEdit(menuProject)}>
          Editar
        </MuiMenuItem>
        {menuProject?.status !== "active" && (
          <MuiMenuItem onClick={() => menuProject && handleStatusChange(menuProject, "active")}>
            Marcar como Activo
          </MuiMenuItem>
        )}
        {menuProject?.status !== "completed" && (
          <MuiMenuItem onClick={() => menuProject && handleStatusChange(menuProject, "completed")}>
            Marcar como Completado
          </MuiMenuItem>
        )}
        {menuProject?.status !== "on_hold" && (
          <MuiMenuItem onClick={() => menuProject && handleStatusChange(menuProject, "on_hold")}>
            Pausar
          </MuiMenuItem>
        )}
        <MuiMenuItem
          onClick={() => menuProject && handleDelete(menuProject)}
          sx={{ color: "error.main" }}
        >
          Eliminar
        </MuiMenuItem>
      </Menu>

      {/* Dialog crear/editar proyecto */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        TransitionProps={{ onExited: handleDialogExited }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {editingProject ? "Editar Proyecto" : "Crear Nuevo Proyecto"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {editingProject
                ? "Modifica los datos del proyecto."
                : "Complete los detalles para el nuevo proyecto. Los campos marcados con * son obligatorios."}
            </Typography>
          </Box>
          <IconButton onClick={() => setDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ pt: 3 }}>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>
          )}

          <Grid container spacing={2.5}>
            {/* Nombre */}
            <Grid size={{ xs: 12, sm: 7 }}>
              <TextField
                label="Nombre del proyecto *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                fullWidth
                placeholder="Nombre del proyecto"
                size="small"
              />
            </Grid>

            {/* Estado */}
            <Grid size={{ xs: 12, sm: 5 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Estado inicial *</InputLabel>
                <Select
                  value={form.status || "active"}
                  label="Estado inicial *"
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <MenuItem value="active">Activo</MenuItem>
                  <MenuItem value="completed">Completado</MenuItem>
                  <MenuItem value="on_hold">En pausa</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Fecha inicio */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Fecha de inicio *"
                type="date"
                value={form.start_date || ""}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                fullWidth
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>

            {/* Fecha fin */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Fecha estimada de fin"
                type="date"
                value={form.end_date || ""}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                fullWidth
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>

            {/* Presupuesto */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Presupuesto (COP)"
                type="number"
                value={budgetAmount || ""}
                onChange={(e) => setBudgetAmount(Number(e.target.value) || 0)}
                fullWidth
                size="small"
                placeholder="$ 0"
                helperText="Ingrese el monto en pesos colombianos."
                slotProps={{ input: { inputProps: { min: 0 } } }}
              />
            </Grid>

            {/* Responsable */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Responsable</InputLabel>
                <Select
                  value={form.responsible_id || ""}
                  label="Responsable"
                  onChange={(e) => setForm({ ...form, responsible_id: e.target.value ? Number(e.target.value) : undefined })}
                >
                  <MenuItem value="">Sin asignar</MenuItem>
                  {employees.map((emp) => (
                    <MenuItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} — {emp.position}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Descripción */}
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Descripción"
                value={form.description || ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                fullWidth
                multiline
                rows={3}
                placeholder="Descripción detallada del proyecto"
                size="small"
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: "none" }}>
            Cancelar
          </Button>
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
            {saving ? <CircularProgress size={20} /> : editingProject ? "Guardar cambios" : "Guardar proyecto"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog confirmar eliminación */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        TransitionProps={{ onExited: handleDialogExited }}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>¿Eliminar proyecto?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Esta acción eliminará el proyecto <strong>"{deleteTarget?.name}"</strong> de forma permanente.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} sx={{ textTransform: "none" }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmDelete}
            sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
