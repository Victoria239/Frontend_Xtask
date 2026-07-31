/* Pantalla de Recursos — vista de recursos creados */

import { useEffect, useState, useCallback } from "react";
import {
  Box, Card, CardContent, Typography, Button, Grid, Avatar,
  CircularProgress, Alert, Chip,
} from "@mui/material";
import {
  ArrowBack as BackIcon, People as PeopleIcon,
  Work as WorkIcon, AttachMoney as MoneyIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { employeesApi, projectsApi } from "../../api";
import type { Employee, Project } from "../../types";
import { brand } from "../../theme";

function fmtMoney(n: number) { return `$ ${n.toLocaleString("es-CO", { minimumFractionDigits: 0 })}`; }

export default function ResourcesPage() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [eR, pR] = await Promise.allSettled([
        employeesApi.getEmployees({ pageSize: 100 }),
        projectsApi.getProjects({ pageSize: 100 }),
      ]);
      if (eR.status === "fulfilled") setEmployees(eR.value.data);
      if (pR.status === "fulfilled") setProjects(pR.value.data);
    } catch {}
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh"><CircularProgress sx={{ color: brand.purple }} /></Box>;

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Button startIcon={<BackIcon />} onClick={() => navigate("/finanzas")} sx={{ textTransform: "none", fontWeight: 600 }}>Volver</Button>
        <Typography variant="h4" fontWeight={800}>Recursos</Typography>
      </Box>

      {/* cards resumen */}
      <Grid container spacing={2} mb={4}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ border: "1px solid", borderColor: "divider" }}><CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ bgcolor: `${brand.purple}12`, color: brand.purple }}><PeopleIcon /></Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary">Total Empleados</Typography>
                <Typography variant="h5" fontWeight={700}>{employees.length}</Typography>
              </Box>
            </Box>
          </CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ border: "1px solid", borderColor: "divider" }}><CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ bgcolor: "#dbeafe", color: "#2563eb" }}><WorkIcon /></Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary">Total Proyectos</Typography>
                <Typography variant="h5" fontWeight={700}>{projects.length}</Typography>
              </Box>
            </Box>
          </CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ border: "1px solid", borderColor: "divider" }}><CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ bgcolor: "#d1fae5", color: "#059669" }}><MoneyIcon /></Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary">Nómina Mensual</Typography>
                <Typography variant="h5" fontWeight={700}>{fmtMoney(employees.reduce((s, e) => s + (e.salary || 0), 0))}</Typography>
              </Box>
            </Box>
          </CardContent></Card>
        </Grid>
      </Grid>

      {/* empleados */}
      <Typography variant="h6" fontWeight={700} mb={2}>Empleados</Typography>
      <Grid container spacing={2} mb={4}>
        {employees.map((e) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={e.id}>
            <Card sx={{ border: "1px solid", borderColor: "divider", "&:hover": { borderColor: brand.purple } }}>
              <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Avatar sx={{ bgcolor: `${brand.purple}15`, color: brand.purple }}>{e.first_name[0]}{e.last_name[0]}</Avatar>
                <Box flex={1}>
                  <Typography fontWeight={700}>{e.first_name} {e.last_name}</Typography>
                  <Typography variant="body2" color="text.secondary">{e.position} · {e.department}</Typography>
                  <Typography variant="caption" color="text.secondary">{fmtMoney(e.salary)}</Typography>
                </Box>
                <Chip label={e.contract_status === "active" ? "Activo" : e.contract_status} color={e.contract_status === "active" ? "success" : "default"} size="small" sx={{ fontWeight: 600 }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
        {!employees.length && <Grid size={12}><Typography color="text.secondary" textAlign="center" py={4}>No hay empleados</Typography></Grid>}
      </Grid>

      {/* proyectos */}
      <Typography variant="h6" fontWeight={700} mb={2}>Proyectos</Typography>
      <Grid container spacing={2}>
        {projects.map((p) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={p.id}>
            <Card sx={{ border: "1px solid", borderColor: "divider", "&:hover": { borderColor: brand.purple } }}>
              <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Avatar sx={{ bgcolor: "#dbeafe", color: "#2563eb" }}><WorkIcon /></Avatar>
                <Box flex={1}>
                  <Typography fontWeight={700}>{p.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{p.description || "Sin descripción"}</Typography>
                </Box>
                <Chip label={p.status === "active" ? "Activo" : p.status} color={p.status === "active" ? "success" : p.status === "completed" ? "info" : "default"} size="small" sx={{ fontWeight: 600 }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
        {!projects.length && <Grid size={12}><Typography color="text.secondary" textAlign="center" py={4}>No hay proyectos</Typography></Grid>}
      </Grid>
    </Box>
  );
}
