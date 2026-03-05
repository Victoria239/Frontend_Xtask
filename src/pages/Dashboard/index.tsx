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
  Avatar,
} from "@mui/material";
import {
  Folder as ProjectsIcon,
  TrendingUp as ActiveIcon,
  Payment as PayrollIcon,
  AccountBalance as FinanceIcon,
} from "@mui/icons-material";
import { PieChart } from "@mui/x-charts/PieChart";
import { BarChart } from "@mui/x-charts/BarChart";
import { projectsApi, payrollApi } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { brand } from "../../theme";

/* Tipo para las cards de resumen */
interface SummaryCard {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  bgColor: string;
  iconColor: string;
}

/* Respuesta real del backend: /api/proyectos/indicadores */
interface ProjectIndicators {
  total: number;
  activos: number;
  completados: number;
  enProgreso: number;
}

/* Respuesta real del backend: /api/nominas/metricas */
interface PayrollMetrics {
  totalMensual: number;
  pendientePago: number;
  pagadoMes: number;
  totalNominas: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [indicators, setIndicators] = useState<ProjectIndicators>({
    total: 0, activos: 0, completados: 0, enProgreso: 0,
  });
  const [metrics, setMetrics] = useState<PayrollMetrics>({
    totalMensual: 0, pendientePago: 0, pagadoMes: 0, totalNominas: 0,
  });

  /* Cargar datos al montar */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projRes, payRes] = await Promise.allSettled([
          projectsApi.getProjectIndicators(),
          payrollApi.getPayrollMetrics(),
        ]);

        if (projRes.status === "fulfilled") setIndicators(projRes.value);
        if (payRes.status === "fulfilled") setMetrics(payRes.value);
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
      title: "Total Proyectos",
      value: indicators.total,
      icon: <ProjectsIcon />,
      bgColor: `${brand.purple}15`,
      iconColor: brand.purple,
    },
    {
      title: "Proyectos Activos",
      value: indicators.activos,
      icon: <ActiveIcon />,
      bgColor: "#10b98115",
      iconColor: "#10b981",
    },
    {
      title: "Total Nóminas",
      value: metrics.totalNominas,
      icon: <PayrollIcon />,
      bgColor: "#f59e0b15",
      iconColor: "#f59e0b",
    },
    {
      title: "Monto Mensual",
      value: `$${metrics.totalMensual.toLocaleString("es-CO", { minimumFractionDigits: 0 })}`,
      icon: <FinanceIcon />,
      bgColor: `${brand.navy}10`,
      iconColor: brand.navy,
    },
  ];

  /* Datos para gráfico de pie (estados de proyectos) */
  const projectPieData = [
    { id: 0, value: indicators.activos, label: "Activos", color: "#10b981" },
    { id: 1, value: indicators.completados, label: "Completados", color: brand.purple },
    { id: 2, value: indicators.enProgreso, label: "En Progreso", color: "#3b82f6" },
  ].filter((d) => d.value > 0);

  /* Datos para gráfico de barras (métricas de nómina) */
  const payrollBarData = [
    { label: "Total Mensual", value: metrics.totalMensual },
    { label: "Pendiente", value: metrics.pendientePago },
    { label: "Pagado", value: metrics.pagadoMes },
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress sx={{ color: brand.purple }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Bienvenida */}
      <Box mb={4}>
        <Typography variant="h4" fontWeight={700}>
          Bienvenido, {user?.fullName || user?.username}
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Resumen general de tu plataforma de gestión empresarial
        </Typography>
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Cards de resumen */}
      <Grid container spacing={3} mb={4}>
        {summaryCards.map((card) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={card.title}>
            <Card sx={{ height: "100%" }}>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                      {card.title}
                    </Typography>
                    <Typography variant="h4" fontWeight={700} mt={1.5}>
                      {card.value}
                    </Typography>
                  </Box>
                  <Avatar
                    sx={{
                      bgcolor: card.bgColor,
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

      {/* Gráficos */}
      <Grid container spacing={3}>
        {/* Pie: estados de proyectos */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" mb={2}>
                Distribución de Proyectos
              </Typography>
              {projectPieData.length > 0 ? (
                <PieChart
                  series={[{
                    data: projectPieData,
                    innerRadius: 50,
                    outerRadius: 120,
                    paddingAngle: 3,
                    cornerRadius: 6,
                  }]}
                  height={300}
                />
              ) : (
                <Box display="flex" alignItems="center" justifyContent="center" height={300}>
                  <Typography color="text.secondary">Sin datos de proyectos</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Barras: métricas de nómina */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" mb={2}>
                Resumen de Nóminas
              </Typography>
              {payrollBarData.some((d) => d.value > 0) ? (
                <BarChart
                  xAxis={[{
                    scaleType: "band",
                    data: payrollBarData.map((d) => d.label),
                  }]}
                  series={[{
                    data: payrollBarData.map((d) => d.value),
                    color: brand.purple,
                  }]}
                  height={300}
                  borderRadius={8}
                />
              ) : (
                <Box display="flex" alignItems="center" justifyContent="center" height={300}>
                  <Typography color="text.secondary">Sin datos de nóminas</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
