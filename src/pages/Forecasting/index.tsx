/* Forecasting de KPIs (AI-04).
 *
 * Layout:
 *   - Sidebar: lista de KPIs
 *   - Main: SVG con histórico + forecast + banda de confianza + target
 *   - Controles: horizonte, frecuencia, método (auto/linear/holt)
 */

import { useEffect, useMemo, useState } from "react";
import {
  Box, Button, Chip, CircularProgress, FormControl, InputLabel, MenuItem,
  Select, Stack, TextField, Typography,
} from "@mui/material";
import { predictionsApi, kpisApi } from "../../api";
import type { ForecastResponse } from "../../api/predictions";
import type { Kpi } from "../../types";
import { notify } from "../../hooks/useToast";

const T = {
  bg: "#FFFFFF", bg2: "#F7F7F9", surface2: "#F2F2F5",
  rule: "#E5E5EA", rule2: "#D1D1D6",
  ink: "#1A1726", text2: "#605C70", text3: "#8E8A99",
  accent: "#02BDEA", accentD: "#0A4D70", accentL: "#A8E5F3",
  amber: "#E08A0E", green: "#01B89E", red: "#D14040",
  mono: "'JetBrains Mono', monospace",
};

const METHOD_LABEL: Record<string, string> = {
  linear: "Regresión lineal",
  holt: "Holt (suavizado exponencial)",
  naive: "Naive (extrapolación)",
};

const METHOD_COLOR: Record<string, string> = {
  linear: T.accent,
  holt: T.green,
  naive: T.amber,
};

export default function ForecastingPage() {
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);

  /* Controles */
  const [horizon, setHorizon] = useState(6);
  const [freqDays, setFreqDays] = useState(30);
  const [method, setMethod] = useState<"auto" | "linear" | "holt" | "naive">("auto");

  useEffect(() => {
    (async () => {
      try {
        const k = await kpisApi.getKpis({ pageSize: 100 });
        setKpis(k.data);
        if (k.data[0]) setSelectedId(k.data[0].id);
      } catch (e) {
        const err = e as { response?: { data?: { error?: string } } };
        notify({ kind: "error", msg: err.response?.data?.error || "Error cargando KPIs" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedId) run(selectedId);
    else setForecast(null);
  }, [selectedId, horizon, freqDays, method]);

  const run = async (kpiId: number) => {
    setComputing(true);
    try {
      const f = await predictionsApi.forecastKpi(kpiId, {
        horizon, freq_days: freqDays,
        method: method === "auto" ? undefined : method,
      });
      setForecast(f);
    } catch (e) {
      const err = e as { response?: { data?: { error?: string; detail?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || err.response?.data?.detail || "Error" });
      setForecast(null);
    } finally {
      setComputing(false);
    }
  };

  /* SVG chart */
  const chart = useMemo(() => {
    if (!forecast) return null;
    const W = 800, H = 360;
    const padL = 50, padR = 20, padT = 20, padB = 40;
    const all = [...forecast.history, ...forecast.forecast];
    if (all.length === 0) return null;

    const times = all.map((p) => new Date(p.t).getTime());
    const minT = Math.min(...times);
    const maxT = Math.max(...times);
    const targets = [
      ...all.map((p) => p.ic_low ?? p.value),
      ...all.map((p) => p.ic_high ?? p.value),
      ...(forecast.target !== null ? [forecast.target] : []),
    ];
    const minV = Math.min(...targets, 0);
    const maxV = Math.max(...targets);
    const rangeV = Math.max(maxV - minV, 0.01);

    const x = (t: number) => padL + ((t - minT) / Math.max(maxT - minT, 1)) * (W - padL - padR);
    const y = (v: number) => H - padB - ((v - minV) / rangeV) * (H - padT - padB);

    const histPath = forecast.history.map((p, i) => `${i === 0 ? "M" : "L"} ${x(new Date(p.t).getTime())} ${y(p.value)}`).join(" ");
    const lastHist = forecast.history[forecast.history.length - 1];
    const forecastPoints = lastHist ? [lastHist, ...forecast.forecast] : forecast.forecast;
    const fcPath = forecastPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${x(new Date(p.t).getTime())} ${y(p.value)}`).join(" ");

    // Banda de confianza
    const bandPath = forecast.forecast.length > 0
      ? `M ${forecastPoints.map((p, i) => i === 0 ? `${x(new Date(p.t).getTime())} ${y(p.value)}` : `L ${x(new Date(p.t).getTime())} ${y(p.ic_high)}`).join(" ")}
         L ${[...forecast.forecast].reverse().map((p) => `${x(new Date(p.t).getTime())} ${y(p.ic_low)}`).join(" L ")}
         Z`
      : "";

    // ejes
    const ySteps = 5;
    const xSteps = Math.min(6, all.length);

    return { W, H, padL, padR, padT, padB, x, y, minT, maxT, minV, maxV, rangeV,
      histPath, fcPath, bandPath, ySteps, xSteps, lastHist };
  }, [forecast]);

  return (
    <Box sx={{ px: { xs: "16px", md: "32px" }, pb: "32px", maxWidth: 1280, mx: "auto", color: T.ink }}>
      <Box sx={{ pb: "16px", mb: "16px", borderBottom: `1px solid ${T.rule}` }}>
        <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: "-0.025em", mb: 0.5 }}>
          Forecast de KPIs
        </Typography>
        <Typography variant="body2" sx={{ color: T.text2 }}>
          Predicción del próximo período con banda de confianza al 95%. Decide el método automáticamente según los datos disponibles.
        </Typography>
      </Box>

      {/* Controls */}
      <Stack direction="row" gap={2} mb={2.5} flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>KPI</InputLabel>
          <Select label="KPI" value={selectedId || ""} onChange={(e) => setSelectedId(Number(e.target.value))}>
            {kpis.map((k) => (
              <MenuItem key={k.id} value={k.id}>{k.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField size="small" type="number" label="Horizonte" value={horizon} onChange={(e) => setHorizon(Math.max(1, Math.min(24, parseInt(e.target.value) || 6)))} sx={{ width: 110 }} />
        <TextField size="small" type="number" label="Días/punto" value={freqDays} onChange={(e) => setFreqDays(Math.max(1, parseInt(e.target.value) || 30))} sx={{ width: 110 }} />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Método</InputLabel>
          <Select label="Método" value={method} onChange={(e) => setMethod(e.target.value as "auto" | "linear" | "holt" | "naive")}>
            <MenuItem value="auto">Auto</MenuItem>
            <MenuItem value="linear">Regresión lineal</MenuItem>
            <MenuItem value="holt">Holt</MenuItem>
            <MenuItem value="naive">Naive</MenuItem>
          </Select>
        </FormControl>
        <Button variant="contained" onClick={() => selectedId && run(selectedId)} disabled={computing} sx={{ bgcolor: T.accent, "&:hover": { bgcolor: "#0496BA" } }}>
          {computing ? <CircularProgress size={16} sx={{ color: "#FFFFFF" }} /> : "Recalcular"}
        </Button>
      </Stack>

      {loading ? (
        <Box sx={{ p: "48px", textAlign: "center" }}><CircularProgress size={22} sx={{ color: T.accent }} /></Box>
      ) : !forecast || !chart ? (
        <Box sx={{ p: "48px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg2, textAlign: "center" }}>
          <Typography variant="body1" sx={{ color: T.ink, fontWeight: 500 }}>
            Sin datos suficientes para forecast
          </Typography>
          <Typography variant="caption" sx={{ color: T.text3, mt: 1, display: "block" }}>
            Cargá al menos 2-3 mediciones del KPI para que el motor pueda extrapolar.
          </Typography>
        </Box>
      ) : (
        <Box>
          {/* Stats header */}
          <Box sx={{ p: "16px 20px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg, mb: 2 }}>
            <Stack direction="row" gap={4} flexWrap="wrap">
              <Box>
                <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>Método</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: METHOD_COLOR[forecast.method] }}>
                  {METHOD_LABEL[forecast.method]}
                </Typography>
              </Box>
              {forecast.r2 !== null && (
                <Box>
                  <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>Calidad ajuste (R²)</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: forecast.r2 > 0.9 ? T.green : forecast.r2 > 0.6 ? T.amber : T.red, fontFamily: T.mono }}>
                    {forecast.r2.toFixed(3)}
                  </Typography>
                </Box>
              )}
              <Box>
                <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>Último valor</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: T.mono }}>
                  {forecast.last_observed_value?.toFixed(2) || "—"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>Predicción final</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: T.accent, fontFamily: T.mono }}>
                  {forecast.forecast[forecast.forecast.length - 1]?.value.toFixed(2)}
                </Typography>
              </Box>
              {forecast.target && (
                <Box>
                  <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>Target</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: T.green, fontFamily: T.mono }}>
                    {forecast.target.toFixed(2)}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Box>

          {/* SVG Chart */}
          <Box sx={{ p: "16px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg }}>
            <svg viewBox={`0 0 ${chart.W} ${chart.H}`} style={{ width: "100%", height: "auto", display: "block" }}>
              {/* Grid horizontal */}
              {Array.from({ length: chart.ySteps + 1 }).map((_, i) => {
                const v = chart.minV + (chart.rangeV * i) / chart.ySteps;
                const yv = chart.y(v);
                return (
                  <g key={`y${i}`}>
                    <line x1={chart.padL} y1={yv} x2={chart.W - chart.padR} y2={yv} stroke={T.rule} strokeWidth={0.5} strokeDasharray="2,2" />
                    <text x={chart.padL - 6} y={yv + 3} textAnchor="end" fontSize="10" fill={T.text3} fontFamily="monospace">
                      {v.toFixed(1)}
                    </text>
                  </g>
                );
              })}
              {/* Target line */}
              {forecast.target !== null && (
                <g>
                  <line x1={chart.padL} y1={chart.y(forecast.target)} x2={chart.W - chart.padR} y2={chart.y(forecast.target)} stroke={T.green} strokeWidth={1.5} strokeDasharray="4,3" />
                  <text x={chart.W - chart.padR - 4} y={chart.y(forecast.target) - 4} textAnchor="end" fontSize="10" fill={T.green} fontWeight="600">
                    target {forecast.target.toFixed(1)}
                  </text>
                </g>
              )}
              {/* Confidence band */}
              <path d={chart.bandPath} fill={T.accentL} fillOpacity={0.35} stroke="none" />
              {/* Historical line */}
              <path d={chart.histPath} stroke={T.ink} strokeWidth={2} fill="none" />
              {/* Forecast line */}
              <path d={chart.fcPath} stroke={T.accent} strokeWidth={2} strokeDasharray="5,3" fill="none" />
              {/* Points */}
              {forecast.history.map((p, i) => (
                <circle key={`h${i}`} cx={chart.x(new Date(p.t).getTime())} cy={chart.y(p.value)} r={3} fill={T.ink} />
              ))}
              {forecast.forecast.map((p, i) => (
                <circle key={`f${i}`} cx={chart.x(new Date(p.t).getTime())} cy={chart.y(p.value)} r={3} fill={T.accent} stroke="#FFF" strokeWidth={1} />
              ))}
              {/* X axis dates */}
              {forecast.history.concat(forecast.forecast).filter((_, i, arr) => i % Math.max(1, Math.floor(arr.length / 6)) === 0).map((p, i) => (
                <text key={`xl${i}`} x={chart.x(new Date(p.t).getTime())} y={chart.H - chart.padB + 15} textAnchor="middle" fontSize="9.5" fill={T.text3} fontFamily="monospace">
                  {new Date(p.t).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                </text>
              ))}
              {/* Separator: vertical line between history and forecast */}
              {chart.lastHist && (
                <line
                  x1={chart.x(new Date(chart.lastHist.t).getTime())} y1={chart.padT}
                  x2={chart.x(new Date(chart.lastHist.t).getTime())} y2={chart.H - chart.padB}
                  stroke={T.rule2} strokeWidth={1} strokeDasharray="1,2"
                />
              )}
            </svg>
            {/* Legend */}
            <Stack direction="row" gap={3} mt={1.5} justifyContent="center" flexWrap="wrap">
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box sx={{ width: 16, height: 2, bgcolor: T.ink }} />
                <Typography variant="caption" sx={{ fontSize: 11, color: T.text2 }}>Histórico</Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box sx={{ width: 16, height: 2, bgcolor: T.accent, borderBottom: `2px dashed ${T.accent}` }} />
                <Typography variant="caption" sx={{ fontSize: 11, color: T.text2 }}>Predicción</Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box sx={{ width: 16, height: 10, bgcolor: T.accentL, opacity: 0.6 }} />
                <Typography variant="caption" sx={{ fontSize: 11, color: T.text2 }}>IC 95%</Typography>
              </Box>
              {forecast.target !== null && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Box sx={{ width: 16, borderBottom: `2px dashed ${T.green}` }} />
                  <Typography variant="caption" sx={{ fontSize: 11, color: T.text2 }}>Target</Typography>
                </Box>
              )}
            </Stack>
          </Box>

          {/* Tabla forecast */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, display: "block", mb: 1 }}>
              Detalle de predicciones
            </Typography>
            <Stack gap={0.5}>
              {forecast.forecast.map((p, i) => (
                <Box key={i} sx={{ p: "10px 14px", border: `1px solid ${T.rule}`, borderRadius: 1.5, bgcolor: T.bg, display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 2, alignItems: "center" }}>
                  <Chip label={`t+${i + 1}`} size="small" sx={{ height: 18, fontSize: 10, fontFamily: T.mono, bgcolor: T.surface2, color: T.text2 }} />
                  <Typography variant="caption" sx={{ fontFamily: T.mono, fontSize: 11 }}>
                    {new Date(p.t).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
                  </Typography>
                  <Stack direction="row" gap={1} alignItems="center">
                    <Typography variant="caption" sx={{ fontFamily: T.mono, fontSize: 11, color: T.text3 }}>
                      [{p.ic_low.toFixed(2)}–{p.ic_high.toFixed(2)}]
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: T.mono, fontWeight: 700, color: T.accent, minWidth: 70, textAlign: "right" }}>
                      {p.value.toFixed(2)}
                    </Typography>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Box>
        </Box>
      )}
    </Box>
  );
}
