/* Riesgo de fuga de talento (AI-06).
 *
 * Vista master/detail:
 * - Stats strip con totales por banda + dominio de departamentos en alto riesgo.
 * - Lista rankeada con score heat-mapped y top drivers.
 * - Drawer con breakdown completo de los 6 factores ponderados.
 */
import { useEffect, useState } from "react";
import {
  Box, Stack, Typography, CircularProgress, Drawer, Chip, LinearProgress,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { attritionApi } from "../../api";
import type { AttritionList, AttritionResult } from "../../api/attrition";
import { notify } from "../../hooks/useToast";

const T = {
  bg: "#FFFFFF", bg2: "#F7F7F9", surface2: "#F2F2F5",
  rule: "#E5E5EA", rule2: "#D1D1D6",
  ink: "#1A1726", text2: "#605C70", text3: "#8E8A99",
  accent: "#02BDEA", accentD: "#0A4D70",
  amber: "#E08A0E", green: "#01B89E", red: "#D14040",
  mono: "'JetBrains Mono', monospace",
};

function bandColor(band: string) {
  if (band === "high") return T.red;
  if (band === "medium") return T.amber;
  return T.green;
}

function bandBg(band: string) {
  if (band === "high") return "rgba(209, 64, 64, 0.10)";
  if (band === "medium") return "rgba(224, 138, 14, 0.10)";
  return "rgba(1, 184, 158, 0.10)";
}

function bandLabel(band: string) {
  return ({ high: "Alto", medium: "Medio", low: "Bajo" } as Record<string, string>)[band] || band;
}

export default function AttritionPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<AttritionList | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AttritionResult | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setData(await attritionApi.listAttrition());
      } catch (e) {
        const err = e as { response?: { data?: { error?: string } } };
        notify({ kind: "error", msg: err.response?.data?.error || "Error cargando" });
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

  const deptEntries = Object.entries(data.by_department).sort((a, b) => b[1] - a[1]);

  return (
    <Box sx={{ px: { xs: "16px", md: "32px" }, pb: "32px", maxWidth: 1280, mx: "auto", color: T.ink }}>
      <Box sx={{ pb: "16px", mb: "20px", borderBottom: `1px solid ${T.rule}` }}>
        <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: "-0.025em", mb: 0.5 }}>
          {t("attrition.title")}
        </Typography>
        <Typography variant="body2" sx={{ color: T.text2 }}>
          {t("attrition.subtitle")}
        </Typography>
      </Box>

      {/* Stats strip */}
      <Box sx={{
        display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
        gap: 1.5, mb: 3,
      }}>
        <StatCard label={t("attrition.totalEmployees")} value={data.total_employees} accent={T.accent} />
        <StatCard label={t("attrition.highRisk")} value={data.high_risk} accent={T.red} />
        <StatCard label={t("attrition.mediumRisk")} value={data.medium_risk} accent={T.amber} />
        <StatCard label={t("attrition.lowRisk")} value={data.low_risk} accent={T.green} />
      </Box>

      {/* Departamentos con alto riesgo */}
      {deptEntries.length > 0 && (
        <Box sx={{ mb: 3, p: "14px 18px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg2 }}>
          <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", mb: 1 }}>
            Departamentos con casos de alto riesgo
          </Typography>
          <Stack direction="row" gap={1} flexWrap="wrap">
            {deptEntries.map(([dept, n]) => (
              <Chip
                key={dept}
                label={`${dept} · ${n}`}
                size="small"
                sx={{ bgcolor: T.bg, border: `1px solid ${T.rule}`, fontFamily: T.mono, fontSize: 11 }}
              />
            ))}
          </Stack>
        </Box>
      )}

      {/* Lista ranked */}
      <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", mb: 1 }}>
        Empleados rankeados por riesgo ({data.employees.length})
      </Typography>
      <Stack gap={0.75}>
        {data.employees.map((e) => (
          <Box
            key={e.employee_id}
            onClick={() => setSelected(e)}
            sx={{
              p: "12px 16px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg,
              borderLeft: `4px solid ${bandColor(e.risk_band)}`,
              cursor: "pointer", transition: "background 160ms",
              "&:hover": { bgcolor: T.bg2 },
              display: "grid",
              gridTemplateColumns: { xs: "1fr auto", md: "minmax(180px,1.5fr) minmax(120px,1fr) 2fr auto" },
              gap: 2, alignItems: "center",
            }}
          >
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: 13.5 }}>{e.employee_name}</Typography>
              <Typography variant="caption" sx={{ color: T.text3 }}>{e.position || "—"}</Typography>
            </Box>
            <Typography variant="body2" sx={{ color: T.text2, fontSize: 12.5, display: { xs: "none", md: "block" } }}>
              {e.department || "—"}
            </Typography>
            <Stack direction="row" gap={0.75} flexWrap="wrap" sx={{ display: { xs: "none", md: "flex" } }}>
              {e.top_drivers.map((d) => (
                <Chip key={d} label={d} size="small" sx={{
                  height: 18, fontSize: 10.5, fontFamily: T.mono,
                  bgcolor: T.surface2, color: T.text2,
                }} />
              ))}
            </Stack>
            <Box sx={{
              minWidth: 60, textAlign: "right",
              px: "10px", py: "4px", borderRadius: "6px",
              bgcolor: bandBg(e.risk_band),
            }}>
              <Typography sx={{
                fontFamily: T.mono, fontWeight: 700, fontSize: 16,
                color: bandColor(e.risk_band), lineHeight: 1,
              }}>
                {e.risk_score}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: 9.5, color: bandColor(e.risk_band), fontFamily: T.mono }}>
                {bandLabel(e.risk_band)}
              </Typography>
            </Box>
          </Box>
        ))}
      </Stack>

      {/* Drawer de detalle */}
      <Drawer
        anchor="right"
        open={!!selected}
        onClose={() => setSelected(null)}
        PaperProps={{ sx: { width: { xs: "100%", md: 440 }, p: 0 } }}
      >
        {selected && (
          <Box sx={{ p: "24px" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: T.ink }}>
                  {selected.employee_name}
                </Typography>
                <Typography variant="caption" sx={{ color: T.text3 }}>
                  {selected.position || "—"} · {selected.department || "— sin asignar"}
                </Typography>
              </Box>
              <Box sx={{
                px: "14px", py: "6px", borderRadius: "8px",
                bgcolor: bandBg(selected.risk_band),
                textAlign: "center", minWidth: 80,
              }}>
                <Typography sx={{ fontFamily: T.mono, fontWeight: 700, fontSize: 24, color: bandColor(selected.risk_band), lineHeight: 1 }}>
                  {selected.risk_score}
                </Typography>
                <Typography variant="caption" sx={{ fontSize: 10, color: bandColor(selected.risk_band), fontFamily: T.mono, fontWeight: 600 }}>
                  {bandLabel(selected.risk_band).toUpperCase()}
                </Typography>
              </Box>
            </Stack>

            <Box sx={{ p: "12px 14px", bgcolor: T.bg2, border: `1px solid ${T.rule}`, borderRadius: 2, mb: 3 }}>
              <Typography variant="caption" sx={{ color: T.text3, fontWeight: 600, textTransform: "uppercase", fontSize: 10.5, letterSpacing: "0.04em" }}>
                Top drivers
              </Typography>
              <Stack direction="row" gap={0.75} mt={0.5} flexWrap="wrap">
                {selected.top_drivers.map((d) => (
                  <Chip key={d} label={d} size="small" sx={{ height: 22, fontSize: 11.5, bgcolor: bandBg(selected.risk_band), color: bandColor(selected.risk_band), fontWeight: 600 }} />
                ))}
              </Stack>
            </Box>

            <Typography variant="caption" sx={{ color: T.text3, fontWeight: 600, textTransform: "uppercase", fontSize: 10.5, letterSpacing: "0.04em", display: "block", mb: 1.5 }}>
              Breakdown por factor
            </Typography>
            <Stack gap={2}>
              {selected.factors.map((f) => {
                const pct = Math.round(f.contribution);
                const maxPct = Math.round(f.weight * 100);
                const fill = (f.contribution / (f.weight * 100)) * 100;
                return (
                  <Box key={f.code}>
                    <Stack direction="row" justifyContent="space-between" alignItems="baseline" mb={0.5}>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
                        {f.label}
                      </Typography>
                      <Typography variant="caption" sx={{ fontFamily: T.mono, color: T.text3, fontSize: 11 }}>
                        {pct} / {maxPct} pts
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, fill)}
                      sx={{
                        height: 5, borderRadius: 3, bgcolor: T.surface2,
                        "& .MuiLinearProgress-bar": {
                          bgcolor: fill > 70 ? T.red : fill > 40 ? T.amber : T.green,
                          borderRadius: 3,
                        },
                      }}
                    />
                    <Typography variant="caption" sx={{ color: T.text2, fontSize: 11.5, mt: 0.5, display: "block", fontStyle: "italic" }}>
                      {f.rationale}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>

            <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${T.rule}` }}>
              <Typography variant="caption" sx={{ color: T.text3, fontSize: 11 }}>
                Score = Σ(factor.level × peso) × 100. Bandas: ≥50 alto (acción inmediata), 25-49 medio (vigilar), &lt;25 bajo. El motor es rule-based interpretable, no ML supervisado.
              </Typography>
            </Box>
          </Box>
        )}
      </Drawer>
    </Box>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <Box sx={{
      p: "14px 18px", border: `1px solid ${T.rule}`, borderRadius: 2,
      bgcolor: T.bg, borderLeft: `3px solid ${accent}`,
    }}>
      <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </Typography>
      <Typography sx={{ fontFamily: T.mono, fontWeight: 700, fontSize: 22, color: accent, lineHeight: 1.1, mt: 0.5 }}>
        {value}
      </Typography>
    </Box>
  );
}
