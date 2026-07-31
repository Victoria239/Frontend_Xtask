/* Dashboard BI ejecutivo (E-05 + E-06).
 *
 * Vista única para CEO/CFO con métricas norte:
 * - Stats norte: ARR, headcount, OKR avg, P&L
 * - Financial breakdown
 * - Hiring trend (línea SVG)
 * - Distribución de riesgo de fuga (donut SVG)
 * - Top clientes + top risks + headcount por dept
 */
import { useEffect, useState } from "react";
import { Box, Stack, Typography, CircularProgress, Chip } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { biApi } from "../../api";
import type { BIOverview } from "../../api/bi";
import { notify } from "../../hooks/useToast";

const T = {
  bg: "#FFFFFF", bg2: "#F7F7F9", surface2: "#F2F2F5",
  rule: "#E5E5EA", rule2: "#D1D1D6",
  ink: "#1A1726", text2: "#605C70", text3: "#8E8A99",
  accent: "#02BDEA", accentD: "#0A4D70",
  amber: "#E08A0E", green: "#01B89E", red: "#D14040", violet: "#7c3aed",
  mono: "'JetBrains Mono', monospace",
};

const fmtEur = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const fmtNum = (n: number) => new Intl.NumberFormat("es-ES").format(n);

export default function BIPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [data, setData] = useState<BIOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setData(await biApi.getOverview());
      } catch (e) {
        const err = e as { response?: { data?: { error?: string } } };
        notify({ kind: "error", msg: err.response?.data?.error || "Error cargando dashboard" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: "48px", textAlign: "center" }}>
        <CircularProgress size={22} sx={{ color: T.accent }} />
      </Box>
    );
  }
  if (!data) return null;

  const ns = data.north_star;
  const fin = data.financial;
  const ppl = data.people;
  const att = ppl.attrition;

  return (
    <Box sx={{ px: { xs: "16px", md: "32px" }, pb: "32px", maxWidth: 1280, mx: "auto", color: T.ink }}>
      <Box sx={{ pb: "16px", mb: "20px", borderBottom: `1px solid ${T.rule}` }}>
        <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: "-0.025em", mb: 0.5 }}>
          {t("bi.title")}
        </Typography>
        <Typography variant="body2" sx={{ color: T.text2 }}>
          {t("bi.subtitle")}
        </Typography>
      </Box>

      {/* North star — 4 KPIs principales */}
      <Box sx={{
        display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
        gap: 1.5, mb: 2.5,
      }}>
        <NorthStarCard label="ARR" value={fmtEur(ns.arr_eur)} hint={`${ns.active_clients} clientes activos`} accent={T.accent} />
        <NorthStarCard label="Headcount" value={fmtNum(ns.headcount)} hint="empleados activos" accent={T.violet} />
        <NorthStarCard label="OKR avg" value={`${Math.round(ns.okr_avg_progress * 100)}%`} hint="progreso trimestre" accent={T.green} />
        <NorthStarCard
          label="P&L anual"
          value={fmtEur(fin.pnl_annual_eur)}
          hint={fin.pnl_annual_eur >= 0 ? "Profit" : "Burn"}
          accent={fin.pnl_annual_eur >= 0 ? T.green : T.red}
        />
      </Box>

      {/* Financial breakdown */}
      <Box sx={{
        p: "20px 24px", border: `1px solid ${T.rule}`, borderRadius: 2,
        bgcolor: T.bg, mb: 2.5,
      }}>
        <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {t("bi.financialBreakdown")}
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 3, mt: 1 }}>
          <FinItem label="ARR" value={fmtEur(fin.arr_eur)} sub="Ingresos recurrentes" />
          <FinItem label="Coste payroll" value={fmtEur(fin.payroll_annual_eur)} sub={`avg ${fmtEur(fin.avg_salary_eur)}/persona`} />
          <FinItem label="P&L" value={fmtEur(fin.pnl_annual_eur)} sub={fin.pnl_annual_eur >= 0 ? "Margen positivo" : "Burn rate"} valueColor={fin.pnl_annual_eur >= 0 ? T.green : T.red} />
          <FinItem label="Cobertura" value={`${fin.runway_implied_months.toFixed(1)} m`} sub="ARR ÷ payroll × 12" />
        </Box>
      </Box>

      {/* Hiring trend + Riesgo donut */}
      <Box sx={{
        display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.6fr 1fr" },
        gap: 2, mb: 2.5,
      }}>
        <Box sx={{ p: "20px 24px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg }}>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" mb={1.5}>
            <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Headcount trend (12m)
            </Typography>
            <Typography sx={{ fontFamily: T.mono, fontSize: 12, color: T.text2 }}>
              {ppl.hiring_trend.reduce((a, p) => a + p.new_hires, 0)} contrataciones netas
            </Typography>
          </Stack>
          <HiringChart trend={ppl.hiring_trend} />
        </Box>

        <Box sx={{ p: "20px 24px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg }}>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" mb={1.5}>
            <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {t("bi.attritionRisk")}
            </Typography>
            <Chip
              label="Ver detalle"
              size="small"
              onClick={() => navigate("/retencion")}
              sx={{ fontSize: 10, height: 18, cursor: "pointer", "&:hover": { bgcolor: T.bg2 } }}
            />
          </Stack>
          <RiskDonut high={att.high} medium={att.medium} low={att.low} />
        </Box>
      </Box>

      {/* Top clientes + Top risks + Headcount por dept */}
      <Box sx={{
        display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
        gap: 2,
      }}>
        <Box sx={{ p: "16px 20px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg }}>
          <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", mb: 1 }}>
            {t("bi.topClients")}
          </Typography>
          {data.revenue.top_clients.length === 0 ? (
            <Typography variant="caption" sx={{ color: T.text3 }}>Sin contratos activos</Typography>
          ) : (
            <Stack gap={0.75}>
              {data.revenue.top_clients.map((c, i) => (
                <Stack key={c.name} direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" gap={0.75} alignItems="center">
                    <Box sx={{ fontFamily: T.mono, fontSize: 10, color: T.text3, minWidth: 16 }}>#{i + 1}</Box>
                    <Typography variant="body2" sx={{ fontSize: 13 }}>{c.name}</Typography>
                  </Stack>
                  <Typography sx={{ fontFamily: T.mono, fontSize: 12, fontWeight: 600 }}>
                    {fmtEur(c.annual_eur)}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          )}
        </Box>

        <Box sx={{
          p: "16px 20px", border: `1px solid ${T.rule}`,
          borderLeft: `4px solid ${T.red}`, borderRadius: 2, bgcolor: T.bg,
        }}>
          <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", mb: 1 }}>
            Empleados en alto riesgo
          </Typography>
          {att.top_risks.length === 0 ? (
            <Typography variant="caption" sx={{ color: T.text3 }}>Ninguno por encima del umbral 🎉</Typography>
          ) : (
            <Stack gap={0.75}>
              {att.top_risks.map((r) => (
                <Stack key={r.employee_id} direction="row" justifyContent="space-between" alignItems="center">
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 500 }}>{r.name}</Typography>
                    <Typography variant="caption" sx={{ color: T.text3, fontSize: 11 }}>
                      {r.department || "—"}
                    </Typography>
                  </Box>
                  <Box sx={{
                    minWidth: 36, textAlign: "center", px: "6px", py: "2px",
                    borderRadius: "4px", bgcolor: "rgba(209, 64, 64, 0.10)",
                  }}>
                    <Typography sx={{ fontFamily: T.mono, fontWeight: 700, fontSize: 13, color: T.red }}>
                      {r.score}
                    </Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          )}
        </Box>

        <Box sx={{ p: "16px 20px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg }}>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" mb={1}>
            <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Headcount por equipo
            </Typography>
            <Typography variant="caption" sx={{ fontFamily: T.mono, fontSize: 11, color: T.text3 }}>
              {ppl.pending_leave_approvals} ausencias pendientes
            </Typography>
          </Stack>
          <Stack gap={0.75}>
            {ppl.headcount_by_department.map((d) => (
              <Stack key={d.department} direction="row" justifyContent="space-between">
                <Typography variant="body2" sx={{ fontSize: 13 }}>{d.department}</Typography>
                <Typography sx={{ fontFamily: T.mono, fontSize: 12, fontWeight: 600 }}>{d.n}</Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

/* ─── Stat cards ─── */
function NorthStarCard({ label, value, hint, accent }: { label: string; value: string; hint: string; accent: string }) {
  return (
    <Box sx={{
      p: "16px 20px", border: `1px solid ${T.rule}`, borderRadius: 2,
      bgcolor: T.bg, borderTop: `3px solid ${accent}`,
    }}>
      <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </Typography>
      <Typography sx={{ fontFamily: T.mono, fontWeight: 700, fontSize: 24, color: accent, lineHeight: 1.05, mt: 0.5 }}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{ color: T.text3, fontSize: 11 }}>{hint}</Typography>
    </Box>
  );
}

function FinItem({ label, value, sub, valueColor }: { label: string; value: string; sub: string; valueColor?: string }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5 }}>{label}</Typography>
      <Typography sx={{ fontFamily: T.mono, fontWeight: 700, fontSize: 18, color: valueColor || T.ink, lineHeight: 1.1, mt: 0.25 }}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{ color: T.text3, fontSize: 11 }}>{sub}</Typography>
    </Box>
  );
}

/* ─── Hiring trend SVG ─── */
function HiringChart({ trend }: { trend: { month: string; headcount: number; new_hires: number }[] }) {
  if (trend.length === 0) return <Typography variant="caption" sx={{ color: T.text3 }}>Sin datos</Typography>;
  const W = 600, H = 140, pad = 20;
  const maxHc = Math.max(...trend.map(p => p.headcount), 1);
  const step = (W - 2 * pad) / Math.max(trend.length - 1, 1);
  const points = trend.map((p, i) => ({
    x: pad + i * step,
    y: H - pad - (p.headcount / maxHc) * (H - 2 * pad),
    label: p.month.slice(0, 7),
    headcount: p.headcount,
    new_hires: p.new_hires,
  }));
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = `${path} L ${points[points.length - 1].x} ${H - pad} L ${points[0].x} ${H - pad} Z`;

  return (
    <Box sx={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        <defs>
          <linearGradient id="hiringFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={T.accent} stopOpacity="0.20" />
            <stop offset="100%" stopColor={T.accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#hiringFill)" />
        <path d={path} stroke={T.accent} strokeWidth="2" fill="none" />
        {points.map((p) => (
          <g key={p.label}>
            {p.new_hires > 0 && (
              <circle cx={p.x} cy={p.y} r="3.5" fill={T.violet} stroke={T.bg} strokeWidth="2" />
            )}
            <text x={p.x} y={H - 6} textAnchor="middle" fontSize="9" fontFamily={T.mono} fill={T.text3}>
              {p.label.slice(5)}
            </text>
          </g>
        ))}
      </svg>
      <Stack direction="row" gap={2} mt={0.5} sx={{ fontSize: 11, color: T.text3, fontFamily: T.mono }}>
        <Box>━ Headcount</Box>
        <Box>● Mes con contratación</Box>
      </Stack>
    </Box>
  );
}

/* ─── Riesgo donut SVG ─── */
function RiskDonut({ high, medium, low }: { high: number; medium: number; low: number }) {
  const total = high + medium + low || 1;
  const R = 50, CX = 70, CY = 70, sw = 14;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const segments = [
    { v: high, color: T.red, label: "Alto" },
    { v: medium, color: T.amber, label: "Medio" },
    { v: low, color: T.green, label: "Bajo" },
  ];
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={T.surface2} strokeWidth={sw} />
        {segments.map((s, i) => {
          if (s.v === 0) return null;
          const len = (s.v / total) * C;
          const dash = `${len} ${C - len}`;
          const el = (
            <circle
              key={i}
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={sw}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${CX} ${CY})`}
              style={{ transition: "all 320ms" }}
            />
          );
          offset += len;
          return el;
        })}
        <text x={CX} y={CY - 2} textAnchor="middle" fontSize="22" fontFamily={T.mono} fontWeight="700" fill={T.ink}>
          {total}
        </text>
        <text x={CX} y={CY + 14} textAnchor="middle" fontSize="9" fontFamily={T.mono} fill={T.text3}>
          empleados
        </text>
      </svg>
      <Stack gap={0.5} sx={{ fontSize: 12 }}>
        {segments.map((s) => (
          <Stack key={s.label} direction="row" gap={0.75} alignItems="center">
            <Box sx={{ width: 10, height: 10, borderRadius: "2px", bgcolor: s.color }} />
            <Typography variant="caption" sx={{ fontSize: 12, color: T.text2, minWidth: 50 }}>
              {s.label}
            </Typography>
            <Typography sx={{ fontFamily: T.mono, fontWeight: 600, fontSize: 12 }}>{s.v}</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
