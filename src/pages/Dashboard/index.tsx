/* Dashboard Xtask v4 — Brandbook 2023
 *
 * Inbox-first: items derivados de datos reales con thresholds.
 * Paleta aubergine + cyan signature.
 */

import { useEffect, useMemo, useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { Box } from "@mui/material";
import { projectsApi, payrollApi, employeesApi, financeApi } from "../../api";
import { useAuth } from "../../context/AuthContext";

/* Tokens — Xtask v5 light content */
const T = {
  bg:       "#FFFFFF",
  bg2:      "#F7F7F9",
  surface:  "#FFFFFF",
  surface2: "#F2F2F5",
  rule:     "#E5E5EA",
  rule2:    "#D1D1D6",
  ink:      "#1A1726",
  text2:    "#605C70",
  text3:    "#8E8A99",
  text4:    "#C4C2CC",
  accent:   "#02BDEA",
  accent2:  "#01E3D5",
  accentD:  "#0A4D70",
  green:    "#01B89E",
  red:      "#D14040",
  amber:    "#E08A0E",
  sans:     "'Gilroy', sans-serif",
  mono:     "'JetBrains Mono', monospace",
  ease:     "cubic-bezier(0.23, 1, 0.32, 1)",
};

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

type InboxType = "urgente" | "aprobar" | "info" | "event";
interface InboxItem {
  id: string;
  type: InboxType;
  title: string;
  desc: string;
  meta?: string;
  time: string;
  unread?: boolean;
  primary?: { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
}

const BORDER_BY_TYPE: Record<InboxType, string> = {
  urgente: T.red,
  aprobar: T.amber,
  info:    T.accent2,
  event:   T.green,
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "urgente" | "aprobar" | "info">("all");

  const [indicators, setIndicators] = useState<ProjectIndicators>({ total: 0, activos: 0, completados: 0, enProgreso: 0 });
  const [metrics, setMetrics] = useState<PayrollMetrics>({ totalMensual: 0, pendientePago: 0, pagadoMes: 0, totalNominas: 0 });
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [totalBudgetAmount, setTotalBudgetAmount] = useState(0);

  useEffect(() => {
    const fetchAll = async () => {
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
          setTotalBudgetAmount(budRes.value.data.reduce((sum: number, b: { total_amount: number }) => sum + (b.total_amount || 0), 0));
        }
      } catch { /* silent */ }
      finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  const inboxItems = useMemo<InboxItem[]>(() => {
    const items: InboxItem[] = [];

    if (metrics.pendientePago > 0) {
      items.push({
        id: "payroll-pending",
        type: "aprobar",
        title: `Nómina pendiente · €${metrics.pendientePago.toLocaleString("es-ES")}`,
        desc: `Hay registros de nómina sin procesar este mes. Revisalos antes del último día hábil.`,
        meta: `${metrics.totalNominas} registros este mes`,
        time: "hoy",
        unread: true,
        primary: { label: "Revisar nómina →", onClick: () => navigate("/nominas") },
      });
    }

    if (indicators.enProgreso > 0) {
      items.push({
        id: "projects-progress",
        type: "info",
        title: `${indicators.enProgreso} proyecto${indicators.enProgreso > 1 ? "s" : ""} en progreso`,
        desc: `Tenés ${indicators.activos} proyecto${indicators.activos > 1 ? "s" : ""} activo${indicators.activos > 1 ? "s" : ""} de ${indicators.total} totales. Revisá avance y posibles bloqueos.`,
        meta: `${indicators.completados} completados`,
        time: "ahora",
        primary: { label: "Ir a proyectos →", onClick: () => navigate("/proyectos") },
      });
    }

    if (totalEmployees > 0) {
      items.push({
        id: "team-status",
        type: "event",
        title: `Equipo · ${totalEmployees} empleado${totalEmployees > 1 ? "s" : ""}`,
        desc: `${totalEmployees} persona${totalEmployees > 1 ? "s" : ""} registrada${totalEmployees > 1 ? "s" : ""} en el tenant. El organigrama está al día.`,
        meta: "HRM",
        time: "actualizado",
        secondary: { label: "Ver equipo", onClick: () => navigate("/empleados") },
      });
    }

    if (totalBudgetAmount > 0) {
      items.push({
        id: "budget-status",
        type: "info",
        title: `Presupuesto comprometido · €${totalBudgetAmount.toLocaleString("es-ES")}`,
        desc: "El consolidado de presupuestos de proyectos suma esa cifra. Compará contra la nómina mensual.",
        meta: "Finanzas",
        time: "ahora",
        secondary: { label: "Ver finanzas", onClick: () => navigate("/finanzas") },
      });
    }

    return items;
  }, [indicators, metrics, totalEmployees, totalBudgetAmount, navigate]);

  const filteredItems = useMemo(() => {
    if (filter === "all") return inboxItems;
    return inboxItems.filter(i => i.type === filter);
  }, [inboxItems, filter]);

  const counts = useMemo(() => ({
    all: inboxItems.length,
    urgente: inboxItems.filter(i => i.type === "urgente").length,
    aprobar: inboxItems.filter(i => i.type === "aprobar").length,
    info: inboxItems.filter(i => i.type === "info" || i.type === "event").length,
  }), [inboxItems]);

  const firstName = (user?.fullName || "").split(" ")[0] || "";
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 20) return "Buenas tardes";
    return "Buenas noches";
  })();

  return (
    <Box sx={{ p: "32px 40px", bgcolor: T.bg, minHeight: "100vh", color: T.ink, fontFamily: T.sans }}>
      {/* Page header */}
      <Box sx={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-end",
        flexWrap: "wrap", gap: "16px",
        pb: "22px", mb: "32px", borderBottom: `1px solid ${T.rule}`,
      }}>
        <Box>
          <Box component="h1" sx={{
            fontSize: 30, fontWeight: 500, letterSpacing: "-0.025em",
            margin: "0 0 6px", color: T.ink, lineHeight: 1.15,
          }}>
            {greeting}{firstName ? `, ${firstName}` : ""}.{" "}
            {loading ? (
              <Box component="span" sx={{ color: T.text3, fontStyle: "italic" }}>cargando…</Box>
            ) : counts.all === 0 ? (
              <Box component="span" sx={{ color: T.text3 }}>nada urgente hoy.</Box>
            ) : (
              <>
                Tenés{" "}
                <Box component="em" sx={{ color: T.accent2, fontStyle: "italic", fontWeight: 500 }}>
                  {counts.all} {counts.all === 1 ? "cosa" : "cosas"}
                </Box>{" "}
                hoy.
              </>
            )}
          </Box>
          <Box component="p" sx={{ fontSize: 13.5, color: T.text3, margin: 0 }}>
            Items derivados de tus datos. Ordenados por urgencia.
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: "6px" }}>
          {[
            { id: "all" as const,     label: "Todas",        count: counts.all },
            { id: "urgente" as const, label: "Urgentes",     count: counts.urgente },
            { id: "aprobar" as const, label: "Aprobaciones", count: counts.aprobar },
            { id: "info" as const,    label: "Informativas", count: counts.info },
          ].map(f => (
            <Box
              key={f.id}
              component="button"
              onClick={() => setFilter(f.id)}
              sx={{
                background: filter === f.id ? T.surface : "transparent",
                border: `1px solid ${filter === f.id ? T.rule2 : T.rule}`,
                color: filter === f.id ? T.ink : T.text2,
                fontFamily: "inherit", fontSize: 12.5,
                padding: "6px 12px", borderRadius: "6px",
                cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: "6px",
                transition: `all 160ms ${T.ease}`,
                "@media (hover: hover) and (pointer: fine)": {
                  "&:hover": { borderColor: T.rule2, color: T.ink },
                },
              }}
            >
              {f.label}
              <Box component="span" sx={{
                fontFamily: T.mono, fontSize: 10.5,
                padding: "1px 6px", borderRadius: "3px",
                background: filter === f.id ? T.accent : T.surface2,
                color: filter === f.id ? T.ink : T.text2,
              }}>{f.count}</Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Inbox card */}
      <Box sx={{
        background: T.bg2, border: `1px solid ${T.rule}`, borderRadius: "12px",
        overflow: "hidden",
      }}>
        {loading ? (
          <SkeletonItems />
        ) : filteredItems.length === 0 ? (
          <EmptyState filter={filter} />
        ) : filteredItems.map((item, idx) => {
          const isLast = idx === filteredItems.length - 1;
          return (
            <Box key={item.id} sx={{
              display: "grid",
              gridTemplateColumns: "1fr auto auto",
              gap: "24px",
              padding: "20px 26px",
              paddingLeft: "22px",
              borderBottom: isLast ? "none" : `1px solid ${T.rule}`,
              alignItems: "flex-start",
              transition: `background 160ms ${T.ease}`,
              background: item.unread ? "rgba(2,189,234,0.04)" : "transparent",
              borderLeft: `3px solid ${BORDER_BY_TYPE[item.type]}`,
              "@media (hover: hover) and (pointer: fine)": {
                "&:hover": { background: item.unread ? "rgba(2,189,234,0.07)" : T.surface },
              },
            }}>
              {/* Body */}
              <Box sx={{ minWidth: 0 }}>
                <Box component="p" sx={{
                  margin: "0 0 6px", color: T.ink, fontWeight: 500,
                  fontSize: 15, letterSpacing: "-0.01em", lineHeight: 1.3,
                }}>{item.title}</Box>
                <Box component="p" sx={{
                  margin: 0, color: T.text2, fontSize: 13.5, lineHeight: 1.55,
                  maxWidth: "72ch",
                }}>{item.desc}</Box>
                {item.meta && (
                  <Box sx={{
                    marginTop: "10px",
                    fontFamily: T.mono, fontSize: 10.5, color: T.text3,
                    textTransform: "uppercase", letterSpacing: "0.06em",
                  }}>{item.meta}</Box>
                )}
              </Box>

              {/* Actions */}
              <Box sx={{ display: "flex", gap: "6px", flexShrink: 0, paddingTop: "2px" }}>
                {item.secondary && <ActionBtn variant="ghost" onClick={item.secondary.onClick}>{item.secondary.label}</ActionBtn>}
                {item.primary && <ActionBtn variant="primary" onClick={item.primary.onClick}>{item.primary.label}</ActionBtn>}
              </Box>

              {/* Time */}
              <Box sx={{
                fontFamily: T.mono, fontSize: 11, color: T.text3,
                whiteSpace: "nowrap", flexShrink: 0, paddingTop: "4px",
              }}>{item.time}</Box>
            </Box>
          );
        })}
      </Box>

      {/* Summary strip — 4 métricas reales */}
      <Box sx={{
        marginTop: "44px", paddingTop: "28px",
        borderTop: `1px solid ${T.rule}`,
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 0,
        "@media (max-width: 880px)": { gridTemplateColumns: "repeat(2, 1fr)", gap: "28px 0" },
      }}>
        <StripItem
          label="empleados"
          value={loading ? "—" : totalEmployees.toString()}
          sub={loading ? "" : `${indicators.activos} en proyectos activos`}
        />
        <StripItem
          label="proyectos"
          value={loading ? "—" : indicators.total.toString()}
          sub={loading ? "" : `${indicators.activos} activos · ${indicators.completados} cerrados`}
        />
        <StripItem
          label="nómina mes"
          value={loading ? "—" : `€${(metrics.totalMensual || 0).toLocaleString("es-ES")}`}
          sub={loading ? "" : `${metrics.totalNominas} registros`}
        />
        <StripItem
          label="presupuestos"
          value={loading ? "—" : `€${(totalBudgetAmount || 0).toLocaleString("es-ES")}`}
          sub={loading ? "" : "comprometidos"}
        />
      </Box>
    </Box>
  );
}

/* ─── Subcomponentes ──────────────────────────────────────── */

function ActionBtn({ variant, onClick, children }: { variant: "primary" | "ghost"; onClick: () => void; children: React.ReactNode }) {
  const isPrimary = variant === "primary";
  return (
    <Box
      component="button"
      data-variant={variant}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      sx={{
        background: isPrimary ? T.accent : "transparent",
        color: isPrimary ? "#FFFFFF" : T.text2,
        border: `1px solid ${isPrimary ? T.accent : T.rule}`,
        borderRadius: "6px", padding: "6px 12px",
        fontFamily: "inherit", fontSize: 12.5, fontWeight: 500,
        letterSpacing: "-0.005em", cursor: "pointer",
        transition: `all 160ms ${T.ease}`,
        whiteSpace: "nowrap",
        "&:active": { transform: "scale(0.97)" },
        "@media (hover: hover) and (pointer: fine)": {
          ...(isPrimary
            ? { "&:hover": { background: T.info, borderColor: T.info } }
            : { "&:hover": { borderColor: T.rule2, background: T.bg2, color: T.ink } }),
        },
      }}
    >{children}</Box>
  );
}

function StripItem({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Box sx={{
      padding: "0 24px",
      borderLeft: `1px solid ${T.rule}`,
      "&:first-of-type": { paddingLeft: 0, borderLeft: "none" },
    }}>
      <Box sx={{
        fontFamily: T.mono, fontSize: 10.5, color: T.text3,
        textTransform: "uppercase", letterSpacing: "0.06em",
        margin: "0 0 8px",
      }}>{label}</Box>
      <Box sx={{
        fontSize: 26, fontWeight: 500, letterSpacing: "-0.025em",
        lineHeight: 1, color: T.ink,
      }}>{value}</Box>
      <Box sx={{
        fontFamily: T.mono, fontSize: 10.5, color: T.text3,
        marginTop: "6px", minHeight: "14px",
      }}>{sub}</Box>
    </Box>
  );
}

function SkeletonItems() {
  return (
    <Box>
      {[0, 1, 2].map((i) => (
        <Box key={i} sx={{
          padding: "20px 26px",
          paddingLeft: "22px",
          borderBottom: i === 2 ? "none" : `1px solid ${T.rule}`,
          borderLeft: `3px solid ${T.rule}`,
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: "24px",
        }}>
          <Box>
            <Box sx={{
              width: `${50 + i * 10}%`, height: 14, borderRadius: 4,
              background: T.surface2, marginBottom: "10px",
              animation: `xt-skeleton 1.6s ${T.ease} infinite`, animationDelay: `${i * 0.15}s`,
            }} />
            <Box sx={{
              width: `${75 - i * 8}%`, height: 11, borderRadius: 3,
              background: T.surface, marginBottom: "6px",
              animation: `xt-skeleton 1.6s ${T.ease} infinite`, animationDelay: `${i * 0.15 + 0.2}s`,
            }} />
            <Box sx={{
              width: `${60 - i * 5}%`, height: 11, borderRadius: 3,
              background: T.surface,
              animation: `xt-skeleton 1.6s ${T.ease} infinite`, animationDelay: `${i * 0.15 + 0.3}s`,
            }} />
          </Box>
          <Box sx={{
            width: 92, height: 28, borderRadius: 6, background: T.surface,
            animation: `xt-skeleton 1.6s ${T.ease} infinite`,
          }} />
        </Box>
      ))}
      <style>{`
        @keyframes xt-skeleton {
          0%, 100% { opacity: 0.6; }
          50%      { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          [class*="xt-skeleton"] { animation: none !important; }
        }
      `}</style>
    </Box>
  );
}

function EmptyState({ filter }: { filter: string }) {
  const message = filter === "all"
    ? "Inbox vacío. Nada que atender por ahora."
    : `No hay items ${filter === "urgente" ? "urgentes" : filter === "aprobar" ? "esperando aprobación" : "informativos"}.`;
  return (
    <Box sx={{ p: "64px 32px", textAlign: "center" }}>
      <Box sx={{
        width: 44, height: 44, margin: "0 auto 18px",
        borderRadius: "50%",
        border: `1px solid ${T.rule2}`,
        display: "grid", placeItems: "center",
        color: T.text3,
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </Box>
      <Box sx={{ fontSize: 14.5, color: T.ink, fontWeight: 500, marginBottom: "4px" }}>{message}</Box>
      <Box sx={{ fontSize: 13, color: T.text3 }}>
        Cuando aparezca actividad real, los items se mostrarán acá.
      </Box>
    </Box>
  );
}

// JSX type imported to prevent unused-import warnings on strict configs
export type { JSX };
