/* Reviews 360° (H-05).
 *
 * Tabs:
 * - Pendientes: reviews que debo completar
 * - Mis evaluaciones: scores agregados de mí cuando los ciclos cierran
 * - Admin: gestión de ciclos (solo manager)
 *
 * El form de review se abre como Drawer con sliders 1-5 por pregunta + comentario.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Box, Stack, Typography, CircularProgress, Drawer, Chip, Tabs, Tab,
  Slider, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Select, MenuItem, FormControl, InputLabel,
} from "@mui/material";
import { reviewsApi } from "../../api";
import type { AssignmentSummary, ReviewCycle, ReviewForm, ReviewSummary } from "../../api/reviews";
import { notify } from "../../hooks/useToast";

const T = {
  bg: "#FFFFFF", bg2: "#F7F7F9", surface2: "#F2F2F5",
  rule: "#E5E5EA", rule2: "#D1D1D6",
  ink: "#1A1726", text2: "#605C70", text3: "#8E8A99",
  accent: "#02BDEA", accentD: "#0A4D70",
  amber: "#E08A0E", green: "#01B89E", red: "#D14040", violet: "#7c3aed",
  mono: "'JetBrains Mono', monospace",
};

const ROLE_LABEL: Record<string, string> = {
  self: "Auto-evaluación", manager: "Manager", peer: "Peer", report: "Subordinado",
};
const ROLE_COLOR: Record<string, string> = {
  self: T.accent, manager: T.violet, peer: T.amber, report: T.green,
};
const CAT_LABEL: Record<string, string> = {
  performance: "Performance", collaboration: "Colaboración",
  growth: "Crecimiento", leadership: "Liderazgo",
};

export default function ReviewsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<AssignmentSummary[]>([]);
  const [mySumm, setMySumm] = useState<ReviewSummary[]>([]);
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);
  const [openForm, setOpenForm] = useState<ReviewForm | null>(null);
  const [openCreate, setOpenCreate] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const [p, s, c] = await Promise.all([
        reviewsApi.myPending().catch(() => []),
        reviewsApi.mySummary().catch(() => []),
        reviewsApi.listCycles().catch(() => []),
      ]);
      setPending(p); setMySumm(s); setCycles(c);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { refresh(); }, []);

  return (
    <Box sx={{ px: { xs: "16px", md: "32px" }, pb: "32px", maxWidth: 1200, mx: "auto", color: T.ink }}>
      <Box sx={{ pb: "16px", mb: "16px", borderBottom: `1px solid ${T.rule}` }}>
        <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: "-0.025em", mb: 0.5 }}>
          {t("reviews.title")}
        </Typography>
        <Typography variant="body2" sx={{ color: T.text2 }}>
          {t("reviews.subtitle")}
        </Typography>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2.5, borderBottom: `1px solid ${T.rule}` }}>
        <Tab label={`${t("reviews.pending")} (${pending.length})`} />
        <Tab label={t("reviews.myReviews")} />
        <Tab label={t("reviews.admin")} />
      </Tabs>

      {loading ? (
        <Box sx={{ p: "48px", textAlign: "center" }}>
          <CircularProgress size={22} sx={{ color: T.accent }} />
        </Box>
      ) : tab === 0 ? (
        <PendingTab items={pending} onPick={async (a) => {
          try {
            const f = await reviewsApi.getForm(a.id);
            setOpenForm(f);
          } catch {
            notify({ kind: "error", msg: "No se pudo cargar el formulario" });
          }
        }} />
      ) : tab === 1 ? (
        <SummaryTab items={mySumm} />
      ) : (
        <AdminTab
          cycles={cycles}
          onCreate={() => setOpenCreate(true)}
          onAssign={async (id) => {
            try {
              const r = await reviewsApi.assignCycle(id);
              notify({ kind: "success", msg: `${r.assignments_created} asignaciones creadas` });
              refresh();
            } catch { notify({ kind: "error", msg: "Error al asignar" }); }
          }}
          onClose={async (id) => {
            try {
              const r = await reviewsApi.closeCycle(id);
              notify({ kind: "success", msg: `Ciclo cerrado con ${r.summaries} agregados` });
              refresh();
            } catch { notify({ kind: "error", msg: "Error al cerrar" }); }
          }}
        />
      )}

      {/* Form drawer */}
      <Drawer
        anchor="right" open={!!openForm} onClose={() => setOpenForm(null)}
        PaperProps={{ sx: { width: { xs: "100%", md: 520 }, p: 0 } }}
      >
        {openForm && (
          <ReviewFormPanel
            form={openForm}
            onClose={() => setOpenForm(null)}
            onSubmit={async (responses) => {
              try {
                await reviewsApi.submit(openForm.assignment_id, responses);
                notify({ kind: "success", msg: "Review enviada" });
                setOpenForm(null);
                refresh();
              } catch { notify({ kind: "error", msg: "Error al enviar" }); }
            }}
          />
        )}
      </Drawer>

      <CreateCycleDialog
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreated={() => { setOpenCreate(false); refresh(); }}
      />
    </Box>
  );
}

/* ─── Pending tab ─── */
function PendingTab({ items, onPick }: { items: AssignmentSummary[]; onPick: (a: AssignmentSummary) => void }) {
  if (items.length === 0) {
    return <EmptyHint icon="✅" title="No tenés reviews pendientes" sub="Cuando tu manager o HR abran un ciclo te aparecerán aquí." />;
  }
  return (
    <Stack gap={1}>
      {items.map((a) => (
        <Box key={a.id} onClick={() => onPick(a)} sx={{
          p: "14px 18px", border: `1px solid ${T.rule}`, borderRadius: 2,
          bgcolor: T.bg, cursor: "pointer", transition: "background 160ms",
          borderLeft: `4px solid ${ROLE_COLOR[a.role] || T.accent}`,
          display: "grid", gridTemplateColumns: { xs: "1fr auto", md: "1.4fr 0.8fr 0.6fr auto" },
          gap: 1.5, alignItems: "center",
          "&:hover": { bgcolor: T.bg2 },
        }}>
          <Box>
            <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{a.target_name}</Typography>
            <Typography variant="caption" sx={{ color: T.text3, fontSize: 11 }}>{a.cycle_name}</Typography>
          </Box>
          <Chip label={ROLE_LABEL[a.role]} size="small" sx={{
            height: 20, fontSize: 11, bgcolor: `${ROLE_COLOR[a.role]}15`, color: ROLE_COLOR[a.role], fontWeight: 600,
            display: { xs: "none", md: "inline-flex" },
          }} />
          <Typography variant="caption" sx={{ color: T.text3, fontFamily: T.mono, fontSize: 11, display: { xs: "none", md: "block" } }}>
            {a.cycle_period}
          </Typography>
          <Button size="small" variant="outlined" sx={{ borderColor: T.rule2, color: T.ink }}>
            Completar
          </Button>
        </Box>
      ))}
    </Stack>
  );
}

/* ─── Summary tab (mis resultados) ─── */
function SummaryTab({ items }: { items: ReviewSummary[] }) {
  if (items.length === 0) {
    return <EmptyHint icon="📊" title="Sin evaluaciones cerradas todavía" sub="Cuando un ciclo se cierre verás tu score agregado aquí, con breakdown por categoría y por tipo de reviewer." />;
  }
  return (
    <Stack gap={2}>
      {items.map((s) => (
        <Box key={s.cycle_id} sx={{ p: "20px 24px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: 15 }}>{s.cycle_name}</Typography>
              <Typography variant="caption" sx={{ color: T.text3 }}>{s.cycle_period} · {s.responses_count} respuestas</Typography>
            </Box>
            <Box sx={{ textAlign: "right" }}>
              <Typography sx={{ fontFamily: T.mono, fontWeight: 700, fontSize: 28, color: scoreColor(s.overall_score), lineHeight: 1 }}>
                {s.overall_score.toFixed(1)}
              </Typography>
              <Typography variant="caption" sx={{ color: T.text3, fontSize: 10 }}>
                de 5.0
              </Typography>
            </Box>
          </Stack>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
            <Box>
              <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                Por categoría
              </Typography>
              <Stack gap={1} mt={1}>
                {Object.entries(s.by_category).map(([cat, score]) => (
                  <ScoreBar key={cat} label={CAT_LABEL[cat] || cat} value={score} />
                ))}
              </Stack>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                Por tipo de reviewer
              </Typography>
              <Stack gap={1} mt={1}>
                {Object.entries(s.by_role).map(([role, score]) => (
                  <ScoreBar key={role} label={ROLE_LABEL[role] || role} value={score} color={ROLE_COLOR[role]} />
                ))}
              </Stack>
            </Box>
          </Box>
        </Box>
      ))}
    </Stack>
  );
}

function ScoreBar({ label, value, color }: { label: string; value: number; color?: string }) {
  const pct = (value / 5) * 100;
  const c = color || scoreColor(value);
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" mb={0.4}>
        <Typography variant="caption" sx={{ fontSize: 12 }}>{label}</Typography>
        <Typography sx={{ fontFamily: T.mono, fontWeight: 600, fontSize: 12, color: c }}>{value.toFixed(1)}</Typography>
      </Stack>
      <Box sx={{ height: 4, bgcolor: T.surface2, borderRadius: 2, overflow: "hidden" }}>
        <Box sx={{ height: "100%", width: `${pct}%`, bgcolor: c, transition: "width 240ms" }} />
      </Box>
    </Box>
  );
}

function scoreColor(v: number) {
  if (v >= 4) return T.green;
  if (v >= 3) return T.accent;
  if (v >= 2) return T.amber;
  return T.red;
}

/* ─── Admin tab ─── */
function AdminTab({ cycles, onCreate, onAssign, onClose }: {
  cycles: ReviewCycle[];
  onCreate: () => void;
  onAssign: (id: number) => void;
  onClose: (id: number) => void;
}) {
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>
          Ciclos ({cycles.length})
        </Typography>
        <Button variant="outlined" size="small" onClick={onCreate} sx={{ borderColor: T.rule2, color: T.ink }}>
          + Nuevo ciclo
        </Button>
      </Stack>
      {cycles.length === 0 ? (
        <EmptyHint icon="🗓️" title="Aún no hay ciclos creados" sub="Crea el primero para abrir el ciclo de evaluación trimestral." />
      ) : (
        <Stack gap={1}>
          {cycles.map((c) => (
            <Box key={c.id} sx={{
              p: "14px 18px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg,
              display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.5fr 0.6fr 1fr auto" },
              gap: 2, alignItems: "center",
            }}>
              <Box>
                <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{c.name}</Typography>
                <Typography variant="caption" sx={{ color: T.text3 }}>
                  {c.period} · {c.assignments_count} asignaciones · {c.submitted_count} enviadas
                </Typography>
              </Box>
              <Chip
                label={c.status}
                size="small"
                sx={{
                  height: 20, fontSize: 11, fontFamily: T.mono, textTransform: "uppercase", letterSpacing: "0.04em",
                  bgcolor: c.status === "closed" ? T.surface2 : c.status === "in_progress" ? "rgba(2,189,234,0.15)" : "rgba(224,138,14,0.15)",
                  color: c.status === "closed" ? T.text3 : c.status === "in_progress" ? T.accent : T.amber,
                  fontWeight: 600,
                }}
              />
              <Typography variant="caption" sx={{ color: T.text3, fontFamily: T.mono, fontSize: 11 }}>
                {c.deadline ? `límite ${c.deadline}` : "sin límite"}
              </Typography>
              <Stack direction="row" gap={1}>
                {c.status !== "closed" && (
                  <Button size="small" variant="outlined" onClick={() => onAssign(c.id)} sx={{ borderColor: T.rule2, color: T.ink }}>
                    Reasignar
                  </Button>
                )}
                {c.status !== "closed" && (
                  <Button size="small" variant="outlined" onClick={() => onClose(c.id)} sx={{ borderColor: T.red, color: T.red }}>
                    Cerrar
                  </Button>
                )}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}

function CreateCycleDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("Q3 Review Cycle");
  const [period, setPeriod] = useState("2026-Q3");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Nuevo ciclo de review</DialogTitle>
      <DialogContent>
        <Stack gap={2} mt={1}>
          <TextField label="Nombre" size="small" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
          <FormControl size="small" fullWidth>
            <InputLabel>Período</InputLabel>
            <Select value={period} label="Período" onChange={(e) => setPeriod(e.target.value)}>
              <MenuItem value="2026-Q3">2026-Q3</MenuItem>
              <MenuItem value="2026-Q4">2026-Q4</MenuItem>
              <MenuItem value="2026-H2">2026-H2</MenuItem>
            </Select>
          </FormControl>
          <TextField label="Deadline (opcional)" type="date" size="small" InputLabelProps={{ shrink: true }} value={deadline} onChange={(e) => setDeadline(e.target.value)} fullWidth />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained" disabled={loading}
          onClick={async () => {
            setLoading(true);
            try {
              await reviewsApi.createCycle({ name, period, deadline: deadline || null });
              notify({ kind: "success", msg: "Ciclo creado. Asignalo desde la lista." });
              onCreated();
            } catch {
              notify({ kind: "error", msg: "Error al crear" });
            } finally {
              setLoading(false);
            }
          }}
        >
          Crear
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ─── Review form ─── */
function ReviewFormPanel({ form, onClose, onSubmit }: {
  form: ReviewForm;
  onClose: () => void;
  onSubmit: (responses: { question_code: string; score: number; comment?: string }[]) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, { score: number; comment: string }>>(() =>
    Object.fromEntries(form.questions.map(q => [q.code, { score: 3, comment: "" }])),
  );
  const allAnswered = form.questions.every(q => (answers[q.code]?.score ?? 0) > 0);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ p: "20px 24px", borderBottom: `1px solid ${T.rule}`, flexShrink: 0 }}>
        <Chip label={ROLE_LABEL[form.role]} size="small" sx={{
          bgcolor: `${ROLE_COLOR[form.role]}15`, color: ROLE_COLOR[form.role], fontWeight: 600, fontSize: 11, mb: 1.5,
        }} />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>Evaluación de {form.target_name}</Typography>
        {form.target_position && (
          <Typography variant="caption" sx={{ color: T.text3 }}>{form.target_position}</Typography>
        )}
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", p: "20px 24px" }}>
        <Stack gap={3}>
          {form.questions.map((q, i) => (
            <Box key={q.code}>
              <Stack direction="row" gap={1} alignItems="baseline" mb={1}>
                <Chip
                  label={CAT_LABEL[q.category] || q.category}
                  size="small"
                  sx={{ height: 16, fontSize: 9.5, fontFamily: T.mono, bgcolor: T.surface2, color: T.text2 }}
                />
                <Typography variant="caption" sx={{ color: T.text3, fontFamily: T.mono, fontSize: 10 }}>
                  {i + 1} / {form.questions.length}
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{ fontWeight: 500, fontSize: 13.5, mb: 1.5 }}>
                {q.text}
              </Typography>
              <Box sx={{ px: "10px" }}>
                <Slider
                  value={answers[q.code]?.score || 3}
                  onChange={(_, v) => setAnswers(a => ({ ...a, [q.code]: { ...(a[q.code] || { comment: "" }), score: v as number } }))}
                  min={1} max={5} step={1} marks
                  valueLabelDisplay="auto"
                  sx={{
                    color: scoreColor(answers[q.code]?.score || 3),
                    "& .MuiSlider-thumb": { width: 16, height: 16 },
                  }}
                />
                <Stack direction="row" justifyContent="space-between" sx={{ fontSize: 10, color: T.text3, fontFamily: T.mono, mt: -0.5, mb: 1 }}>
                  <span>1 · Por debajo</span>
                  <span>3 · Cumple</span>
                  <span>5 · Excepcional</span>
                </Stack>
              </Box>
              <TextField
                placeholder="Comentario opcional..."
                size="small" multiline rows={2} fullWidth
                value={answers[q.code]?.comment || ""}
                onChange={(e) => setAnswers(a => ({ ...a, [q.code]: { ...(a[q.code] || { score: 3 }), comment: e.target.value } }))}
              />
            </Box>
          ))}
        </Stack>
      </Box>

      <Box sx={{ p: "16px 24px", borderTop: `1px solid ${T.rule}`, flexShrink: 0 }}>
        <Stack direction="row" gap={1} justifyContent="flex-end">
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="contained" disabled={!allAnswered}
            onClick={() => onSubmit(
              form.questions.map(q => ({
                question_code: q.code,
                score: answers[q.code].score,
                comment: answers[q.code].comment || undefined,
              }))
            )}
          >
            Enviar review
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}

function EmptyHint({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <Box sx={{ p: "48px 24px", textAlign: "center", border: `1px dashed ${T.rule}`, borderRadius: 2, bgcolor: T.bg2 }}>
      <Typography sx={{ fontSize: 36, mb: 1 }}>{icon}</Typography>
      <Typography sx={{ fontWeight: 600, fontSize: 14, mb: 0.5 }}>{title}</Typography>
      <Typography variant="caption" sx={{ color: T.text3, fontSize: 12 }}>{sub}</Typography>
    </Box>
  );
}
