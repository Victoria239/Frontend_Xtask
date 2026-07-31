/* People Analytics avanzado (H-07).
 *
 * Cruza attrition + comp + tenure en métricas de talento:
 * - Stats norte
 * - 9-box grid (performance × retención) — la pieza estrella
 * - Distribución de antigüedad
 * - Span of control
 * - Segment risk heatmap
 * - Band saturation + diversity
 */
import { useEffect, useState } from "react";
import { Box, Stack, Typography, CircularProgress, Chip, Tooltip } from "@mui/material";
import { useTranslation } from "react-i18next";
import { peopleApi } from "../../api";
import type { PeopleOverview, NineBoxCell } from "../../api/people";
import { notify } from "../../hooks/useToast";

const T = {
  bg: "#FFFFFF", bg2: "#F7F7F9", surface2: "#F2F2F5",
  rule: "#E5E5EA", rule2: "#D1D1D6",
  ink: "#1A1726", text2: "#605C70", text3: "#8E8A99",
  accent: "#02BDEA", accentD: "#0A4D70",
  amber: "#E08A0E", green: "#01B89E", red: "#D14040", violet: "#7c3aed",
  mono: "'JetBrains Mono', monospace",
};

const SENIORITY_COLOR: Record<string, string> = {
  junior: T.amber, mid: T.accent, senior: T.violet, lead: T.green,
};

// Color de cada celda del 9-box según cuadrante
function nineBoxColor(pt: number, rt: number): string {
  // Estrella (2,2) y alto pot (2,1) → verde; estrella en riesgo (2,0) → rojo intenso
  if (pt === 2 && rt === 0) return T.red;          // estrella en riesgo
  if (pt === 2) return T.green;                     // estrellas / alto potencial
  if (pt === 0 && rt === 0) return "#7a1f1f";       // bajo rendimiento
  if (rt === 0) return T.amber;                     // cualquier riesgo alto
  if (pt === 1 && rt === 2) return T.accent;        // sólido confiable
  if (pt === 0) return T.text3;                     // bajo perf
  return T.accentD;                                  // core
}

export default function PeopleAnalyticsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<PeopleOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setData(await peopleApi.getPeopleOverview());
      } catch (e) {
        notify({ kind: "error", msg: "Error cargando people analytics" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <Box sx={{ p: "48px", textAlign: "center" }}><CircularProgress size={22} sx={{ color: T.accent }} /></Box>;
  }
  if (!data) return null;

  const maxTenure = Math.max(...data.tenure_distribution.map(b => b.count), 1);
  const sat = data.band_saturation;
  const satTotal = sat.below_p25 + sat.p25_p50 + sat.p50_p75 + sat.above_p75 || 1;

  return (
    <Box sx={{ px: { xs: "16px", md: "32px" }, pb: "32px", maxWidth: 1280, mx: "auto", color: T.ink }}>
      <Box sx={{ pb: "16px", mb: "20px", borderBottom: `1px solid ${T.rule}` }}>
        <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: "-0.025em", mb: 0.5 }}>
          {t("people.title", "People Analytics")}
        </Typography>
        <Typography variant="body2" sx={{ color: T.text2 }}>
          {t("people.subtitle", "Inteligencia de talento: 9-box, antigüedad, span of control y riesgo por segmento.")}
        </Typography>
      </Box>

      {/* Stats norte */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 1.5, mb: 3 }}>
        <Stat label={t("people.headcount", "Headcount")} value={String(data.total_employees)} accent={T.accent} />
        <Stat label={t("people.avgTenure", "Antigüedad media")} value={`${(data.avg_tenure_months / 12).toFixed(1)}a`} accent={T.violet} hint={`${data.avg_tenure_months}m`} />
        <Stat label={t("people.avgPerf", "Performance media")} value={`${Math.round(data.avg_performance * 100)}%`} accent={data.avg_performance >= 0.7 ? T.green : T.amber} />
        <Stat label={t("people.managers", "Managers")} value={String(data.managers_count)} accent={T.accentD} />
      </Box>

      {/* 9-box grid + Tenure */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.4fr 1fr" }, gap: 2, mb: 3 }}>
        {/* 9-box */}
        <Box sx={{ p: "20px 24px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg }}>
          <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", mb: 0.5 }}>
            9-Box · {t("people.nineBox", "Performance × Retención")}
          </Typography>
          <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5, display: "block", mb: 1.5 }}>
            {t("people.nineBoxHint", "Eje X: performance · Eje Y: retención (inverso del riesgo de fuga)")}
          </Typography>
          <NineBox cells={data.nine_box} />
        </Box>

        {/* Tenure distribution */}
        <Box sx={{ p: "20px 24px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg }}>
          <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", mb: 1.5 }}>
            {t("people.tenureDist", "Distribución de antigüedad")}
          </Typography>
          <Stack gap={1.5}>
            {data.tenure_distribution.map((b) => (
              <Box key={b.bucket}>
                <Stack direction="row" justifyContent="space-between" mb={0.4}>
                  <Typography variant="caption" sx={{ fontSize: 12, color: T.text2 }}>{b.bucket}</Typography>
                  <Typography sx={{ fontFamily: T.mono, fontWeight: 600, fontSize: 12 }}>{b.count}</Typography>
                </Stack>
                <Box sx={{ height: 8, bgcolor: T.surface2, borderRadius: 3, overflow: "hidden" }}>
                  <Box sx={{ height: "100%", width: `${(b.count / maxTenure) * 100}%`, bgcolor: T.violet, transition: "width 240ms" }} />
                </Box>
              </Box>
            ))}
          </Stack>

          {/* Band saturation mini */}
          <Box sx={{ mt: 2.5, pt: 2, borderTop: `1px solid ${T.rule}` }}>
            <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", mb: 1 }}>
              {t("people.bandSaturation", "Saturación de bandas")}
            </Typography>
            <Box sx={{ display: "flex", height: 24, borderRadius: 1.5, overflow: "hidden" }}>
              <SatSeg w={sat.below_p25 / satTotal} color={T.red} label="< P25" n={sat.below_p25} />
              <SatSeg w={sat.p25_p50 / satTotal} color={T.amber} label="P25-50" n={sat.p25_p50} />
              <SatSeg w={sat.p50_p75 / satTotal} color={T.accent} label="P50-75" n={sat.p50_p75} />
              <SatSeg w={sat.above_p75 / satTotal} color={T.green} label="> P75" n={sat.above_p75} />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Span of control + Segment risk */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1.3fr" }, gap: 2 }}>
        {/* Span of control */}
        <Box sx={{ p: "16px 20px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg }}>
          <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", mb: 1.5 }}>
            {t("people.spanOfControl", "Span of control")}
          </Typography>
          {data.span_of_control.length === 0 ? (
            <Typography variant="caption" sx={{ color: T.text3 }}>Sin managers con reportes</Typography>
          ) : (
            <Stack gap={1}>
              {data.span_of_control.map((s) => (
                <Tooltip key={s.manager_id} title={s.reports.join(", ")} placement="top" arrow>
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 1, alignItems: "center", cursor: "default" }}>
                    <Typography variant="body2" sx={{ fontSize: 13 }}>{s.manager_name}</Typography>
                    <Stack direction="row" gap={0.5} alignItems="center">
                      {Array.from({ length: s.direct_reports }).map((_, i) => (
                        <Box key={i} sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: T.accent }} />
                      ))}
                      <Typography sx={{ fontFamily: T.mono, fontSize: 11, color: T.text3, ml: 0.5 }}>{s.direct_reports}</Typography>
                    </Stack>
                  </Box>
                </Tooltip>
              ))}
            </Stack>
          )}
        </Box>

        {/* Segment risk heatmap */}
        <Box sx={{ p: "16px 20px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg }}>
          <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", mb: 1.5 }}>
            {t("people.segmentRisk", "Riesgo de fuga por segmento")}
          </Typography>
          <Stack gap={0.75}>
            {data.segment_risk.map((s, i) => {
              const c = s.avg_risk >= 50 ? T.red : s.avg_risk >= 30 ? T.amber : T.green;
              return (
                <Box key={i} sx={{
                  display: "grid", gridTemplateColumns: "1fr auto auto", gap: 1.5, alignItems: "center",
                  p: "8px 12px", borderRadius: 1.5, bgcolor: T.bg2,
                  borderLeft: `3px solid ${c}`,
                }}>
                  <Stack direction="row" gap={0.75} alignItems="center">
                    <Typography variant="body2" sx={{ fontSize: 12.5 }}>{s.department}</Typography>
                    <Chip label={s.seniority} size="small" sx={{
                      height: 16, fontSize: 9.5, fontFamily: T.mono,
                      bgcolor: `${SENIORITY_COLOR[s.seniority] || T.accent}15`,
                      color: SENIORITY_COLOR[s.seniority] || T.accent, fontWeight: 600,
                    }} />
                  </Stack>
                  <Typography variant="caption" sx={{ color: T.text3, fontFamily: T.mono, fontSize: 10.5 }}>
                    n={s.headcount}
                  </Typography>
                  <Box sx={{ minWidth: 42, textAlign: "right" }}>
                    <Typography sx={{ fontFamily: T.mono, fontWeight: 700, fontSize: 13, color: c }}>
                      {s.avg_risk}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Box>
      </Box>

      {/* Diversity por depto */}
      <Box sx={{ mt: 3, p: "16px 20px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg }}>
        <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", mb: 1.5 }}>
          {t("people.diversity", "Composición por departamento")}
        </Typography>
        <Stack gap={1}>
          {data.diversity.map((d) => (
            <Box key={d.department} sx={{
              display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.5fr 2fr auto" }, gap: 2, alignItems: "center",
              p: "10px 14px", border: `1px solid ${T.rule}`, borderRadius: 1.5,
            }}>
              <Box>
                <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>{d.department}</Typography>
                <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, fontFamily: T.mono }}>
                  {d.headcount} pax · avg €{(d.avg_salary / 1000).toFixed(0)}k
                </Typography>
              </Box>
              <Stack direction="row" gap={0.5} sx={{ display: { xs: "none", md: "flex" } }}>
                {Object.entries(d.seniority_mix).map(([sen, n]) => (
                  <Chip key={sen} label={`${sen} ${n}`} size="small" sx={{
                    height: 18, fontSize: 10, fontFamily: T.mono,
                    bgcolor: `${SENIORITY_COLOR[sen] || T.accent}15`,
                    color: SENIORITY_COLOR[sen] || T.accent, fontWeight: 600,
                  }} />
                ))}
              </Stack>
              <Typography variant="caption" sx={{ color: T.text3, fontFamily: T.mono, fontSize: 10.5, textAlign: "right" }}>
                σ €{(d.salary_spread / 1000).toFixed(1)}k
              </Typography>
            </Box>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}

/* ─── 9-box grid component ─── */
function NineBox({ cells }: { cells: NineBoxCell[] }) {
  // Construir matriz [perf_tier][retention_tier] para layout visual
  // Fila superior = alto perf (pt=2), columna derecha = alta retención (rt=2)
  const cellAt = (pt: number, rt: number) =>
    cells.find(c => c.perf_tier === pt && c.retention_tier === rt);

  return (
    <Box>
      <Box sx={{ display: "flex", gap: 1 }}>
        {/* Eje Y label */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 20 }}>
          <Typography sx={{
            fontSize: 9.5, color: T.text3, fontFamily: T.mono, fontWeight: 600,
            writingMode: "vertical-rl", transform: "rotate(180deg)", letterSpacing: "0.05em",
          }}>
            ← PERFORMANCE →
          </Typography>
        </Box>

        {/* Grid 3x3 */}
        <Box sx={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
          {[2, 1, 0].map((pt) =>
            [0, 1, 2].map((rt) => {
              const cell = cellAt(pt, rt);
              const count = cell?.count || 0;
              const color = nineBoxColor(pt, rt);
              return (
                <Tooltip
                  key={`${pt}-${rt}`}
                  title={cell && count > 0 ? cell.employees.map(e => e.name).join(", ") : (cell?.label || "")}
                  placement="top" arrow
                >
                  <Box sx={{
                    aspectRatio: "1.4", borderRadius: 1.5, p: "8px 10px",
                    bgcolor: count > 0 ? `${color}1A` : T.surface2,
                    border: `1.5px solid ${count > 0 ? `${color}55` : T.rule}`,
                    display: "flex", flexDirection: "column", justifyContent: "space-between",
                    cursor: count > 0 ? "default" : "default",
                    transition: "all 160ms",
                    "&:hover": count > 0 ? { bgcolor: `${color}28`, borderColor: color } : {},
                  }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 600, color: count > 0 ? color : T.text3, lineHeight: 1.15 }}>
                      {cell?.label}
                    </Typography>
                    <Typography sx={{ fontFamily: T.mono, fontSize: 20, fontWeight: 700, color: count > 0 ? color : T.rule2, alignSelf: "flex-end" }}>
                      {count}
                    </Typography>
                  </Box>
                </Tooltip>
              );
            })
          )}
        </Box>
      </Box>
      {/* Eje X label */}
      <Box sx={{ pl: "26px", mt: 0.5 }}>
        <Typography sx={{ fontSize: 9.5, color: T.text3, fontFamily: T.mono, fontWeight: 600, textAlign: "center", letterSpacing: "0.05em" }}>
          ← RIESGO DE FUGA · RETENCIÓN →
        </Typography>
      </Box>
    </Box>
  );
}

/* ─── Stat card ─── */
function Stat({ label, value, accent, hint }: { label: string; value: string; accent: string; hint?: string }) {
  return (
    <Box sx={{ p: "14px 18px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg, borderTop: `3px solid ${accent}` }}>
      <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </Typography>
      <Typography sx={{ fontFamily: T.mono, fontWeight: 700, fontSize: 22, color: accent, lineHeight: 1.1, mt: 0.5 }}>
        {value}
      </Typography>
      {hint && <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5, fontFamily: T.mono }}>{hint}</Typography>}
    </Box>
  );
}

/* ─── Band saturation segment ─── */
function SatSeg({ w, color, label, n }: { w: number; color: string; label: string; n: number }) {
  if (w === 0) return null;
  return (
    <Tooltip title={`${label}: ${n}`} arrow>
      <Box sx={{
        width: `${w * 100}%`, bgcolor: color, display: "flex", alignItems: "center", justifyContent: "center",
        minWidth: 24,
      }}>
        <Typography sx={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: "#fff" }}>{n}</Typography>
      </Box>
    </Tooltip>
  );
}
