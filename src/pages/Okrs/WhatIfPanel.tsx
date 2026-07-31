/* What-if simulator de OKRs (AI-07).
 *
 * Mostrado como dialog sobre la página de OKRs.
 * El usuario mueve sliders en KRs y ve en tiempo real la cascada simulada.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Slider, Stack, TextField, Typography,
} from "@mui/material";
import { okrsApi } from "../../api";
import type { OkrTreeNode, WhatIfResponse } from "../../api/okrs";
import { notify } from "../../hooks/useToast";

const T = {
  bg: "#FFFFFF", bg2: "#F7F7F9", surface2: "#F2F2F5",
  rule: "#E5E5EA", rule2: "#D1D1D6",
  ink: "#1A1726", text2: "#605C70", text3: "#8E8A99",
  accent: "#02BDEA", accentD: "#0A4D70",
  amber: "#E08A0E", green: "#01B89E", red: "#D14040",
  mono: "'JetBrains Mono', monospace",
};

const STATUS_COLOR: Record<string, string> = {
  exceeded: T.green, met: T.green, "on-track": T.accent,
  "at-risk": T.amber, "off-track": T.red,
};

const STATUS_LABEL: Record<string, string> = {
  exceeded: "Superado", met: "Cumplido", "on-track": "En curso",
  "at-risk": "En riesgo", "off-track": "Fuera de curso",
};

interface Props {
  open: boolean;
  onClose: () => void;
  tree: OkrTreeNode[];
  period?: string;
}

interface FlatKr {
  id: number;
  okr_id: number;
  okr_name: string;
  name: string;
  baseline: number;
  target: number;
  current: number;
  unit: string | null;
}

function flattenKrs(nodes: OkrTreeNode[]): FlatKr[] {
  const out: FlatKr[] = [];
  const walk = (n: OkrTreeNode) => {
    for (const kr of n.key_results) {
      out.push({
        id: kr.id, okr_id: n.id, okr_name: n.objective,
        name: kr.name, baseline: Number(kr.baseline), target: Number(kr.target),
        current: Number(kr.current), unit: kr.unit,
      });
    }
    n.children.forEach(walk);
  };
  nodes.forEach(walk);
  return out;
}

export default function WhatIfPanel({ open, onClose, tree, period }: Props) {
  const allKrs = useMemo(() => flattenKrs(tree), [tree]);
  const [overrides, setOverrides] = useState<Record<number, number>>({});
  const [result, setResult] = useState<WhatIfResponse | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!open) {
      setOverrides({});
      setResult(null);
    }
  }, [open]);

  // Debounce: recalcular 400ms después del último cambio
  useEffect(() => {
    if (!open || Object.keys(overrides).length === 0) {
      setResult(null);
      return;
    }
    const t = setTimeout(() => run(), 400);
    return () => clearTimeout(t);
  }, [overrides, open]);

  const run = async () => {
    setRunning(true);
    try {
      const r = await okrsApi.whatif(overrides, period);
      setResult(r);
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "Error simulando" });
    } finally {
      setRunning(false);
    }
  };

  const reset = () => {
    setOverrides({});
    setResult(null);
  };

  const handleChange = (krId: number, value: number) => {
    setOverrides({ ...overrides, [krId]: value });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Simulación What-if</Typography>
            <Typography variant="caption" sx={{ color: T.text3 }}>
              Movés los valores de los KRs y ves cómo afecta a los OKRs en cascada. Sin persistir.
            </Typography>
          </Box>
          {running && <CircularProgress size={16} sx={{ color: T.accent }} />}
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
          {/* Sliders de KRs */}
          <Box>
            <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
              Key Results ({allKrs.length})
            </Typography>
            {allKrs.length === 0 ? (
              <Box sx={{ p: "32px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg2, textAlign: "center", mt: 1 }}>
                <Typography variant="caption" sx={{ color: T.text3 }}>Sin KRs cargados</Typography>
              </Box>
            ) : (
              <Stack gap={1.5} mt={1}>
                {allKrs.map((kr) => {
                  const current = overrides[kr.id] ?? kr.current;
                  const isOverridden = overrides[kr.id] !== undefined;
                  const range = kr.target - kr.baseline;
                  const max = kr.baseline + range * 1.5;
                  const min = Math.min(kr.baseline, 0);
                  return (
                    <Box key={kr.id} sx={{ p: "10px 14px", border: `1px solid ${isOverridden ? T.accent : T.rule}`, borderRadius: 1.5, bgcolor: isOverridden ? "rgba(2,189,234,0.04)" : T.bg }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12.5 }}>{kr.name}</Typography>
                          <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5 }}>
                            {kr.okr_name}
                          </Typography>
                        </Box>
                        <TextField
                          size="small" type="number" value={current}
                          onChange={(e) => handleChange(kr.id, parseFloat(e.target.value) || 0)}
                          sx={{ width: 90, "& input": { fontFamily: T.mono, textAlign: "right" } }}
                        />
                      </Stack>
                      <Slider
                        value={current}
                        min={min} max={max}
                        step={range > 0 ? range / 100 : 1}
                        onChange={(_, v) => handleChange(kr.id, v as number)}
                        sx={{
                          color: isOverridden ? T.accent : T.text3,
                          "& .MuiSlider-thumb": { width: 14, height: 14 },
                          "& .MuiSlider-track": { height: 3 },
                          "& .MuiSlider-rail": { height: 3 },
                        }}
                        marks={[
                          { value: kr.baseline, label: "" },
                          { value: kr.target, label: "" },
                        ]}
                      />
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" sx={{ color: T.text3, fontSize: 10, fontFamily: T.mono }}>
                          baseline {kr.baseline}
                        </Typography>
                        <Typography variant="caption" sx={{ color: T.green, fontSize: 10, fontFamily: T.mono, fontWeight: 600 }}>
                          target {kr.target}
                        </Typography>
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Box>

          {/* Resultado */}
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                Impacto en cascada
              </Typography>
              {Object.keys(overrides).length > 0 && (
                <Button size="small" onClick={reset} sx={{ color: T.text2 }}>Reset</Button>
              )}
            </Stack>
            {!result || result.affected_okrs.length === 0 ? (
              <Box sx={{ p: "32px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg2, textAlign: "center", mt: 1 }}>
                <Typography variant="caption" sx={{ color: T.text3 }}>
                  {Object.keys(overrides).length === 0
                    ? "Mové un slider para ver el efecto"
                    : "Sin OKRs impactados"}
                </Typography>
              </Box>
            ) : (
              <Stack gap={1} mt={1}>
                {result.affected_okrs.map((o) => (
                  <Box key={o.id} sx={{ p: "12px 14px", border: `1px solid ${T.rule}`, borderRadius: 1.5, bgcolor: T.bg }}>
                    <Stack direction="row" gap={1} alignItems="center" mb={1}>
                      <Chip label={o.scope} size="small" sx={{ height: 18, fontSize: 10, bgcolor: T.surface2, color: T.text2 }} />
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {o.objective}
                      </Typography>
                    </Stack>
                    <Box sx={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 1.5, alignItems: "center" }}>
                      <Box sx={{ textAlign: "center" }}>
                        <Typography variant="caption" sx={{ color: T.text3, fontSize: 10 }}>Actual</Typography>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75 }}>
                          <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: T.mono, color: STATUS_COLOR[o.current_status] }}>
                            {Number(o.current_progress).toFixed(0)}%
                          </Typography>
                        </Box>
                        <Chip label={STATUS_LABEL[o.current_status] || o.current_status} size="small" sx={{ height: 16, fontSize: 9, bgcolor: `${STATUS_COLOR[o.current_status]}15`, color: STATUS_COLOR[o.current_status] }} />
                      </Box>
                      <ArrowRight delta={o.delta_progress} />
                      <Box sx={{ textAlign: "center" }}>
                        <Typography variant="caption" sx={{ color: T.text3, fontSize: 10 }}>Simulado</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: T.mono, color: STATUS_COLOR[o.sim_status] }}>
                          {Number(o.sim_progress).toFixed(0)}%
                        </Typography>
                        <Chip label={STATUS_LABEL[o.sim_status] || o.sim_status} size="small" sx={{ height: 16, fontSize: 9, bgcolor: `${STATUS_COLOR[o.sim_status]}15`, color: STATUS_COLOR[o.sim_status] }} />
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}

function ArrowRight({ delta }: { delta: number }) {
  const color = delta > 0 ? T.green : delta < 0 ? T.red : T.text3;
  return (
    <Box sx={{ textAlign: "center" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5, color }}>
        <Typography variant="caption" sx={{ fontFamily: T.mono, fontSize: 11, fontWeight: 600 }}>
          {delta > 0 ? "+" : ""}{delta.toFixed(1)}
        </Typography>
      </Box>
      <svg width={48} height={20} viewBox="0 0 48 20">
        <line x1="2" y1="10" x2="42" y2="10" stroke={color} strokeWidth={2} />
        <polyline points="38,6 44,10 38,14" fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      </svg>
    </Box>
  );
}
