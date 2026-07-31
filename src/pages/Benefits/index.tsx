/* Recomendación de beneficios (AI-05).
 *
 * El usuario elige un empleado y un presupuesto;
 * obtiene top-N beneficios rankeados con justificación.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Box, Button, Chip, CircularProgress, FormControl, InputLabel, MenuItem, Select,
  Stack, TextField, Typography,
} from "@mui/material";
import { predictionsApi, employeesApi } from "../../api";
import type { BenefitCatalogItem, RecommendResponse } from "../../api/predictions";
import type { Employee } from "../../types";
import { notify } from "../../hooks/useToast";

const T = {
  bg: "#FFFFFF", bg2: "#F7F7F9", surface2: "#F2F2F5",
  rule: "#E5E5EA", rule2: "#D1D1D6",
  ink: "#1A1726", text2: "#605C70", text3: "#8E8A99",
  accent: "#02BDEA", accentD: "#0A4D70",
  amber: "#E08A0E", green: "#01B89E", red: "#D14040",
  mono: "'JetBrains Mono', monospace",
};

const CAT_LABEL: Record<string, string> = {
  learning: "Aprendizaje",
  wellness: "Bienestar",
  financial: "Financiero",
  flexibility: "Flexibilidad",
  recognition: "Reconocimiento",
};

const CAT_COLOR: Record<string, string> = {
  learning: T.accent,
  wellness: T.green,
  financial: T.accentD,
  flexibility: T.amber,
  recognition: "#9B5BFF",
};

export default function BenefitsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empId, setEmpId] = useState<number | "">("");
  const [budget, setBudget] = useState(200);
  const [topN, setTopN] = useState(5);
  const [result, setResult] = useState<RecommendResponse | null>(null);
  const [catalog, setCatalog] = useState<BenefitCatalogItem[]>([]);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [emps, cat] = await Promise.all([
          employeesApi.getEmployees({ pageSize: 100 }),
          predictionsApi.benefitsCatalog(),
        ]);
        setEmployees(emps.data);
        setCatalog(cat);
        if (emps.data[0]) setEmpId(emps.data[0].id);
      } catch (e) {
        const err = e as { response?: { data?: { error?: string } } };
        notify({ kind: "error", msg: err.response?.data?.error || "Error cargando" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (empId) run();
  }, [empId, budget, topN]);

  const run = async () => {
    if (!empId) return;
    setRunning(true);
    try {
      const r = await predictionsApi.recommendBenefits(Number(empId), budget, topN);
      setResult(r);
    } catch (e) {
      const err = e as { response?: { data?: { error?: string; detail?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || err.response?.data?.detail || "Error" });
    } finally {
      setRunning(false);
    }
  };

  const employee = useMemo(() => employees.find((e) => e.id === empId), [employees, empId]);

  return (
    <Box sx={{ px: { xs: "16px", md: "32px" }, pb: "32px", maxWidth: 1200, mx: "auto", color: T.ink }}>
      <Box sx={{ pb: "16px", mb: "16px", borderBottom: `1px solid ${T.rule}` }}>
        <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: "-0.025em", mb: 0.5 }}>
          Recomendación de beneficios
        </Typography>
        <Typography variant="body2" sx={{ color: T.text2 }}>
          Sugerencias personalizadas para cada empleado según antigüedad, performance y rol. Reglas + scoring transparente.
        </Typography>
      </Box>

      {/* Controls */}
      <Stack direction="row" gap={2} mb={2.5} flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: 280 }}>
          <InputLabel>Empleado</InputLabel>
          <Select label="Empleado" value={empId} onChange={(e) => setEmpId(Number(e.target.value))}>
            {employees.map((e) => (
              <MenuItem key={e.id} value={e.id}>{e.first_name} {e.last_name} — {e.position || "—"}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField size="small" type="number" label="Presupuesto (€/mes)" value={budget} onChange={(e) => setBudget(Math.max(0, parseFloat(e.target.value) || 0))} sx={{ width: 150 }} />
        <TextField size="small" type="number" label="Top N" value={topN} onChange={(e) => setTopN(Math.max(1, Math.min(20, parseInt(e.target.value) || 5)))} sx={{ width: 90 }} />
        <Button variant="outlined" onClick={run} disabled={running || !empId} sx={{ borderColor: T.rule2, color: T.ink }}>
          Recalcular
        </Button>
      </Stack>

      {loading ? (
        <Box sx={{ p: "48px", textAlign: "center" }}><CircularProgress size={22} sx={{ color: T.accent }} /></Box>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
          {/* Recomendaciones */}
          <Box>
            {!result ? (
              <Box sx={{ p: "48px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg2, textAlign: "center" }}>
                <Typography variant="caption" sx={{ color: T.text3 }}>Elegí un empleado</Typography>
              </Box>
            ) : (
              <>
                {/* Header */}
                <Box sx={{ p: "16px 20px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg, mb: 2 }}>
                  <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                    Perfil
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, mt: 0.25 }}>{result.employee_name}</Typography>
                  <Stack direction="row" gap={3} mt={1.5}>
                    <Box>
                      <Typography variant="caption" sx={{ color: T.text3, fontSize: 10 }}>Antigüedad</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: T.mono }}>
                        {result.tenure_months} meses
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: T.text3, fontSize: 10 }}>Performance score</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: T.mono, color: result.performance_score >= 0.7 ? T.green : result.performance_score >= 0.4 ? T.amber : T.red }}>
                        {(result.performance_score * 100).toFixed(0)}%
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: T.text3, fontSize: 10 }}>Presupuesto</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: T.mono }}>
                        €{result.budget_eur.toFixed(0)}/mes
                      </Typography>
                    </Box>
                  </Stack>
                </Box>

                <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", mb: 1 }}>
                  Recomendaciones top-{result.recommendations.length}
                </Typography>
                {result.recommendations.length === 0 ? (
                  <Box sx={{ p: "32px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg2, textAlign: "center" }}>
                    <Typography variant="caption" sx={{ color: T.text3 }}>
                      Ningún beneficio elegible — ampliá el presupuesto o revisá los prerequisites.
                    </Typography>
                  </Box>
                ) : (
                  <Stack gap={1}>
                    {result.recommendations.map((r, i) => (
                      <Box key={r.benefit_code} sx={{
                        p: "14px 18px", border: `1px solid ${T.rule}`,
                        borderLeft: `4px solid ${CAT_COLOR[r.category] || T.accent}`,
                        borderRadius: 2, bgcolor: T.bg,
                      }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Stack direction="row" gap={1} alignItems="center">
                              <Box sx={{ fontFamily: T.mono, fontSize: 10, color: T.text3, minWidth: 18 }}>#{i + 1}</Box>
                              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 14 }}>{r.benefit_name}</Typography>
                              <Chip label={CAT_LABEL[r.category] || r.category} size="small" sx={{ height: 18, fontSize: 10, bgcolor: `${CAT_COLOR[r.category] || T.accent}15`, color: CAT_COLOR[r.category] || T.accent, fontWeight: 600 }} />
                            </Stack>
                            <Typography variant="caption" sx={{ color: T.text2, fontSize: 12, mt: 0.75, display: "block", fontStyle: "italic" }}>
                              {r.rationale}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: "right", ml: 2 }}>
                            <Typography variant="caption" sx={{ color: T.text3, fontSize: 10 }}>Score</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: T.accent, fontFamily: T.mono }}>
                              {(r.score * 100).toFixed(0)}
                            </Typography>
                            <Typography variant="caption" sx={{ color: T.text3, fontFamily: T.mono, fontSize: 11 }}>
                              €{r.monthly_cost_eur.toFixed(0)}/mes
                            </Typography>
                          </Box>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                )}
              </>
            )}
          </Box>

          {/* Catálogo */}
          <Box>
            <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", mb: 1 }}>
              Catálogo completo ({catalog.length})
            </Typography>
            <Stack gap={0.75}>
              {catalog.map((b) => (
                <Box key={b.code} sx={{ p: "10px 14px", border: `1px solid ${T.rule}`, borderRadius: 1.5, bgcolor: T.bg }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" gap={0.75} alignItems="center">
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12.5 }}>{b.name}</Typography>
                        <Chip label={CAT_LABEL[b.category] || b.category} size="small" sx={{ height: 16, fontSize: 9.5, bgcolor: T.surface2, color: T.text2 }} />
                      </Stack>
                      <Typography variant="caption" sx={{ color: T.text3, fontSize: 11 }}>{b.description}</Typography>
                      {(b.min_tenure_months > 0 || b.min_performance > 0) && (
                        <Stack direction="row" gap={0.75} mt={0.5}>
                          {b.min_tenure_months > 0 && (
                            <Chip label={`tenure ≥ ${b.min_tenure_months}m`} size="small" sx={{ height: 14, fontSize: 9, fontFamily: T.mono, bgcolor: T.surface2, color: T.text3 }} />
                          )}
                          {b.min_performance > 0 && (
                            <Chip label={`perf ≥ ${(b.min_performance * 100).toFixed(0)}%`} size="small" sx={{ height: 14, fontSize: 9, fontFamily: T.mono, bgcolor: T.surface2, color: T.text3 }} />
                          )}
                        </Stack>
                      )}
                    </Box>
                    <Typography variant="caption" sx={{ fontFamily: T.mono, color: T.text3 }}>
                      €{b.monthly_cost_eur}
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
