/* Página de Dashboard — resumen general con cards y gráficos */

import { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  Folder as ProjectsIcon,
  People as EmployeesIcon,
  Payment as PayrollIcon,
  AccountBalance as FinanceIcon,
} from "@mui/icons-material";
import { PieChart } from "@mui/x-charts/PieChart";
import { BarChart } from "@mui/x-charts/BarChart";
import { projectsApi, payrollApi } from "../../api";

/* Tipo para las cards de resumen */
interface SummaryCard {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [projectIndicators, setProjectIndicators] = useState<Record<string, number>>({});
  const [payrollMetrics, setPayrollMetrics] = useState<Record<string, number>>({});

  /* Cargar datos al montar */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projIndicators, payMetrics] = await Promise.allSettled([
          projectsApi.getProjectIndicators(),
          payrollApi.getPayrollMetrics(),
        ]);

        if (projIndicators.status === "fulfilled") {
          setProjectIndicators(projIndicators.value);
        }
        if (payMetrics.status === "fulfilled") {
          setPayrollMetrics(payMetrics.value);
        }
      } catch {
        setError("Error al cargar datos del dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  /* Cards de resumen */
  const summaryCards: SummaryCard[] = [
    {
      title: "Proyectos",
      value: projectIndicators.total || 0,
      icon: <ProjectsIcon sx={{ fontSize: 40 }} />,
      color: "#1976d2",
    },
    {
      title: "Activos",
      value: projectIndicators.active || 0,
      icon: <ProjectsIcon sx={{ fontSize: 40 }} />,
      color: "#2e7d32",
    },
    {
      title: "Nóminas",
      value: payrollMetrics.total_payrolls || 0,
      icon: <PayrollIcon sx={{ fontSize: 40 }} />,
      color: "#ed6c02",
    },
    {
      title: "Total nómina",
      value: payrollMetrics.total_net_salary
        ? `$${Number(payrollMetrics.total_net_salary).toLocaleString()}`
        : "$0",
      icon: <FinanceIcon sx={{ fontSize: 40 }} />,
      color: "#9c27b0",
    },
  ];

  /* Datos para gráfico de pie (estados de proyectos) */
  const projectPieData = [
    { id: 0, value: projectIndicators.active || 0, label: "Activos", color: "#2e7d32" },
    { id: 1, value: projectIndicators.completed || 0, label: "Completados", color: "#1976d2" },
    { id: 2, value: projectIndicators.paused || 0, label: "Pausados", color: "#ed6c02" },
    { id: 3, value: projectIndicators.cancelled || 0, label: "Cancelados", color: "#d32f2f" },
  ].filter((d) => d.value > 0);

  /* Datos para gráfico de barras (métricas de nómina) */
  const payrollBarData = [
    { metric: "Pendientes", value: payrollMetrics.pending || 0 },
    { metric: "Aprobadas", value: payrollMetrics.approved || 0 },
    { metric: "Pagadas", value: payrollMetrics.paid || 0 },
    { metric: "Rechazadas", value: payrollMetrics.rejected || 0 },
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Título */}
      <Typography variant="h4" mb={3}>
        Dashboard
      </Typography>

      {/* Error */}
      {error && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Cards de resumen */}
      <Grid container spacing={3} mb={4}>
        {summaryCards.map((card) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={card.title}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {card.title}
                    </Typography>
                    <Typography variant="h4" fontWeight={700} mt={1}>
                      {card.value}
                    </Typography>
                  </Box>
                  <Box sx={{ color: card.color, opacity: 0.7 }}>{card.icon}</Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Gráficos */}
      <Grid container spacing={3}>
        {/* Pie: estados de proyectos */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>
                Estado de Proyectos
              </Typography>
              {projectPieData.length > 0 ? (
                <PieChart
                  series={[{ data: projectPieData, innerRadius: 40 }]}
                  height={300}
                />
              ) : (
                <Typography color="text.secondary" textAlign="center" py={8}>
                  Sin datos de proyectos
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Barras: métricas de nómina */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>
                Estado de Nóminas
              </Typography>
              {payrollBarData.some((d) => d.value > 0) ? (
                <BarChart
                  xAxis={[{ scaleType: "band", data: payrollBarData.map((d) => d.metric) }]}
                  series={[{ data: payrollBarData.map((d) => d.value), color: "#1976d2" }]}
                  height={300}
                />
              ) : (
                <Typography color="text.secondary" textAlign="center" py={8}>
                  Sin datos de nóminas
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
