/* Comp Analytics (C-06).
 *
 * Sections:
 * - Stats norte: payroll, avg, median, gap factor, compa-avg
 * - Department spend: bars con % del payroll
 * - Bandas: tabla agrupada por departamento con P25/P50/P75
 * - Outliers: empleados below/above band con delta absoluto
 * - Tenure vs salary: scatter SVG
 */
import { useEffect, useState } from "react";
import { Box, Stack, Typography, CircularProgress, Chip } from "@mui/material";
import { useTranslation } from "react-i18next";
import { compApi } from "../../api";
import type { CompOverview } from "../../api/comp";
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

const SENIORITY_ORDER = ["junior", "mid", "senior", "lead"];
const SENIORITY_LABEL: Record<string, string> = {
  junior: "Junior", mid: "Mid", senior: "Senior", lead: "Lead",
};
const SENIORITY_COLOR: Record<string, string> = {
  junior: T.amber, mid: T.accent, senior: T.violet, lead: T.green,
};

export default function CompAnalyticsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<CompOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setData(await compApi.getCompOverview());
      } catch (e) {
        notify({ kind: "error", msg: "Error cargando analytics" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <Box sx={{ p: "48px", textAlign: "center" }}><CircularProgress size={22} sx={{ color: T.accent }} /></Box>;
  }
  if (!data) return null;

  // Agrupar bandas por departamento para tabla
  const bandsByDept = data.bands.reduce<Record<string, typeof data.bands>>((acc, b) => {
    (acc[b.department] = acc[b.department] || []).push(b);
    return acc;
  }, {});

  const maxDeptShare = Math.max(...data.departments.map(d => d.share_pct), 1);

  return (
    <Box sx={{ px: { xs: "16px", md: "32px" }, pb: "32px", maxWidth: 1280, mx: "auto", color: T.ink }}>
      <Box sx={{ pb: "16px", mb: "20px", borderBottom: `1px solid ${T.rule}` }}>
        <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: "-0.025em", mb: 0.5 }}>
          {t("comp.title")}
        </Typography>
        <Typography variant="body2" sx={{ color: T.text2 }}>
          {t("comp.subtitle")}
        </Typography>
      </Box>

      {/* Stats strip */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(5, 1fr)" }, gap: 1.5, mb: 3 }}>
        <Stat label={t("comp.totalPayroll")} value={fmtEur(data.total_payroll_annual)} accent={T.accent} />
        <Stat label={t("comp.avgSalary")} value={fmtEur(data.avg_salary)} accent={T.violet} />
        <Stat label={t("comp.medianSalary")} value={fmtEur(data.median_salary)} accent={T.violet} />
        <Stat label={t("comp.gapFactor")} value={`${data.gap_factor.toFixed(1)}×`} accent={data.gap_factor > 4 ? T.amber : T.green} hint="max ÷ min" />
        <Stat label={t("comp.compaRatio")} value={data.compa_ratio_avg.toFixed(2)} accent={Math.abs(data.compa_ratio_avg - 1) < 0.05 ? T.green : T.amber} hint="actual ÷ p50" />
      </Box>

      {/* Department spend */}
      <Box sx={{ mb: 3, p: "20px 24px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg }}>
        <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", mb: 1.5 }}>
          Payroll por departamento
        </Typography>
        <Stack gap={1}>
          {data.departments.map((d) => (
            <Box key={d.department}>
              <Stack direction="row" justifyContent="space-between" mb={0.5}>
                <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 500 }}>
                  {d.department} <Typography component="span" variant="caption" sx={{ color: T.text3, fontFamily: T.mono, ml: 0.5 }}>{d.headcount} pax</Typography>
                </Typography>
                <Stack direction="row" gap={2}>
                  <Typography sx={{ fontFamily: T.mono, fontSize: 12, color: T.text2 }}>{fmtEur(d.total_payroll)}</Typography>
                  <Typography sx={{ fontFamily: T.mono, fontSize: 12, fontWeight: 600, color: T.accent, minWidth: 50, textAlign: "right" }}>
                    {d.share_pct.toFixed(1)}%
                  </Typography>
                </Stack>
              </Stack>
              <Box sx={{ height: 6, bgcolor: T.surface2, borderRadius: 3, overflow: "hidden" }}>
                <Box sx={{ height: "100%", width: `${(d.share_pct / maxDeptShare) * 100}%`, bgcolor: T.accent, transition: "width 240ms" }} />
              </Box>
            </Box>
          ))}
        </Stack>
      </Box>

      {/* Outliers */}
      {data.outliers.length > 0 && (
        <Box sx={{ mb: 3, p: "20px 24px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg }}>
          <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", mb: 1.5 }}>
            {t("comp.outliers")} ({data.outliers.length})
          </Typography>
          <Stack gap={0.75}>
            {data.outliers.map((o) => {
              const isBelow = o.flag === "below";
              const c = isBelow ? T.red : T.violet;
              return (
                <Box key={o.employee_id} sx={{
                  p: "12px 16px", borderRadius: 1.5,
                  bgcolor: T.bg2, borderLeft: `3px solid ${c}`,
                  display: "grid", gridTemplateColumns: { xs: "1fr auto", md: "1.4fr 0.6fr 1fr auto" },
                  gap: 1.5, alignItems: "center",
                }}>
                  <Box>
                    <Typography sx={{ fontWeight: 600, fontSize: 13.5 }}>{o.name}</Typography>
                    <Typography variant="caption" sx={{ color: T.text3 }}>
                      {o.position} · {o.department}
                    </Typography>
                  </Box>
                  <Chip label={SENIORITY_LABEL[o.seniority]} size="small" sx={{
                    height: 20, fontSize: 11, fontFamily: T.mono,
                    bgcolor: `${SENIORITY_COLOR[o.seniority]}15`, color: SENIORITY_COLOR[o.seniority], fontWeight: 600,
                    display: { xs: "none", md: "inline-flex" },
                  }} />
                  <Typography variant="caption" sx={{ color: T.text2, fontSize: 11.5, fontStyle: "italic" }}>
                    {o.reason}
                  </Typography>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography sx={{ fontFamily: T.mono, fontWeight: 700, fontSize: 13, color: c, lineHeight: 1 }}>
                      {isBelow ? "−" : "+"}{fmtEur(o.delta_eur)}
                    </Typography>
                    <Typography variant="caption" sx={{ fontFamily: T.mono, fontSize: 10, color: T.text3 }}>
                      compa {o.compa_ratio}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Box>
      )}

      {/* Bandas + tenure */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.3fr 1fr" }, gap: 2, mb: 3 }}>
        {/* Bandas */}
        <Box sx={{ p: "20px 24px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg }}>
          <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", mb: 1.5 }}>
            {t("comp.bands")}
          </Typography>
          <Stack gap={2}>
            {Object.entries(bandsByDept).map(([dept, bands]) => (
              <Box key={dept}>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: T.text2, mb: 0.75 }}>{dept}</Typography>
                <Stack gap={0.5}>
                  {bands
                    .sort((a, b) => SENIORITY_ORDER.indexOf(a.seniority) - SENIORITY_ORDER.indexOf(b.seniority))
                    .map((b) => (
                      <Stack key={b.seniority} direction="row" gap={1.5} alignItems="center" sx={{ fontSize: 12 }}>
                        <Chip label={SENIORITY_LABEL[b.seniority]} size="small" sx={{
                          height: 18, fontSize: 10.5, fontFamily: T.mono, minWidth: 60,
                          bgcolor: `${SENIORITY_COLOR[b.seniority]}15`,
                          color: SENIORITY_COLOR[b.seniority], fontWeight: 600,
                        }} />
                        <Typography variant="caption" sx={{ fontFamily: T.mono, fontSize: 10.5, color: T.text3, minWidth: 28 }}>
                          n={b.headcount}
                        </Typography>
                        <Stack direction="row" gap={1.5} sx={{ flex: 1, justifyContent: "flex-end", fontFamily: T.mono, fontSize: 11 }}>
                          <Typography variant="caption">P25 {fmtEur(b.p25)}</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>P50 {fmtEur(b.p50)}</Typography>
                          <Typography variant="caption">P75 {fmtEur(b.p75)}</Typography>
                        </Stack>
                      </Stack>
                    ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>

        {/* Tenure vs salary */}
        <Box sx={{ p: "20px 24px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg }}>
          <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", mb: 1.5 }}>
            Tenure vs salario
          </Typography>
          <Scatter points={data.tenure_vs_salary} />
          <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5, display: "block", mt: 1, fontStyle: "italic" }}>
            Cada punto = un empleado. Patrón sano: correlación positiva entre antigüedad y salario.
          </Typography>
        </Box>
      </Box>

      {/* Top earners */}
      <Box sx={{ p: "16px 20px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg }}>
        <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", mb: 1 }}>
          {t("comp.topEarners")}
        </Typography>
        <Stack gap={0.5}>
          {data.top_earners.map((e, i) => (
            <Stack key={e.employee_id} direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" gap={0.75} alignItems="center">
                <Box sx={{ fontFamily: T.mono, fontSize: 10, color: T.text3, minWidth: 18 }}>#{i + 1}</Box>
                <Typography variant="body2" sx={{ fontSize: 13 }}>{e.name}</Typography>
                <Typography variant="caption" sx={{ color: T.text3, fontSize: 11 }}>
                  · {e.position}
                </Typography>
              </Stack>
              <Typography sx={{ fontFamily: T.mono, fontSize: 12, fontWeight: 600 }}>
                {fmtEur(e.salary)}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}

/* ─── Stat card ─── */
function Stat({ label, value, accent, hint }: { label: string; value: string; accent: string; hint?: string }) {
  return (
    <Box sx={{
      p: "14px 18px", border: `1px solid ${T.rule}`, borderRadius: 2,
      bgcolor: T.bg, borderTop: `3px solid ${accent}`,
    }}>
      <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </Typography>
      <Typography sx={{ fontFamily: T.mono, fontWeight: 700, fontSize: 20, color: accent, lineHeight: 1.1, mt: 0.5 }}>
        {value}
      </Typography>
      {hint && <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5 }}>{hint}</Typography>}
    </Box>
  );
}

/* ─── Scatter ─── */
function Scatter({ points }: { points: { employee_id: number; name: string; tenure_months: number; salary: number; department: string }[] }) {
  if (points.length === 0) return <Typography variant="caption" sx={{ color: T.text3 }}>Sin datos</Typography>;
  const W = 380, H = 200, pad = 28;
  const maxT = Math.max(...points.map(p => p.tenure_months), 1);
  const maxS = Math.max(...points.map(p => p.salary), 1);
  const minS = Math.min(...points.map(p => p.salary));

  const xScale = (t: number) => pad + (t / maxT) * (W - pad - 8);
  const yScale = (s: number) => H - pad - ((s - minS) / Math.max(maxS - minS, 1)) * (H - pad - 12);

  // Color por departamento simple — hash a 4 colores
  const palette = [T.accent, T.violet, T.amber, T.green, T.red];
  const deptColor: Record<string, string> = {};
  let pi = 0;
  for (const p of points) {
    if (!(p.department in deptColor)) {
      deptColor[p.department] = palette[pi++ % palette.length];
    }
  }

  return (
    <Box>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {/* Grid horizontal lines */}
        {[0.25, 0.5, 0.75].map((p) => (
          <line key={p}
            x1={pad} x2={W - 8}
            y1={pad + p * (H - pad - 12)} y2={pad + p * (H - pad - 12)}
            stroke={T.rule} strokeDasharray="2 4"
          />
        ))}
        {/* Axes labels */}
        <text x={pad} y={H - 6} fontSize="9" fontFamily={T.mono} fill={T.text3}>0m</text>
        <text x={W - 8} y={H - 6} fontSize="9" textAnchor="end" fontFamily={T.mono} fill={T.text3}>{maxT}m tenure</text>
        <text x={4} y={pad + 4} fontSize="9" fontFamily={T.mono} fill={T.text3}>{fmtEur(maxS)}</text>
        <text x={4} y={H - pad + 2} fontSize="9" fontFamily={T.mono} fill={T.text3}>{fmtEur(minS)}</text>
        {/* Points */}
        {points.map((p) => (
          <circle
            key={p.employee_id}
            cx={xScale(p.tenure_months)} cy={yScale(p.salary)}
            r="4" fill={deptColor[p.department]} fillOpacity="0.75"
            stroke={T.bg} strokeWidth="1.5"
          >
            <title>{p.name} · {p.tenure_months}m · {fmtEur(p.salary)}</title>
          </circle>
        ))}
      </svg>
      <Stack direction="row" gap={1.5} flexWrap="wrap" mt={1}>
        {Object.entries(deptColor).map(([dept, color]) => (
          <Stack key={dept} direction="row" gap={0.4} alignItems="center">
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color }} />
            <Typography variant="caption" sx={{ fontSize: 10.5, color: T.text2 }}>{dept}</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
