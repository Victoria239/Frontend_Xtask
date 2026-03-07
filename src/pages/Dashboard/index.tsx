/* Página de Dashboard — panel principal con métricas reales */

import { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Avatar,
  Chip,
  LinearProgress,
} from "@mui/material";
import {
  Folder as ProjectsIcon,
  TrendingUp as ActiveIcon,
  People as EmployeesIcon,
  Payment as PayrollIcon,
  AccountBalance as BudgetIcon,
  CheckCircle as CompletedIcon,
} from "@mui/icons-material";
import { PieChart } from "@mui/x-charts/PieChart";
import { BarChart } from "@mui/x-charts/BarChart";
import { projectsApi, payrollApi, employeesApi, financeApi } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { brand } from "../../theme";

/* Tipos de respuesta del backend */
interface ProjectIndicators {
  total: number;
  activos: number;
  completados: number;
  enProgreso: number;
}

interface PayrollMetrics {
  totalMensual: number;
  pendientePago: number;
  pagadoMes: number;
  totalNominas: number;
}

/* Card de resumen */
interface SummaryCard {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconColor: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* Estado de datos */
  const [indicators, setIndicators] = useState<ProjectIndicators>({
    total: 0, activos: 0, completados: 0, enProgreso: 0,
  });
  const [metrics, setMetrics] = useState<PayrollMetrics>({
    totalMensual: 0, pendientePago: 0, pagadoMes: 0, totalNominas: 0,
  });
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [totalBudgets, setTotalBudgets] = useState(0);
  const [totalBudgetAmount, setTotalBudgetAmount] = useState(0);

  /* Cargar todos los datos reales al montar */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projRes, payRes, empRes, budRes] = await Promise.allSettled([
          projectsApi.getProjectIndicators(),
          payrollApi.getPayrollMetrics(),
          employeesApi.getEmployees({ pageSize: 1 }),
          financeApi.getBudgets({ pageSize: 200 }),
        ]);

        if (projRes.status === "fulfilled") setIndicators(projRes.value);
        if (payRes.status === "fulfilled") setMetrics(payRes.value);
        if (empRes.status === "fulfilled") setTotalEmployees(empRes.value.pagination?.total ?? 0);
        if (budRes.status === "fulfilled") {
          setTotalBudgets(budRes.value.pagination?.total ?? budRes.value.data.length);
          setTotalBudgetAmount(budRes.value.data.reduce((sum: number, b: { total_amount: number }) => sum + (b.total_amount || 0), 0));
        }
      } catch {
        setError("Error al cargar datos del dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  /* Porcentaje de proyectos completados */
  const completionRate = indicators.total > 0
    ? Math.round((indicators.completados / indicators.total) * 100)
    : 0;

  /* Cards de resumen — diseño limpio sin colores de fondo */
  const summaryCards: SummaryCard[] = [
    {
      title: "Proyectos Activos",
      value: indicators.activos,
      subtitle: `${indicators.total} proyectos en total`,
      icon: <ProjectsIcon />,
      iconColor: brand.purple,
    },
    {
      title: "Completados",
      value: indicators.completados,
      subtitle: `${completionRate}% tasa de finalización`,
      icon: <CompletedIcon />,
      iconColor: "#10b981",
    },
    {
      title: "Empleados",
      value: totalEmployees,
      subtitle: "Miembros del equipo",
      icon: <EmployeesIcon />,
      iconColor: "#3b82f6",
    },
    {
      title: "Nómina Mensual",
      value: `$${metrics.totalMensual.toLocaleString("es-CO", { minimumFractionDigits: 0 })}`,
      subtitle: `${metrics.totalNominas} nóminas registradas`,
      icon: <PayrollIcon />,
      iconColor: brand.navy,
    },
    {
      title: "Presupuesto Total",
      value: `$${totalBudgetAmount.toLocaleString("es-CO", { minimumFractionDigits: 0 })}`,
      subtitle: `${totalBudgets} presupuestos registrados`,
      icon: <BudgetIcon />,
      iconColor: "#f59e0b",
    },
    {
      title: "Pendiente Pago",
      value: `$${metrics.pendientePago.toLocaleString("es-CO", { minimumFractionDigits: 0 })}`,
      subtitle: `$${metrics.pagadoMes.toLocaleString("es-CO", { minimumFractionDigits: 0 })} pagado este mes`,
      icon: <ActiveIcon />,
      iconColor: "#ef4444",
    },
  ];

  /* Datos para gráfico donut (proyectos) */
  const projectPieData = [
    { id: 0, value: indicators.activos, label: "Activos", color: brand.purple },
    { id: 1, value: indicators.completados, label: "Completados", color: "#10b981" },
    { id: 2, value: indicators.enProgreso, label: "En Progreso", color: "#3b82f6" },
  ].filter((d) => d.value > 0);

  /* Datos para gráfico de barras (nómina) */
  const payrollBarLabels = ["Total Mensual", "Pendiente", "Pagado"];
  const payrollBarValues = [metrics.totalMensual, metrics.pendientePago, metrics.pagadoMes];

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
      <Box mb={4} display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="text.primary">
            Panel de Control
          </Typography>
          <Typography variant="body1" color="text.secondary" mt={0.5}>
            ¡Bienvenido, <strong>{user?.fullName || user?.username}</strong>! Aquí está el resumen de tus procesos.
          </Typography>
        </Box>
        <Chip
          label={`Rol: ${user?.role?.toUpperCase()}`}
          sx={{
            bgcolor: brand.purple,
            color: "white",
            fontWeight: 600,
            fontSize: "0.8rem",
            px: 1,
          }}
        />
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Cards de resumen */}
      <Grid container spacing={2.5} mb={4}>
        {summaryCards.map((card) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={card.title}>
            <Card
              sx={{
                height: "100%",
                bgcolor: "white",
                border: "1px solid",
                borderColor: "divider",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                transition: "transform 0.2s, box-shadow 0.2s",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                },
              }}
            >
              <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="body2" color="text.secondary" fontWeight={500} mb={1}>
                      {card.title}
                    </Typography>
                    <Typography variant="h4" fontWeight={700} color="text.primary">
                      {card.value}
                    </Typography>
                    {card.subtitle && (
                      <Typography variant="caption" color="text.secondary" mt={1} display="block">
                        {card.subtitle}
                      </Typography>
                    )}
                  </Box>
                  <Avatar
                    sx={{
                      bgcolor: `${card.iconColor}12`,
                      color: card.iconColor,
                      width: 48,
                      height: 48,
                    }}
                  >
                    {card.icon}
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Gráficos + Resumen de progreso */}
      <Grid container spacing={3}>
        {/* Donut: distribución de proyectos */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} mb={0.5}>
                Distribución de Proyectos
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Estado actual de todos los proyectos
              </Typography>
              {projectPieData.length > 0 ? (
                <PieChart
                  series={[{
                    data: projectPieData,
                    innerRadius: 60,
                    outerRadius: 110,
                    paddingAngle: 4,
                    cornerRadius: 8,
                    highlightScope: { fade: "global", highlight: "item" },
                  }]}
                  height={280}
                />
              ) : (
                <Box display="flex" alignItems="center" justifyContent="center" height={280}>
                  <Typography color="text.secondary">Sin datos de proyectos</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Barras: métricas de nómina */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} mb={0.5}>
                Resumen de Nóminas
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Distribución del gasto mensual en nómina
              </Typography>
              {payrollBarValues.some((v) => v > 0) ? (
                <BarChart
                  xAxis={[{
                    scaleType: "band",
                    data: payrollBarLabels,
                  }]}
                  series={[
                    {
                      data: payrollBarValues,
                      color: brand.purple,
                      label: "Monto ($)",
                    },
                  ]}
                  height={280}
                  slotProps={{
                    legend: { hidden: true },
                  }}
                />
              ) : (
                <Box display="flex" alignItems="center" justifyContent="center" height={280}>
                  <Typography color="text.secondary">Sin datos de nóminas</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Barra de progreso: tasa de finalización */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    Progreso General
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tasa de finalización de proyectos
                  </Typography>
                </Box>
                <Chip
                  label={`${completionRate}%`}
                  sx={{
                    bgcolor: completionRate >= 50 ? "#10b98120" : "#f59e0b20",
                    color: completionRate >= 50 ? "#10b981" : "#f59e0b",
                    fontWeight: 700,
                    fontSize: "1rem",
                  }}
                />
              </Box>
              <LinearProgress
                variant="determinate"
                value={completionRate}
                sx={{
                  height: 12,
                  borderRadius: 6,
                  bgcolor: "#e5e7eb",
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 6,
                    background: `linear-gradient(90deg, ${brand.purple} 0%, ${brand.accent} 100%)`,
                  },
                }}
              />
              <Box display="flex" justifyContent="space-between" mt={1.5}>
                <Typography variant="caption" color="text.secondary">
                  {indicators.completados} completados
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {indicators.total} total
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
