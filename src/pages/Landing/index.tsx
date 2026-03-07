/* Landing Page — SaaS premium moderno tipo Stripe / Linear / Vercel */

import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Button, Grid, Container,
} from "@mui/material";
import {
  Settings as GearIcon,
  Hub as NodesIcon,
  AccountBalance as FinanceIcon,
  Folder as ProjectIcon,
  People as PeopleIcon,
  Receipt as PayrollIcon,
  Speed as KpiIcon,
  Psychology as SkillIcon,
  TrendingUp as TrendIcon,
  AutoAwesome as AutoIcon,
  Analytics as AnalyticsIcon,
  RocketLaunch as RocketIcon,
  Shield as ShieldIcon,
  Groups as CollabIcon,
  Schedule as TimeIcon,
  Insights as InsightsIcon,
  Bolt as BoltIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  ArrowForward as ArrowIcon,
} from "@mui/icons-material";
import "./landing.css";
import xtaskLogo from "../../assets/Xtask logo png.png";
import manuelPhoto from "../../assets/team/manuel-rodriguez.PNG";
import juanPhoto from "../../assets/team/juan-diego-toro.png";
import felipePhoto from "../../assets/team/felipe-cortes.png";

/* ── Constants ── */
const PURPLE = "#7C3AED";
const PURPLE_DARK = "#6D28D9";
const PURPLE_LIGHT = "#8B5CF6";

const modules = [
  { icon: <FinanceIcon />, title: "Gestión Financiera", desc: "Presupuestos, nómina, facturación y contabilidad en tiempo real.", items: ["Presupuestos", "Nómina", "Facturación", "Reportes"] },
  { icon: <ProjectIcon />, title: "Proyectos", desc: "Planificación, seguimiento de tareas, calendario y gestión de equipos.", items: ["Planificación", "Tareas", "Calendario", "Equipo"] },
  { icon: <PeopleIcon />, title: "Recursos Humanos", desc: "Gestión de empleados, contratos, evaluaciones y desarrollo.", items: ["Empleados", "Contratos", "Evaluaciones", "Onboarding"] },
  { icon: <PayrollIcon />, title: "Nómina", desc: "Gestión automatizada de pagos, salarios, deducciones y reportes.", items: ["Pagos", "Deducciones", "Historial", "Reportes"] },
  { icon: <KpiIcon />, title: "KPIs", desc: "Dashboard analítico, catálogo de indicadores, alertas y reportes.", items: ["Dashboard", "Catálogo", "Alertas", "Análisis"] },
  { icon: <SkillIcon />, title: "Habilidades", desc: "Mapa de competencias, evaluaciones, perfiles y desarrollo de talento.", items: ["Competencias", "Evaluaciones", "Perfiles", "Reportes"] },
];

const benefits = [
  { icon: <TrendIcon />, title: "Aumenta la eficiencia", desc: "Automatiza procesos repetitivos y optimiza flujos de trabajo hasta un 40%." },
  { icon: <AnalyticsIcon />, title: "Control en tiempo real", desc: "Monitorea gastos, ingresos y proyecciones financieras al instante." },
  { icon: <BoltIcon />, title: "Automatización inteligente", desc: "Elimina trabajo manual con automatizaciones para nómina y facturación." },
  { icon: <InsightsIcon />, title: "KPIs conectados", desc: "Métricas de desempeño integradas que motivan y retienen talento." },
  { icon: <ShieldIcon />, title: "Seguridad garantizada", desc: "Protección empresarial con estándares de seguridad internacionales." },
  { icon: <CollabIcon />, title: "Colaboración mejorada", desc: "Herramientas de trabajo en equipo que facilitan coordinación." },
  { icon: <TimeIcon />, title: "Ahorro de tiempo", desc: "Reduce hasta 60% el tiempo en tareas administrativas y operativas." },
  { icon: <AutoIcon />, title: "Decisiones basadas en datos", desc: "Reportes y analytics que proporcionan insights para decisiones estratégicas." },
];

const steps = [
  { num: "01", title: "Centraliza tu operación", desc: "Conecta todos los departamentos en una sola plataforma inteligente.", icon: <NodesIcon sx={{ fontSize: 32 }} /> },
  { num: "02", title: "Automatiza procesos", desc: "Configura flujos automáticos para nómina, facturación y reportes.", icon: <GearIcon sx={{ fontSize: 32 }} /> },
  { num: "03", title: "Analiza métricas", desc: "Visualiza KPIs, tendencias y resultados con dashboards interactivos.", icon: <AnalyticsIcon sx={{ fontSize: 32 }} /> },
  { num: "04", title: "Escala tu empresa", desc: "Crece con una plataforma que se adapta a tus necesidades.", icon: <RocketIcon sx={{ fontSize: 32 }} /> },
];

/* Team — Jairo photo pending, will be added later */
const team: { name: string; role: string; photo?: string }[] = [
  { name: "Jairo Cardona", role: "Chief Executive Officer (CEO)" },
  { name: "Manuel Rodríguez", role: "Director de Arquitectura de Software", photo: manuelPhoto },
  { name: "Juan Diego Toro", role: "Director de Ciberseguridad", photo: juanPhoto },
  { name: "Felipe Cortés", role: "Director Comercial & PMO", photo: felipePhoto },
];

const sectors = [
  { name: "Tecnología", count: "150+" },
  { name: "Construcción", count: "85+" },
  { name: "Gobierno", count: "45+" },
  { name: "ONG", count: "67+" },
  { name: "Salud", count: "92+" },
  { name: "Educación", count: "38+" },
  { name: "Manufactura", count: "76+" },
  { name: "Servicios", count: "112+" },
];

/* ── Team member card — large, uniform size, static name, optional photo ── */
function TeamCard({ member }: { member: typeof team[0] }) {
  const initials = member.name.split(" ").map((w) => w[0]).join("").slice(0, 2);
  return (
    <Box className="step-card" sx={{
      p: 5, borderRadius: 4, textAlign: "center",
      minHeight: 320, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      bgcolor: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)",
      border: "1px solid #E5E7EB",
    }}>
      {/* Photo or initials circle */}
      {member.photo ? (
        <Box sx={{
          width: 140, height: 140, borderRadius: "50%", mb: 3, flexShrink: 0,
          overflow: "hidden",
          boxShadow: "0 8px 28px rgba(124,58,237,0.25)",
          border: `3px solid ${PURPLE}30`,
        }}>
          <img src={member.photo} alt={member.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </Box>
      ) : (
        <Box sx={{
          width: 140, height: 140, borderRadius: "50%", mb: 3, flexShrink: 0,
          background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_LIGHT})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 42,
          boxShadow: "0 8px 28px rgba(124,58,237,0.25)",
        }}>
          {initials}
        </Box>
      )}
      <Typography sx={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 22, color: "#1a1a2e", mb: 0.5 }}>
        {member.name}
      </Typography>
      <Typography sx={{ fontFamily: "'Sora', sans-serif", fontWeight: 500, fontSize: 15, color: PURPLE }}>
        {member.role}
      </Typography>
    </Box>
  );
}

/* ════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const navigate = useNavigate();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [trail, setTrail] = useState<{ x: number; y: number; id: number }[]>([]);
  const trailId = useRef(0);

  /* Scroll observer for fade-in sections */
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.12 }
    );
    document.querySelectorAll(".fade-section").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  /* Mouse tracking for gear icon with fading trail */
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = { x: e.clientX, y: e.clientY };
    setMousePos(pos);
    trailId.current++;
    const newDot = { ...pos, id: trailId.current };
    setTrail((prev) => [...prev.slice(-12), newDot]);
  }, []);

  /* Auto-clean trail dots */
  useEffect(() => {
    if (trail.length === 0) return;
    const timer = setTimeout(() => setTrail((prev) => prev.slice(1)), 120);
    return () => clearTimeout(timer);
  }, [trail]);

  const sora = "'Sora', sans-serif";

  return (
    <Box
      onMouseMove={handleMouseMove}
      sx={{
        fontFamily: sora,
        minHeight: "100vh",
        background: "linear-gradient(165deg, #ffffff 0%, #F5F3FF 15%, #EDE9FF 35%, #E0D7FF 55%, #D4CAFE 75%, #C7BDF7 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ── ABSTRACT BACKGROUND LAYER ── */}

      {/* Organic wave veils — layered translucent waves */}
      <Box className="wave-veil-1" sx={{ position: "absolute", top: "8%", left: "-10%", width: "120%", height: 320, borderRadius: "50%", background: "linear-gradient(90deg, rgba(196,181,253,0.18), rgba(167,139,250,0.08), transparent)", filter: "blur(40px)", pointerEvents: "none", transform: "rotate(-3deg)" }} />
      <Box className="wave-veil-2" sx={{ position: "absolute", top: "30%", left: "-5%", width: "110%", height: 260, borderRadius: "50%", background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.1), rgba(196,181,253,0.15), transparent)", filter: "blur(50px)", pointerEvents: "none", transform: "rotate(2deg)" }} />
      <Box className="wave-veil-3" sx={{ position: "absolute", top: "55%", left: "-8%", width: "115%", height: 280, borderRadius: "50%", background: "linear-gradient(90deg, rgba(167,139,250,0.12), transparent, rgba(196,181,253,0.1))", filter: "blur(45px)", pointerEvents: "none", transform: "rotate(-1.5deg)" }} />

      {/* Soft radial blobs */}
      <Box className="blob-1" sx={{ position: "absolute", top: "5%", right: "8%", width: 450, height: 450, borderRadius: "50%", background: "radial-gradient(circle, rgba(167,139,250,0.14), transparent 70%)", filter: "blur(60px)", pointerEvents: "none" }} />
      <Box className="blob-2" sx={{ position: "absolute", top: "42%", left: "-4%", width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle, rgba(196,181,253,0.12), transparent 70%)", filter: "blur(55px)", pointerEvents: "none" }} />
      <Box className="blob-3" sx={{ position: "absolute", bottom: "8%", right: "15%", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.1), transparent 70%)", filter: "blur(50px)", pointerEvents: "none" }} />

      {/* Floating 3D cubes — subtle pale lavender */}
      <Box className="float-cube-1" sx={{ position: "absolute", top: "12%", left: "8%", width: 32, height: 32, borderRadius: 2, bgcolor: "rgba(196,181,253,0.2)", border: "1px solid rgba(167,139,250,0.15)", backdropFilter: "blur(4px)", pointerEvents: "none", boxShadow: "0 4px 12px rgba(139,92,246,0.08)" }} />
      <Box className="float-cube-2" sx={{ position: "absolute", top: "35%", right: "12%", width: 24, height: 24, borderRadius: 1.5, bgcolor: "rgba(196,181,253,0.15)", border: "1px solid rgba(167,139,250,0.12)", backdropFilter: "blur(3px)", pointerEvents: "none", boxShadow: "0 3px 10px rgba(139,92,246,0.06)" }} />
      <Box className="float-cube-3" sx={{ position: "absolute", bottom: "25%", left: "15%", width: 20, height: 20, borderRadius: 1, bgcolor: "rgba(196,181,253,0.18)", border: "1px solid rgba(167,139,250,0.1)", backdropFilter: "blur(3px)", pointerEvents: "none", boxShadow: "0 2px 8px rgba(139,92,246,0.05)" }} />

      {/* Floating spheres — ~36 distributed across page, varying sizes */}
      {/* Row 1: top 2–10% */}
      <Box className="float-sphere-1" sx={{ position: "absolute", top: "2%", left: "12%", width: 44, height: 44, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.6), rgba(196,181,253,0.25))", border: "1px solid rgba(167,139,250,0.12)", pointerEvents: "none", boxShadow: "0 4px 16px rgba(139,92,246,0.08)" }} />
      <Box className="float-sphere-2" sx={{ position: "absolute", top: "3%", right: "25%", width: 22, height: 22, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), rgba(196,181,253,0.18))", border: "1px solid rgba(167,139,250,0.08)", pointerEvents: "none", boxShadow: "0 2px 8px rgba(139,92,246,0.05)" }} />
      <Box className="float-sphere-3" sx={{ position: "absolute", top: "5%", left: "55%", width: 34, height: 34, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.55), rgba(196,181,253,0.22))", border: "1px solid rgba(167,139,250,0.1)", pointerEvents: "none", boxShadow: "0 3px 14px rgba(139,92,246,0.07)" }} />
      <Box className="float-sphere-1" sx={{ position: "absolute", top: "6%", right: "8%", width: 18, height: 18, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.45), rgba(196,181,253,0.15))", border: "1px solid rgba(167,139,250,0.07)", pointerEvents: "none", boxShadow: "0 2px 8px rgba(139,92,246,0.04)" }} />
      {/* Row 2: 10–20% */}
      <Box className="float-sphere-2" sx={{ position: "absolute", top: "11%", left: "3%", width: 30, height: 30, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), rgba(196,181,253,0.2))", border: "1px solid rgba(167,139,250,0.1)", pointerEvents: "none", boxShadow: "0 3px 12px rgba(139,92,246,0.06)" }} />
      <Box className="float-sphere-3" sx={{ position: "absolute", top: "13%", left: "38%", width: 16, height: 16, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.45), rgba(196,181,253,0.15))", border: "1px solid rgba(167,139,250,0.07)", pointerEvents: "none", boxShadow: "0 2px 8px rgba(139,92,246,0.04)" }} />
      <Box className="float-sphere-1" sx={{ position: "absolute", top: "15%", right: "18%", width: 48, height: 48, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.6), rgba(196,181,253,0.25))", border: "1px solid rgba(167,139,250,0.12)", pointerEvents: "none", boxShadow: "0 4px 16px rgba(139,92,246,0.08)" }} />
      <Box className="float-sphere-2" sx={{ position: "absolute", top: "18%", left: "72%", width: 26, height: 26, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), rgba(196,181,253,0.2))", border: "1px solid rgba(167,139,250,0.09)", pointerEvents: "none", boxShadow: "0 2px 10px rgba(139,92,246,0.05)" }} />
      {/* Row 3: 20–30% */}
      <Box className="float-sphere-3" sx={{ position: "absolute", top: "22%", left: "20%", width: 20, height: 20, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), rgba(196,181,253,0.18))", border: "1px solid rgba(167,139,250,0.08)", pointerEvents: "none", boxShadow: "0 2px 8px rgba(139,92,246,0.05)" }} />
      <Box className="float-sphere-1" sx={{ position: "absolute", top: "24%", right: "5%", width: 38, height: 38, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.55), rgba(196,181,253,0.22))", border: "1px solid rgba(167,139,250,0.1)", pointerEvents: "none", boxShadow: "0 3px 14px rgba(139,92,246,0.07)" }} />
      <Box className="float-sphere-2" sx={{ position: "absolute", top: "27%", left: "48%", width: 14, height: 14, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.45), rgba(196,181,253,0.15))", border: "1px solid rgba(167,139,250,0.07)", pointerEvents: "none", boxShadow: "0 2px 8px rgba(139,92,246,0.04)" }} />
      <Box className="float-sphere-3" sx={{ position: "absolute", top: "29%", left: "85%", width: 32, height: 32, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), rgba(196,181,253,0.2))", border: "1px solid rgba(167,139,250,0.1)", pointerEvents: "none", boxShadow: "0 3px 12px rgba(139,92,246,0.06)" }} />
      {/* Row 4: 30–42% */}
      <Box className="float-sphere-1" sx={{ position: "absolute", top: "32%", left: "6%", width: 42, height: 42, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.6), rgba(196,181,253,0.25))", border: "1px solid rgba(167,139,250,0.12)", pointerEvents: "none", boxShadow: "0 4px 16px rgba(139,92,246,0.08)" }} />
      <Box className="float-sphere-2" sx={{ position: "absolute", top: "35%", right: "35%", width: 18, height: 18, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.45), rgba(196,181,253,0.15))", border: "1px solid rgba(167,139,250,0.07)", pointerEvents: "none", boxShadow: "0 2px 8px rgba(139,92,246,0.04)" }} />
      <Box className="float-sphere-3" sx={{ position: "absolute", top: "38%", left: "62%", width: 28, height: 28, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), rgba(196,181,253,0.2))", border: "1px solid rgba(167,139,250,0.09)", pointerEvents: "none", boxShadow: "0 2px 10px rgba(139,92,246,0.05)" }} />
      <Box className="float-sphere-1" sx={{ position: "absolute", top: "40%", right: "10%", width: 36, height: 36, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.55), rgba(196,181,253,0.22))", border: "1px solid rgba(167,139,250,0.1)", pointerEvents: "none", boxShadow: "0 3px 14px rgba(139,92,246,0.07)" }} />
      {/* Row 5: 42–55% */}
      <Box className="float-sphere-2" sx={{ position: "absolute", top: "44%", left: "15%", width: 24, height: 24, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), rgba(196,181,253,0.18))", border: "1px solid rgba(167,139,250,0.08)", pointerEvents: "none", boxShadow: "0 2px 8px rgba(139,92,246,0.05)" }} />
      <Box className="float-sphere-3" sx={{ position: "absolute", top: "47%", left: "45%", width: 40, height: 40, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.6), rgba(196,181,253,0.25))", border: "1px solid rgba(167,139,250,0.12)", pointerEvents: "none", boxShadow: "0 4px 16px rgba(139,92,246,0.08)" }} />
      <Box className="float-sphere-1" sx={{ position: "absolute", top: "50%", right: "22%", width: 16, height: 16, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.45), rgba(196,181,253,0.15))", border: "1px solid rgba(167,139,250,0.07)", pointerEvents: "none", boxShadow: "0 2px 8px rgba(139,92,246,0.04)" }} />
      <Box className="float-sphere-2" sx={{ position: "absolute", top: "53%", left: "80%", width: 30, height: 30, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), rgba(196,181,253,0.2))", border: "1px solid rgba(167,139,250,0.1)", pointerEvents: "none", boxShadow: "0 3px 12px rgba(139,92,246,0.06)" }} />
      {/* Row 6: 55–68% */}
      <Box className="float-sphere-3" sx={{ position: "absolute", top: "56%", left: "8%", width: 46, height: 46, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.6), rgba(196,181,253,0.25))", border: "1px solid rgba(167,139,250,0.12)", pointerEvents: "none", boxShadow: "0 4px 16px rgba(139,92,246,0.08)" }} />
      <Box className="float-sphere-1" sx={{ position: "absolute", top: "58%", right: "42%", width: 20, height: 20, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), rgba(196,181,253,0.18))", border: "1px solid rgba(167,139,250,0.08)", pointerEvents: "none", boxShadow: "0 2px 8px rgba(139,92,246,0.05)" }} />
      <Box className="float-sphere-2" sx={{ position: "absolute", top: "62%", left: "68%", width: 34, height: 34, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.55), rgba(196,181,253,0.22))", border: "1px solid rgba(167,139,250,0.1)", pointerEvents: "none", boxShadow: "0 3px 14px rgba(139,92,246,0.07)" }} />
      <Box className="float-sphere-3" sx={{ position: "absolute", top: "65%", right: "6%", width: 22, height: 22, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), rgba(196,181,253,0.18))", border: "1px solid rgba(167,139,250,0.08)", pointerEvents: "none", boxShadow: "0 2px 8px rgba(139,92,246,0.05)" }} />
      {/* Row 7: 68–80% */}
      <Box className="float-sphere-1" sx={{ position: "absolute", top: "69%", left: "28%", width: 38, height: 38, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.55), rgba(196,181,253,0.22))", border: "1px solid rgba(167,139,250,0.1)", pointerEvents: "none", boxShadow: "0 3px 14px rgba(139,92,246,0.07)" }} />
      <Box className="float-sphere-2" sx={{ position: "absolute", top: "72%", right: "15%", width: 14, height: 14, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.45), rgba(196,181,253,0.15))", border: "1px solid rgba(167,139,250,0.07)", pointerEvents: "none", boxShadow: "0 2px 8px rgba(139,92,246,0.04)" }} />
      <Box className="float-sphere-3" sx={{ position: "absolute", top: "74%", left: "5%", width: 28, height: 28, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), rgba(196,181,253,0.2))", border: "1px solid rgba(167,139,250,0.09)", pointerEvents: "none", boxShadow: "0 2px 10px rgba(139,92,246,0.05)" }} />
      <Box className="float-sphere-1" sx={{ position: "absolute", top: "77%", left: "52%", width: 42, height: 42, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.6), rgba(196,181,253,0.25))", border: "1px solid rgba(167,139,250,0.12)", pointerEvents: "none", boxShadow: "0 4px 16px rgba(139,92,246,0.08)" }} />
      {/* Row 8: 80–95% */}
      <Box className="float-sphere-2" sx={{ position: "absolute", top: "82%", right: "30%", width: 26, height: 26, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), rgba(196,181,253,0.2))", border: "1px solid rgba(167,139,250,0.09)", pointerEvents: "none", boxShadow: "0 2px 10px rgba(139,92,246,0.05)" }} />
      <Box className="float-sphere-3" sx={{ position: "absolute", top: "84%", left: "18%", width: 36, height: 36, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.55), rgba(196,181,253,0.22))", border: "1px solid rgba(167,139,250,0.1)", pointerEvents: "none", boxShadow: "0 3px 14px rgba(139,92,246,0.07)" }} />
      <Box className="float-sphere-1" sx={{ position: "absolute", top: "87%", right: "8%", width: 18, height: 18, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.45), rgba(196,181,253,0.15))", border: "1px solid rgba(167,139,250,0.07)", pointerEvents: "none", boxShadow: "0 2px 8px rgba(139,92,246,0.04)" }} />
      <Box className="float-sphere-2" sx={{ position: "absolute", top: "90%", left: "42%", width: 32, height: 32, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), rgba(196,181,253,0.2))", border: "1px solid rgba(167,139,250,0.1)", pointerEvents: "none", boxShadow: "0 3px 12px rgba(139,92,246,0.06)" }} />
      <Box className="float-sphere-3" sx={{ position: "absolute", top: "93%", left: "75%", width: 44, height: 44, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.6), rgba(196,181,253,0.25))", border: "1px solid rgba(167,139,250,0.12)", pointerEvents: "none", boxShadow: "0 4px 16px rgba(139,92,246,0.08)" }} />
      <Box className="float-sphere-1" sx={{ position: "absolute", top: "95%", right: "50%", width: 16, height: 16, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.45), rgba(196,181,253,0.15))", border: "1px solid rgba(167,139,250,0.07)", pointerEvents: "none", boxShadow: "0 2px 8px rgba(139,92,246,0.04)" }} />

      {/* Bokeh particles — soft glowing dots */}
      <Box className="bokeh-1" sx={{ position: "absolute", top: "15%", left: "25%", width: 8, height: 8, borderRadius: "50%", bgcolor: "rgba(167,139,250,0.3)", filter: "blur(3px)", pointerEvents: "none" }} />
      <Box className="bokeh-2" sx={{ position: "absolute", top: "40%", right: "30%", width: 6, height: 6, borderRadius: "50%", bgcolor: "rgba(196,181,253,0.35)", filter: "blur(2px)", pointerEvents: "none" }} />
      <Box className="bokeh-3" sx={{ position: "absolute", bottom: "30%", left: "40%", width: 10, height: 10, borderRadius: "50%", bgcolor: "rgba(139,92,246,0.2)", filter: "blur(4px)", pointerEvents: "none" }} />
      <Box className="bokeh-1" sx={{ position: "absolute", top: "60%", right: "18%", width: 5, height: 5, borderRadius: "50%", bgcolor: "rgba(167,139,250,0.25)", filter: "blur(2px)", pointerEvents: "none" }} />
      <Box className="bokeh-2" sx={{ position: "absolute", top: "25%", left: "55%", width: 7, height: 7, borderRadius: "50%", bgcolor: "rgba(196,181,253,0.28)", filter: "blur(3px)", pointerEvents: "none" }} />

      {/* ── Gear trail ── */}
      {trail.map((dot, i) => (
        <GearIcon key={dot.id} sx={{
          position: "fixed", pointerEvents: "none", zIndex: 9998,
          left: dot.x + 14, top: dot.y + 14,
          fontSize: 14 + i * 0.8, color: PURPLE,
          opacity: 0.03 + (i / trail.length) * 0.06,
          transition: "opacity 0.3s ease",
          filter: "blur(1px)",
        }} />
      ))}
      {/* Main gear icon */}
      <GearIcon sx={{
        position: "fixed", pointerEvents: "none", zIndex: 9999,
        left: mousePos.x + 16, top: mousePos.y + 16,
        fontSize: 26, color: PURPLE, opacity: 0.15,
        transition: "left 0.15s cubic-bezier(0.23,1,0.32,1), top 0.15s cubic-bezier(0.23,1,0.32,1)",
      }} />

      {/* ══════════ HERO ══════════ */}
      <Container maxWidth="xl" sx={{ pt: { xs: 8, md: 14 }, pb: { xs: 8, md: 16 }, px: { md: 8, lg: 12 } }}>
        <Grid container spacing={6} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ display: "inline-block", mb: 3, px: 2, py: 0.7, borderRadius: 10, bgcolor: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)" }}>
              <Typography sx={{ fontFamily: sora, fontSize: 15, fontWeight: 600, color: PURPLE, display: "flex", alignItems: "center", gap: 0.5 }}>
                <AutoIcon sx={{ fontSize: 18 }} /> Plataforma completa de gestión empresarial
              </Typography>
            </Box>
            <Typography sx={{
              fontFamily: sora, fontWeight: 800,
              fontSize: { xs: 42, sm: 54, md: 66 },
              lineHeight: 1.15, color: "#1a1a2e", mb: 3,
            }}>
              Organiza, gestiona y potencia tu empresa con{" "}
              <span style={{ color: PURPLE }}>XTASK</span>
            </Typography>
            <Typography sx={{
              fontFamily: sora, fontSize: { xs: 18, md: 22 }, color: "#6b7280",
              lineHeight: 1.7, mb: 5, maxWidth: 620,
            }}>
              Una plataforma modular para proyectos, finanzas y talento que simplifica la gestión empresarial. Todo en un solo lugar, inteligente y escalable.
            </Typography>
            <Box display="flex" gap={2} flexWrap="wrap">
              <Button
                onClick={() => navigate("/login")}
                sx={{
                  fontFamily: sora, fontWeight: 700, fontSize: 20, textTransform: "none",
                  bgcolor: PURPLE, color: "#fff", px: 5.5, py: 2, borderRadius: 3,
                  boxShadow: "0 4px 20px rgba(124,58,237,0.35)",
                  "&:hover": { bgcolor: PURPLE_DARK, boxShadow: "0 6px 28px rgba(124,58,237,0.45)" },
                }}
              >
                Iniciar sesión
              </Button>
              <Button
                sx={{
                  fontFamily: sora, fontWeight: 600, fontSize: 20, textTransform: "none",
                  color: PURPLE, px: 5.5, py: 2, borderRadius: 3,
                  border: `2px solid ${PURPLE}20`,
                  "&:hover": { bgcolor: "rgba(124,58,237,0.05)", borderColor: PURPLE },
                }}
              >
                Ver demo
              </Button>
            </Box>

            {/* Stats */}
            <Box display="flex" gap={6} mt={7}>
              {[
                { val: "500+", label: "Empresas confían" },
                { val: "98%", label: "Satisfacción" },
                { val: "40%", label: "Más productividad" },
              ].map((s) => (
                <Box key={s.label}>
                  <Typography sx={{ fontFamily: sora, fontWeight: 800, fontSize: 40, color: PURPLE }}>{s.val}</Typography>
                  <Typography sx={{ fontFamily: sora, fontSize: 16, color: "#6b7280" }}>{s.label}</Typography>
                </Box>
              ))}
            </Box>
          </Grid>

          {/* Hero right — abstract mockup */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{
              position: "relative", minHeight: 440,
              display: { xs: "none", md: "block" },
            }}>
              {/* Floating cards to represent the platform */}
              <Box sx={{
                position: "absolute", top: 0, right: 0, width: 380, p: 3.5, borderRadius: 4,
                bgcolor: "rgba(255,255,255,0.85)", backdropFilter: "blur(16px)",
                border: "1px solid rgba(229,231,235,0.8)", boxShadow: "0 12px 40px rgba(0,0,0,0.08)",
                transform: "rotate(2deg)",
              }}>
                <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#10b981" }} />
                  <Typography sx={{ fontFamily: sora, fontWeight: 700, fontSize: 16, color: "#1a1a2e" }}>Dashboard Financiero</Typography>
                </Box>
                {["Presupuesto Total", "Nómina Mensual", "KPIs Activos"].map((item, i) => (
                  <Box key={item} display="flex" justifyContent="space-between" alignItems="center" py={1} sx={{ borderBottom: i < 2 ? "1px solid #f3f4f6" : "none" }}>
                    <Typography sx={{ fontFamily: sora, fontSize: 14, color: "#6b7280" }}>{item}</Typography>
                    <Typography sx={{ fontFamily: sora, fontWeight: 700, fontSize: 14, color: PURPLE }}>
                      {["$2.4B", "$180M", "24"][i]}
                    </Typography>
                  </Box>
                ))}
              </Box>
              <Box sx={{
                position: "absolute", top: 200, right: 160, width: 290, p: 3, borderRadius: 3,
                bgcolor: "rgba(255,255,255,0.9)", backdropFilter: "blur(16px)",
                border: "1px solid rgba(229,231,235,0.8)", boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
                transform: "rotate(-1deg)",
              }}>
                <Typography sx={{ fontFamily: sora, fontWeight: 700, fontSize: 15, color: "#1a1a2e", mb: 1.5 }}>Progreso de Proyectos</Typography>
                {[85, 62, 94].map((v, i) => (
                  <Box key={i} mb={1}>
                    <Box display="flex" justifyContent="space-between" mb={0.3}>
                      <Typography sx={{ fontFamily: sora, fontSize: 13, color: "#6b7280" }}>
                        {["Proyecto Alpha", "Rediseño UX", "Migración Cloud"][i]}
                      </Typography>
                      <Typography sx={{ fontFamily: sora, fontSize: 13, fontWeight: 700, color: PURPLE }}>{v}%</Typography>
                    </Box>
                    <Box sx={{ height: 5, borderRadius: 3, bgcolor: "#f3f4f6" }}>
                      <Box sx={{ height: 5, borderRadius: 3, bgcolor: PURPLE, width: `${v}%`, transition: "width 1s ease" }} />
                    </Box>
                  </Box>
                ))}
              </Box>
              <Box sx={{
                position: "absolute", top: 80, left: 0, width: 200, p: 2.5, borderRadius: 3,
                bgcolor: "rgba(255,255,255,0.9)", backdropFilter: "blur(16px)",
                border: "1px solid rgba(229,231,235,0.8)", boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
                textAlign: "center",
              }}>
                <Typography sx={{ fontFamily: sora, fontWeight: 800, fontSize: 36, color: PURPLE }}>24</Typography>
                <Typography sx={{ fontFamily: sora, fontSize: 14, color: "#6b7280" }}>Empleados activos</Typography>
                <Box sx={{ mt: 1, display: "flex", justifyContent: "center", gap: 0.3 }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Box key={i} sx={{ width: 24, height: 24, borderRadius: "50%", bgcolor: `${PURPLE}${20 + i * 15}`, border: "2px solid #fff", ml: i > 1 ? -0.8 : 0 }} />
                  ))}
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* ══════════ MODULES ══════════ */}
      <Box sx={{ py: { xs: 8, md: 14 } }}>
        <Container maxWidth="xl" sx={{ px: { md: 8, lg: 12 } }}>
          <Box className="fade-section" textAlign="center" mb={10}>
            <Typography sx={{ fontFamily: sora, fontWeight: 800, fontSize: { xs: 36, md: 50 }, color: "#1a1a2e", mb: 3 }}>
              Funcionalidades principales
            </Typography>
            <Typography sx={{ fontFamily: sora, fontSize: 21, color: "#6b7280", maxWidth: 700, mx: "auto" }}>
              Una suite completa de herramientas para cada área de tu empresa
            </Typography>
          </Box>
          <Grid container spacing={4}>
            {modules.map((m) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={m.title}>
                <Box className="landing-card fade-section" sx={{
                  p: 5, borderRadius: 4, height: "100%",
                  bgcolor: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)",
                  border: "1px solid #E5E7EB", cursor: "default",
                }}>
                  <Box sx={{
                    width: 64, height: 64, borderRadius: 3, mb: 3,
                    background: `linear-gradient(135deg, ${PURPLE}15, ${PURPLE}08)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: PURPLE,
                  }}>
                    {m.icon}
                  </Box>
                  <Typography sx={{ fontFamily: sora, fontWeight: 700, fontSize: 22, color: "#1a1a2e", mb: 1.5 }}>{m.title}</Typography>
                  <Typography sx={{ fontFamily: sora, fontSize: 16, color: "#6b7280", lineHeight: 1.7, mb: 2.5 }}>{m.desc}</Typography>
                  <Box display="flex" flexWrap="wrap" gap={0.8}>
                    {m.items.map((item) => (
                      <Box key={item} sx={{
                        px: 1.8, py: 0.5, borderRadius: 2, fontSize: 13,
                        fontFamily: sora, fontWeight: 500, color: PURPLE,
                        bgcolor: `${PURPLE}08`, border: `1px solid ${PURPLE}15`,
                      }}>
                        {item}
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ══════════ BENEFITS ══════════ */}
      <Box sx={{ py: { xs: 8, md: 14 } }}>
        <Container maxWidth="xl" sx={{ px: { md: 8, lg: 12 } }}>
          <Box className="fade-section" textAlign="center" mb={10}>
            <Typography sx={{ fontFamily: sora, fontWeight: 800, fontSize: { xs: 36, md: 50 }, color: "#1a1a2e", mb: 3 }}>
              Beneficios clave para tu empresa
            </Typography>
            <Typography sx={{ fontFamily: sora, fontSize: 21, color: "#6b7280", maxWidth: 700, mx: "auto" }}>
              Transforma la manera en que tu empresa opera y crece con XTask
            </Typography>
          </Box>
          <Grid container spacing={4}>
            {benefits.map((b) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={b.title}>
                <Box className="landing-card fade-section" sx={{
                  p: 5, borderRadius: 3.5, height: "100%", textAlign: "center",
                  bgcolor: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)",
                  border: "1px solid #E5E7EB",
                }}>
                  <Box sx={{
                    width: 68, height: 68, borderRadius: "50%", mx: "auto", mb: 3,
                    background: `linear-gradient(135deg, ${PURPLE}12, ${PURPLE}06)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: PURPLE,
                  }}>
                    {b.icon}
                  </Box>
                  <Typography sx={{ fontFamily: sora, fontWeight: 700, fontSize: 19, color: "#1a1a2e", mb: 1 }}>{b.title}</Typography>
                  <Typography sx={{ fontFamily: sora, fontSize: 15, color: "#6b7280", lineHeight: 1.7 }}>{b.desc}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ══════════ RESULTS BANNER ══════════ */}
      <Box className="fade-section" sx={{
        mx: { xs: 2, md: "auto" }, maxWidth: 1200,
        py: 6, px: 6, borderRadius: 4,
        background: `linear-gradient(135deg, #1a1a2e 0%, ${PURPLE_DARK} 100%)`,
        textAlign: "center", mb: 4,
      }}>
        <Typography sx={{ fontFamily: sora, fontWeight: 800, fontSize: { xs: 26, md: 36 }, color: "#fff", mb: 5 }}>
          Resultados comprobados por nuestros clientes
        </Typography>
        <Box display="flex" justifyContent="center" flexWrap="wrap" gap={6}>
          {[
            { val: "40%", label: "Aumento en productividad", sub: "Primeros 6 meses" },
            { val: "60%", label: "Reducción de tiempo", sub: "Procesos manuales" },
            { val: "25%", label: "Reducción de costos", sub: "Optimización de recursos" },
          ].map((r) => (
            <Box key={r.val}>
              <Typography sx={{ fontFamily: sora, fontWeight: 800, fontSize: 50, color: PURPLE_LIGHT }}>{r.val}</Typography>
              <Typography sx={{ fontFamily: sora, fontWeight: 600, fontSize: 16, color: "#fff" }}>{r.label}</Typography>
              <Typography sx={{ fontFamily: sora, fontSize: 14, color: "rgba(255,255,255,0.5)" }}>{r.sub}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ══════════ HOW IT WORKS ══════════ */}
      <Box sx={{ py: { xs: 8, md: 14 } }}>
        <Container maxWidth="xl" sx={{ px: { md: 8, lg: 12 } }}>
          <Box className="fade-section" textAlign="center" mb={10}>
            <Typography sx={{ fontFamily: sora, fontWeight: 800, fontSize: { xs: 36, md: 50 }, color: "#1a1a2e", mb: 3 }}>
              Cómo funciona XTASK
            </Typography>
            <Typography sx={{ fontFamily: sora, fontSize: 21, color: "#6b7280", maxWidth: 640, mx: "auto" }}>
              Cuatro pasos simples para transformar tu gestión empresarial
            </Typography>
          </Box>
          <Grid container spacing={4}>
            {steps.map((s, i) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={s.num}>
                <Box className="step-card fade-section" sx={{
                  p: 5, borderRadius: 4, textAlign: "center", height: "100%",
                  bgcolor: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)",
                  border: "1px solid #E5E7EB", position: "relative",
                }}>
                  <Typography sx={{ fontFamily: sora, fontWeight: 800, fontSize: 56, color: `${PURPLE}12`, lineHeight: 1 }}>{s.num}</Typography>
                  <Box sx={{ color: PURPLE, my: 2 }}>{s.icon}</Box>
                  <Typography sx={{ fontFamily: sora, fontWeight: 700, fontSize: 20, color: "#1a1a2e", mb: 1 }}>{s.title}</Typography>
                  <Typography sx={{ fontFamily: sora, fontSize: 16, color: "#6b7280", lineHeight: 1.7 }}>{s.desc}</Typography>
                  {i < 3 && (
                    <ArrowIcon sx={{
                      display: { xs: "none", md: "block" },
                      position: "absolute", right: -22, top: "50%", transform: "translateY(-50%)",
                      color: `${PURPLE}40`, fontSize: 24,
                    }} />
                  )}
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ══════════ TEAM ══════════ */}
      <Box sx={{ py: { xs: 8, md: 14 } }}>
        <Container maxWidth="xl" sx={{ px: { md: 8, lg: 12 } }}>
          <Box className="fade-section" textAlign="center" mb={10}>
            <Typography sx={{ fontFamily: sora, fontWeight: 800, fontSize: { xs: 36, md: 50 }, color: "#1a1a2e", mb: 3 }}>
              El equipo detrás de XTASK
            </Typography>
            <Typography sx={{ fontFamily: sora, fontSize: 21, color: "#6b7280", maxWidth: 740, mx: "auto" }}>
              Un grupo de profesionales construyendo tecnología para transformar la gestión empresarial.
            </Typography>
          </Box>
          <Grid container spacing={4}>
            {team.map((m) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={m.name}>
                <Box className="fade-section"><TeamCard member={m} /></Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ══════════ SECTORS ══════════ */}
      <Box sx={{ py: { xs: 8, md: 14 } }}>
        <Container maxWidth="xl" sx={{ px: { md: 8, lg: 12 } }}>
          <Box className="fade-section" textAlign="center" mb={10}>
            <Typography sx={{ fontFamily: sora, fontWeight: 800, fontSize: { xs: 36, md: 50 }, color: "#1a1a2e", mb: 3 }}>
              Sectores que confían en XTASK
            </Typography>
            <Typography sx={{ fontFamily: sora, fontSize: 21, color: "#6b7280", maxWidth: 700, mx: "auto" }}>
              Nuestra plataforma se adapta a las necesidades específicas de cada industria
            </Typography>
          </Box>
          <Grid container spacing={3.5}>
            {sectors.map((s) => (
              <Grid size={{ xs: 6, sm: 3 }} key={s.name}>
                <Box className="sector-card fade-section" sx={{
                  p: 4, borderRadius: 3.5, textAlign: "center",
                  bgcolor: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)",
                  border: "1px solid #E5E7EB",
                }}>
                  <Typography sx={{ fontFamily: sora, fontWeight: 700, fontSize: 19, color: "#1a1a2e", mb: 0.5 }}>{s.name}</Typography>
                  <Typography sx={{ fontFamily: sora, fontWeight: 800, fontSize: 38, color: PURPLE }}>{s.count}</Typography>
                  <Typography sx={{ fontFamily: sora, fontSize: 14, color: "#6b7280" }}>empresas</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ══════════ CONTACT ══════════ */}
      <Box sx={{ py: { xs: 8, md: 14 } }}>
        <Container maxWidth="lg">
          <Box className="fade-section" sx={{
            textAlign: "center", p: { xs: 4, md: 6 }, borderRadius: 4,
            bgcolor: "rgba(255,255,255,0.85)", backdropFilter: "blur(16px)",
            border: "1px solid #E5E7EB",
          }}>
            <Typography sx={{ fontFamily: sora, fontWeight: 800, fontSize: { xs: 32, md: 44 }, color: "#1a1a2e", mb: 3 }}>
              ¿Listo para transformar tu empresa?
            </Typography>
            <Typography sx={{ fontFamily: sora, fontSize: 18, color: "#6b7280", mb: 5, maxWidth: 540, mx: "auto" }}>
              Contáctanos y descubre cómo XTASK puede optimizar la gestión de tu organización.
            </Typography>
            <Box display="flex" justifyContent="center" gap={4} flexWrap="wrap" mb={4}>
              {[
                { icon: <EmailIcon sx={{ color: PURPLE }} />, text: "contacto@xtask.co" },
                { icon: <PhoneIcon sx={{ color: PURPLE }} />, text: "+57 (1) 234 5678" },
                { icon: <LocationIcon sx={{ color: PURPLE }} />, text: "Bogotá, Colombia" },
              ].map((c) => (
                <Box key={c.text} display="flex" alignItems="center" gap={1}>
                  {c.icon}
                  <Typography sx={{ fontFamily: sora, fontSize: 16, color: "#6b7280" }}>{c.text}</Typography>
                </Box>
              ))}
            </Box>
            <Button
              onClick={() => navigate("/login")}
              sx={{
                fontFamily: sora, fontWeight: 700, fontSize: 18, textTransform: "none",
                bgcolor: PURPLE, color: "#fff", px: 6, py: 1.8, borderRadius: 3,
                boxShadow: "0 4px 20px rgba(124,58,237,0.35)",
                "&:hover": { bgcolor: PURPLE_DARK },
              }}
            >
              Comenzar ahora
            </Button>
          </Box>
        </Container>
      </Box>

      {/* ══════════ FOOTER ══════════ */}
      <Box sx={{ mt: 8, py: 7, bgcolor: "#1a1a2e" }}>
        <Container maxWidth="xl" sx={{ px: { md: 8, lg: 12 } }}>
          <Grid container spacing={4} mb={5}>
            <Grid size={{ xs: 12, md: 3 }}>
              <img src={xtaskLogo} alt="XTASK" style={{ height: 52, objectFit: "contain", marginBottom: 14, filter: "brightness(0) invert(1)" }} />
              <Typography sx={{ fontFamily: sora, fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>
                Plataforma empresarial inteligente para la gestión integral de tu organización.
              </Typography>
            </Grid>
            {[
              { title: "Producto", links: ["Funcionalidades", "Módulos", "Demo"] },
              { title: "Empresa", links: ["Nuestro equipo", "Misión", "Visión"] },
              { title: "Recursos", links: ["Documentación", "Seguridad", "Soporte"] },
              { title: "Legal", links: ["Términos", "Privacidad"] },
            ].map((col) => (
              <Grid size={{ xs: 6, sm: 3, md: 2 }} key={col.title}>
                <Typography sx={{ fontFamily: sora, fontWeight: 700, fontSize: 16, color: "#fff", mb: 2 }}>{col.title}</Typography>
                {col.links.map((link) => (
                  <Typography key={link} className="footer-link" sx={{ fontFamily: sora, fontSize: 14, color: "rgba(255,255,255,0.45)", mb: 1.4, display: "block" }}>
                    {link}
                  </Typography>
                ))}
              </Grid>
            ))}
          </Grid>
          <Box sx={{ borderTop: "1px solid rgba(255,255,255,0.1)", pt: 3, textAlign: "center" }}>
            <Typography sx={{ fontFamily: sora, fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
              © 2026 XTASK – Plataforma empresarial inteligente
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
