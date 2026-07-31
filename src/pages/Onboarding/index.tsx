/* Onboarding (H-02) · checklist por empleado.
 *
 * Layout:
 *   ┌─────────────┬─────────────────────────────┐
 *   │ Lista       │  Header con % progreso      │
 *   │ empleados   ├─────────────────────────────┤
 *   │ con %       │  Steps con status togglable │
 *   └─────────────┴─────────────────────────────┘
 *
 * Cada step se puede marcar done/skip/reset desde la UI.
 * Cuando todos los required están done, el assignment auto-completa
 * y se dispara una notif al user.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Box, Chip, CircularProgress, IconButton, Alert,
  Stack, Tooltip, Typography, Button, MenuItem, Select, FormControl, InputLabel,
} from "@mui/material";
import { onboardingApi, employeesApi } from "../../api";
import type { Assignment, AssignmentStep, Summary, Template } from "../../api/onboarding";
import type { Employee } from "../../types";
import { notify } from "../../hooks/useToast";

const T = {
  bg: "#FFFFFF",
  bg2: "#F7F7F9",
  surface2: "#F2F2F5",
  rule: "#E5E5EA",
  rule2: "#D1D1D6",
  ink: "#1A1726",
  text2: "#605C70",
  text3: "#8E8A99",
  accent: "#02BDEA",
  accent2: "#01E3D5",
  brand: "#251948",
  amber: "#E08A0E",
  green: "#01B89E",
  red: "#D14040",
  mono: "'JetBrains Mono', monospace",
};

const CATEGORY_COLOR: Record<string, string> = {
  profile: "#7C5CFF",
  legal: T.amber,
  benefits: T.accent2,
  it: T.accent,
  manager: T.brand,
  culture: "#9B4DFF",
  kpis: T.green,
  general: T.text3,
};

export default function OnboardingPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [summary, setSummary] = useState<Summary[]>([]);
  const [activeEmp, setActiveEmp] = useState<number | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingEmp, setLoadingEmp] = useState(true);
  const [loadingAsg, setLoadingAsg] = useState(false);
  const [savingStep, setSavingStep] = useState<number | null>(null);
  const [assigning, setAssigning] = useState(false);
  
  /* Carga empleados + summary + templates al montar */
  useEffect(() => {
    (async () => {
      try {
        const [empRes, sumRes, tplRes] = await Promise.allSettled([
          employeesApi.getEmployees({ pageSize: 100 }),
          onboardingApi.summary(),
          onboardingApi.listTemplates(),
        ]);
        if (empRes.status === "fulfilled") {
          setEmployees(empRes.value.data);
          if (empRes.value.data.length > 0) setActiveEmp(empRes.value.data[0].id);
        }
        if (sumRes.status === "fulfilled") setSummary(sumRes.value);
        if (tplRes.status === "fulfilled") setTemplates(tplRes.value);
      } catch (e) {
        const err = e as { response?: { data?: { error?: string } } };
        notify({ kind: "error", msg: err.response?.data?.error || "Error cargando datos" });
      } finally {
        setLoadingEmp(false);
      }
    })();
  }, []);

  /* Al cambiar empleado activo, traer su assignment */
  useEffect(() => {
    if (activeEmp == null) return;
    let cancel = false;
    setLoadingAsg(true);
    onboardingApi.getForEmployee(activeEmp)
      .then((a) => { if (!cancel) setAssignment(a); })
      .catch((e) => {
        const err = e as { response?: { data?: { error?: string } } };
        if (!cancel) notify({ kind: "error", msg: err.response?.data?.error || "No se cargó el onboarding" });
      })
      .finally(() => { if (!cancel) setLoadingAsg(false); });
    return () => { cancel = true; };
  }, [activeEmp]);

  const reloadSummary = () => onboardingApi.summary().then(setSummary).catch(() => {});

  const handleAssign = async () => {
    if (activeEmp == null) return;
    setAssigning(true);
    try {
      const a = await onboardingApi.assign(activeEmp);
      setAssignment(a);
      reloadSummary();
      notify({ kind: "success", msg: "Onboarding asignado" });
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "No se pudo asignar (¿hay template default?)" });
    } finally {
      setAssigning(false);
    }
  };

  const handleStepChange = async (step: AssignmentStep, status: "done" | "skipped" | "pending") => {
    setSavingStep(step.id);
    try {
      const a = await onboardingApi.updateStep(step.id, status);
      setAssignment(a);
      reloadSummary();
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "No se pudo actualizar el paso" });
    } finally {
      setSavingStep(null);
    }
  };

  const empByid = useMemo(() => {
    const m = new Map<number, Employee>();
    for (const e of employees) m.set(e.id, e);
    return m;
  }, [employees]);

  const activeEmployee = activeEmp != null ? empByid.get(activeEmp) || null : null;

  /* Progress del assignment activo */
  const progress = useMemo(() => {
    if (!assignment) return { total: 0, done: 0, pct: 0 };
    const total = assignment.steps.length;
    const done = assignment.steps.filter((s) => s.status === "done" || s.status === "skipped").length;
    return { total, done, pct: total > 0 ? (done / total) * 100 : 0 };
  }, [assignment]);

  return (
    <Box sx={{ px: { xs: "16px", md: "32px" }, pb: "32px", maxWidth: 1280, mx: "auto", color: T.ink }}>
      {/* Header */}
      <Box sx={{ pb: "16px", mb: "20px", borderBottom: `1px solid ${T.rule}`, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: "-0.025em", color: T.ink, mb: 0.5 }}>
            Onboarding
          </Typography>
          <Typography variant="body2" sx={{ color: T.text2 }}>
            Checklist de bienvenida por empleado · {templates.length} template{templates.length !== 1 ? "s" : ""} disponible{templates.length !== 1 ? "s" : ""}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "280px 1fr" }, gap: "24px", minHeight: "60vh" }}>
        {/* ── Lista empleados con progress ── */}
        <Box sx={{ border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg, overflow: "hidden", height: "fit-content" }}>
          <Box sx={{ p: "14px 16px", borderBottom: `1px solid ${T.rule}`, bgcolor: T.bg2 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: T.text2, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 11 }}>
              Empleados ({employees.length})
            </Typography>
          </Box>
          {loadingEmp ? (
            <Box sx={{ p: "32px", textAlign: "center" }}>
              <CircularProgress size={20} sx={{ color: T.accent }} />
            </Box>
          ) : employees.length === 0 ? (
            <Box sx={{ p: "24px", textAlign: "center" }}>
              <Typography variant="body2" sx={{ color: T.text3 }}>Sin empleados registrados</Typography>
            </Box>
          ) : (
            <Box sx={{ maxHeight: "60vh", overflowY: "auto", p: "8px" }}>
              {employees.map((emp) => {
                const sum = summary.find((s) => s.employee_id === emp.id);
                const pct = sum && sum.total_steps > 0 ? (sum.done_steps / sum.total_steps) * 100 : 0;
                const initials = ((emp.first_name || "") + " " + (emp.last_name || "")).split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
                return (
                  <Box
                    key={emp.id}
                    onClick={() => setActiveEmp(emp.id)}
                    sx={{
                      p: "10px 12px", borderRadius: 1.5, cursor: "pointer",
                      bgcolor: activeEmp === emp.id ? T.surface2 : "transparent",
                      "&:hover": { bgcolor: T.bg2 },
                      transition: "background 120ms",
                      display: "flex", alignItems: "center", gap: "10px", mb: 0.5,
                    }}
                  >
                    <Box sx={{
                      width: 32, height: 32, borderRadius: "50%",
                      bgcolor: activeEmp === emp.id ? T.brand : T.surface2,
                      color: activeEmp === emp.id ? "#FFFFFF" : T.text2,
                      display: "grid", placeItems: "center",
                      fontFamily: T.mono, fontSize: 11, fontWeight: 600,
                      border: `1px solid ${T.rule2}`,
                      flexShrink: 0,
                    }}>
                      {initials}
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 500, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {emp.first_name} {emp.last_name}
                      </Typography>
                      {sum ? (
                        <Stack direction="row" alignItems="center" gap={0.75} sx={{ mt: 0.5 }}>
                          <Box sx={{ flex: 1, height: 4, bgcolor: T.surface2, borderRadius: 999, overflow: "hidden" }}>
                            <Box sx={{
                              width: `${pct}%`, height: "100%",
                              bgcolor: sum.completed_at ? T.green : pct > 50 ? T.accent : T.amber,
                            }} />
                          </Box>
                          <Typography variant="caption" sx={{ color: T.text3, fontFamily: T.mono, fontSize: 10 }}>
                            {sum.done_steps}/{sum.total_steps}
                          </Typography>
                        </Stack>
                      ) : (
                        <Typography variant="caption" sx={{ color: T.text3, fontSize: 11 }}>
                          Sin onboarding asignado
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>

        {/* ── Detalle del onboarding activo ── */}
        <Box>
          {activeEmployee && (
            <>
              {/* Header del empleado activo */}
              <Box sx={{ p: "20px 24px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg, mb: "20px" }}>
                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2} alignItems={{ md: "center" }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: T.ink, letterSpacing: "-0.012em" }}>
                      {activeEmployee.first_name} {activeEmployee.last_name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: T.text2 }}>
                      {activeEmployee.position || "—"} · {activeEmployee.department || "Sin departamento"}
                    </Typography>
                  </Box>
                  {assignment && (
                    <Box sx={{ minWidth: 200 }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5}>
                        <Typography variant="caption" sx={{ color: T.text3, fontFamily: T.mono, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Progreso
                        </Typography>
                        <Typography variant="caption" sx={{ color: T.ink, fontFamily: T.mono, fontWeight: 600, fontSize: 12 }}>
                          {progress.done}/{progress.total} · {progress.pct.toFixed(0)}%
                        </Typography>
                      </Stack>
                      <Box sx={{ height: 6, bgcolor: T.surface2, borderRadius: 999, overflow: "hidden" }}>
                        <Box sx={{
                          width: `${progress.pct}%`, height: "100%",
                          bgcolor: assignment.completed_at ? T.green : progress.pct > 50 ? T.accent : T.amber,
                          transition: "width 320ms cubic-bezier(0.23, 1, 0.32, 1)",
                        }} />
                      </Box>
                      {assignment.completed_at && (
                        <Typography variant="caption" sx={{ color: T.green, fontSize: 11, mt: 0.5, display: "block", fontWeight: 500 }}>
                          ✓ Completo · {new Date(assignment.completed_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Stack>
              </Box>

              {/* Lista de steps o estado vacío */}
              {loadingAsg ? (
                <Box sx={{ p: "48px", textAlign: "center" }}>
                  <CircularProgress size={24} sx={{ color: T.accent }} />
                </Box>
              ) : !assignment ? (
                <Box sx={{ p: "48px 32px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg2, textAlign: "center" }}>
                  <Typography variant="body1" sx={{ color: T.ink, fontWeight: 500, mb: 0.5 }}>
                    Sin onboarding asignado
                  </Typography>
                  <Typography variant="caption" sx={{ color: T.text3, display: "block", mb: 2.5 }}>
                    Asigná el template default para empezar la checklist
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={handleAssign}
                    disabled={assigning || templates.length === 0}
                    sx={{ bgcolor: T.accent, color: "#FFFFFF", boxShadow: "none", "&:hover": { bgcolor: "#0496BA", boxShadow: "none" } }}
                  >
                    {assigning ? <CircularProgress size={16} sx={{ color: "#FFFFFF" }} /> : "Asignar template default"}
                  </Button>
                </Box>
              ) : (
                <Stack gap={1.5}>
                  {assignment.steps.map((step) => (
                    <StepRow
                      key={step.id}
                      step={step}
                      saving={savingStep === step.id}
                      onChange={(status) => handleStepChange(step, status)}
                    />
                  ))}
                </Stack>
              )}
            </>
          )}
        </Box>
      </Box>
</Box>
  );
}

/* ─── StepRow ────────────────────────────────────────────────── */

function StepRow({
  step, saving, onChange,
}: {
  step: AssignmentStep;
  saving: boolean;
  onChange: (status: "done" | "skipped" | "pending") => void;
}) {
  const isDone = step.status === "done";
  const isSkipped = step.status === "skipped";
  const completed = isDone || isSkipped;
  const catColor = CATEGORY_COLOR[step.category] || T.text3;
  const overdue = !completed && step.due_date && new Date(step.due_date) < new Date();

  return (
    <Box
      sx={{
        display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "16px",
        p: "16px 18px",
        border: `1px solid ${overdue ? T.red : T.rule}`,
        bgcolor: completed ? T.bg2 : T.bg,
        borderRadius: 2,
        alignItems: "center",
        transition: "all 160ms",
        opacity: isSkipped ? 0.7 : 1,
      }}
    >
      {/* Checkbox */}
      <Box
        onClick={() => !saving && onChange(isDone ? "pending" : "done")}
        sx={{
          width: 22, height: 22, borderRadius: "50%",
          border: `2px solid ${isDone ? T.green : T.rule2}`,
          bgcolor: isDone ? T.green : "transparent",
          display: "grid", placeItems: "center",
          cursor: saving ? "default" : "pointer",
          transition: "all 160ms",
          "&:hover": { borderColor: T.green },
          flexShrink: 0,
        }}
      >
        {saving ? (
          <CircularProgress size={12} sx={{ color: isDone ? "#FFFFFF" : T.text3 }} />
        ) : isDone ? (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : null}
      </Box>

      {/* Body */}
      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" gap={1} alignItems="center" mb={0.5}>
          <Typography variant="body2" sx={{
            fontWeight: 600, color: completed ? T.text2 : T.ink, fontSize: 14,
            textDecoration: isSkipped ? "line-through" : "none",
          }}>
            {step.title}
          </Typography>
          <Chip
            label={step.category}
            size="small"
            sx={{
              fontFamily: T.mono, fontSize: 10, height: 18,
              bgcolor: `${catColor}15`, color: catColor, fontWeight: 600,
              textTransform: "lowercase",
            }}
          />
          {!step.required && (
            <Chip
              label="opcional"
              size="small"
              sx={{ fontFamily: T.mono, fontSize: 10, height: 18, bgcolor: T.surface2, color: T.text3 }}
            />
          )}
        </Stack>
        {step.description && (
          <Typography variant="caption" sx={{ color: T.text2, fontSize: 12.5, lineHeight: 1.5, display: "block", mb: 0.5 }}>
            {step.description}
          </Typography>
        )}
        <Stack direction="row" gap={1.5}>
          {step.due_date && (
            <Typography variant="caption" sx={{ color: overdue ? T.red : T.text3, fontFamily: T.mono, fontSize: 11, fontWeight: overdue ? 600 : 400 }}>
              {overdue ? "⚠ vence " : "vence "}{new Date(step.due_date).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
            </Typography>
          )}
          {isDone && step.completed_at && (
            <Typography variant="caption" sx={{ color: T.green, fontFamily: T.mono, fontSize: 11 }}>
              ✓ {new Date(step.completed_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
            </Typography>
          )}
          {isSkipped && (
            <Typography variant="caption" sx={{ color: T.text3, fontFamily: T.mono, fontSize: 11 }}>
              omitido
            </Typography>
          )}
        </Stack>
      </Box>

      {/* Skip menu */}
      <Tooltip title={isSkipped ? "Restaurar" : "Omitir"} placement="left">
        <IconButton
          size="small"
          disabled={saving}
          onClick={() => onChange(isSkipped ? "pending" : "skipped")}
          sx={{ color: T.text3, "&:hover": { color: T.amber } }}
        >
          {isSkipped ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          )}
        </IconButton>
      </Tooltip>
    </Box>
  );
}
