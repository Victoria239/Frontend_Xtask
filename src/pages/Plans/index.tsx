/* Constructor de planes de comisión (C-03).
 *
 * Form-based MVP (sin drag-and-drop): por cada regla, el usuario completa
 * variables y umbrales, y el frontend arma el JSONLogic. Para la demo
 * también ofrecemos editor JSON crudo en un toggle.
 *
 * Layout:
 *   - lista de planes a la izq
 *   - editor del plan seleccionado: header + reglas + simulador en vivo a la der
 */

import { useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControl, IconButton, InputLabel, MenuItem, Select, Stack,
  Switch, Tab, Tabs, TextField, Tooltip, Typography,
} from "@mui/material";
import { plansApi } from "../../api";
import { notify } from "../../hooks/useToast";
import type {
  JsonLogicExpr, PlanDetail, PlanIn, PlanSummary, Rule, RuleIn, RuleTrace, SimulateResponse,
} from "../../api/plans";

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
  accentD: "#0A4D70",
  amber: "#E08A0E",
  green: "#01B89E",
  red: "#D14040",
  mono: "'JetBrains Mono', monospace",
};

/* Operadores soportados en el "form mode" (tier rápido) */
const COMP_OPS = [
  { val: ">=", label: "≥" },
  { val: ">", label: ">" },
  { val: "<=", label: "≤" },
  { val: "<", label: "<" },
  { val: "==", label: "=" },
  { val: "!=", label: "≠" },
];

type ConditionForm = {
  variable: string;
  op: string;
  value: string;
};

type AmountForm = {
  mode: "percentage" | "fixed" | "expression";
  variable: string;   // para percentage
  percentage: string; // ej 0.05
  fixedValue: string;
  bonus: string;      // opcional bono extra
  raw: string;        // JSON crudo si mode=expression
};

const EMPTY_PLAN: PlanIn = {
  name: "",
  description: "",
  period: "monthly",
  currency: "EUR",
  strategy: "first-match",
  defaults: {},
  rules: [],
};

const EMPTY_RULE: { label: string; priority: number; condition: ConditionForm; amount: AmountForm; notes: string } = {
  label: "",
  priority: 100,
  condition: { variable: "sales", op: ">=", value: "0" },
  amount: { mode: "percentage", variable: "sales", percentage: "0.05", fixedValue: "0", bonus: "0", raw: "" },
  notes: "",
};

export default function PlansPage() {
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<PlanDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  /* Plan dialog */
  const [planOpen, setPlanOpen] = useState(false);
  const [planForm, setPlanForm] = useState<PlanIn>(EMPTY_PLAN);
  const [savingPlan, setSavingPlan] = useState(false);

  /* Rule dialog */
  const [ruleOpen, setRuleOpen] = useState<{ editingRule: Rule | null } | null>(null);
  const [ruleForm, setRuleForm] = useState(EMPTY_RULE);
  const [ruleMode, setRuleMode] = useState<"form" | "json">("form");
  const [ruleWhenJson, setRuleWhenJson] = useState("");
  const [ruleAmountJson, setRuleAmountJson] = useState("");
  const [savingRule, setSavingRule] = useState(false);

  /* Simulator */
  const [simContext, setSimContext] = useState('{"sales": 80000}');
  const [simResult, setSimResult] = useState<SimulateResponse | null>(null);
  const [running, setRunning] = useState(false);

  /* Loading */
  useEffect(() => {
    refreshList();
  }, []);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
    else setDetail(null);
  }, [selectedId]);

  const refreshList = async () => {
    setLoadingList(true);
    try {
      const list = await plansApi.listPlans();
      setPlans(list);
      if (!selectedId && list[0]) setSelectedId(list[0].id);
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "Error cargando planes" });
    } finally {
      setLoadingList(false);
    }
  };

  const loadDetail = async (id: number) => {
    setLoadingDetail(true);
    try {
      const d = await plansApi.getPlan(id);
      setDetail(d);
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "No se cargó el detalle" });
    } finally {
      setLoadingDetail(false);
    }
  };

  /* Plan CRUD */
  const openCreatePlan = () => {
    setPlanForm({ ...EMPTY_PLAN, defaults: { sales: 0 } });
    setPlanOpen(true);
  };
  const savePlan = async () => {
    if (!planForm.name.trim()) {
      notify({ kind: "error", msg: "El nombre es obligatorio" });
      return;
    }
    setSavingPlan(true);
    try {
      const p = await plansApi.createPlan({ ...planForm, name: planForm.name.trim() });
      setPlanOpen(false);
      await refreshList();
      setSelectedId(p.id);
      notify({ kind: "success", msg: "Plan creado" });
    } catch (e) {
      const err = e as { response?: { data?: { error?: string; detail?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || err.response?.data?.detail || "No se pudo guardar" });
    } finally {
      setSavingPlan(false);
    }
  };

  const togglePlanActive = async (p: PlanDetail) => {
    try {
      await plansApi.updatePlan(p.id, { active: !p.active });
      await loadDetail(p.id);
      await refreshList();
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "No se pudo actualizar" });
    }
  };

  const handleDeletePlan = async (id: number) => {
    if (!confirm("¿Eliminar el plan completo (y sus reglas)?")) return;
    try {
      await plansApi.deletePlan(id);
      setSelectedId(null);
      await refreshList();
      notify({ kind: "success", msg: "Plan eliminado" });
    } catch (e) {
      const err = e as { response?: { data?: { error?: string; detail?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || err.response?.data?.detail || "No se pudo eliminar (rol admin)" });
    }
  };

  /* Rule CRUD */
  const openCreateRule = () => {
    setRuleForm(EMPTY_RULE);
    setRuleMode("form");
    setRuleWhenJson(JSON.stringify(buildWhen(EMPTY_RULE.condition), null, 2));
    setRuleAmountJson(JSON.stringify(buildAmount(EMPTY_RULE.amount), null, 2));
    setRuleOpen({ editingRule: null });
  };

  const openEditRule = (rule: Rule) => {
    setRuleForm({ ...EMPTY_RULE, label: rule.label, priority: rule.priority, notes: rule.notes || "" });
    setRuleMode("json");  // si editás, asumí que querés ver el JSON
    setRuleWhenJson(JSON.stringify(rule.when, null, 2));
    setRuleAmountJson(JSON.stringify(rule.amount, null, 2));
    setRuleOpen({ editingRule: rule });
  };

  const saveRule = async () => {
    if (!detail) return;
    if (!ruleForm.label.trim()) {
      notify({ kind: "error", msg: "El label es obligatorio" });
      return;
    }
    let whenExpr: JsonLogicExpr;
    let amountExpr: JsonLogicExpr;
    try {
      whenExpr = ruleMode === "form" ? buildWhen(ruleForm.condition) : JSON.parse(ruleWhenJson);
      amountExpr = ruleMode === "form" ? buildAmount(ruleForm.amount) : JSON.parse(ruleAmountJson);
    } catch (err) {
      notify({ kind: "error", msg: `JSON inválido: ${(err as Error).message}` });
      return;
    }
    const payload: RuleIn = {
      label: ruleForm.label.trim(),
      priority: ruleForm.priority,
      when: whenExpr,
      amount: amountExpr,
      notes: ruleForm.notes.trim() || null,
    };
    setSavingRule(true);
    try {
      if (ruleOpen?.editingRule) {
        await plansApi.updateRule(ruleOpen.editingRule.id, payload);
      } else {
        await plansApi.addRule(detail.id, payload);
      }
      setRuleOpen(null);
      await loadDetail(detail.id);
      await refreshList();
      notify({ kind: "success", msg: ruleOpen?.editingRule ? "Regla actualizada" : "Regla agregada" });
    } catch (e) {
      const err = e as { response?: { data?: { error?: string; detail?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || err.response?.data?.detail || "Backend rechazó la regla" });
    } finally {
      setSavingRule(false);
    }
  };

  const handleDeleteRule = async (rule: Rule) => {
    if (!detail) return;
    if (!confirm(`¿Eliminar la regla "${rule.label}"?`)) return;
    try {
      await plansApi.deleteRule(rule.id);
      await loadDetail(detail.id);
      await refreshList();
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "No se pudo eliminar" });
    }
  };

  /* Simulator */
  const runSim = async () => {
    if (!detail) return;
    let ctx: Record<string, unknown>;
    try {
      ctx = JSON.parse(simContext);
    } catch (err) {
      notify({ kind: "error", msg: `Contexto inválido: ${(err as Error).message}` });
      return;
    }
    setRunning(true);
    try {
      const r = await plansApi.simulate(detail.id, { context: ctx });
      setSimResult(r);
    } catch (e) {
      const err = e as { response?: { data?: { error?: string; detail?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || err.response?.data?.detail || "Error simulando" });
    } finally {
      setRunning(false);
    }
  };

  /* Variables disponibles en el contexto (sugeridas en el form) */
  const ctxVariables = useMemo(() => {
    const set = new Set<string>(Object.keys(detail?.defaults || {}));
    // Inferimos del JSON del simulador
    try {
      const obj = JSON.parse(simContext);
      Object.keys(obj || {}).forEach((k) => set.add(k));
    } catch { /* noop */ }
    if (set.size === 0) ["sales", "target", "deals_closed"].forEach((v) => set.add(v));
    return Array.from(set);
  }, [detail, simContext]);

  return (
    <Box sx={{ px: { xs: "16px", md: "32px" }, pb: "32px", maxWidth: 1280, mx: "auto", color: T.ink }}>
      {/* Header */}
      <Box sx={{ pb: "16px", mb: "16px", borderBottom: `1px solid ${T.rule}`, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: "-0.025em", color: T.ink, mb: 0.5 }}>
            Planes de comisión
          </Typography>
          <Typography variant="body2" sx={{ color: T.text2 }}>
            Constructor con reglas JSONLogic + simulador. Tier, escalonado, fijo + bonus.
          </Typography>
        </Box>
        <Button variant="contained" onClick={openCreatePlan} sx={{ bgcolor: T.accent, color: "#FFFFFF", boxShadow: "none", "&:hover": { bgcolor: "#0496BA", boxShadow: "none" } }}>
          + Nuevo plan
        </Button>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "260px 1fr" }, gap: 2 }}>
        {/* Lista de planes */}
        <Box>
          {loadingList ? (
            <Box sx={{ p: "32px", textAlign: "center" }}><CircularProgress size={20} sx={{ color: T.accent }} /></Box>
          ) : plans.length === 0 ? (
            <Box sx={{ p: "24px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg2, textAlign: "center" }}>
              <Typography variant="caption" sx={{ color: T.text3 }}>Sin planes</Typography>
            </Box>
          ) : (
            <Stack gap={0.75}>
              {plans.map((p) => (
                <Box
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  sx={{
                    p: "12px 14px", border: `1px solid ${selectedId === p.id ? T.accent : T.rule}`,
                    borderRadius: 1.5, bgcolor: selectedId === p.id ? "rgba(2,189,234,0.05)" : T.bg,
                    cursor: "pointer", transition: "all 160ms",
                    "&:hover": { borderColor: selectedId === p.id ? T.accent : T.rule2 },
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: T.ink, fontSize: 13 }}>{p.name}</Typography>
                      <Typography variant="caption" sx={{ color: T.text3, fontFamily: T.mono, fontSize: 10.5 }}>
                        {p.rule_count} reglas · {p.currency} · {p.strategy}
                      </Typography>
                    </Box>
                    {!p.active && <Chip label="inactivo" size="small" sx={{ height: 16, fontSize: 9.5, bgcolor: T.surface2, color: T.text3 }} />}
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Box>

        {/* Detail panel */}
        <Box>
          {!selectedId ? (
            <Box sx={{ p: "48px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg2, textAlign: "center" }}>
              <Typography variant="body1" sx={{ color: T.ink, fontWeight: 500, mb: 0.5 }}>Elegí un plan</Typography>
              <Typography variant="caption" sx={{ color: T.text3 }}>O creá el primero con "+ Nuevo plan"</Typography>
            </Box>
          ) : loadingDetail || !detail ? (
            <Box sx={{ p: "48px", textAlign: "center" }}><CircularProgress size={22} sx={{ color: T.accent }} /></Box>
          ) : (
            <Stack gap={2}>
              {/* Plan header */}
              <Box sx={{ p: "16px 20px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: T.ink, fontSize: 16 }}>{detail.name}</Typography>
                    {detail.description && (
                      <Typography variant="caption" sx={{ color: T.text2, fontSize: 12, display: "block", mt: 0.5 }}>{detail.description}</Typography>
                    )}
                    <Stack direction="row" gap={1} alignItems="center" mt={1}>
                      <Chip label={detail.strategy} size="small" sx={{ bgcolor: T.surface2, color: T.text2, fontFamily: T.mono, fontSize: 10.5 }} />
                      <Chip label={detail.period} size="small" sx={{ bgcolor: T.surface2, color: T.text2 }} />
                      <Chip label={detail.currency} size="small" sx={{ bgcolor: T.surface2, color: T.text2 }} />
                      {detail.scope_department && <Chip label={detail.scope_department} size="small" sx={{ bgcolor: "rgba(2,189,234,0.08)", color: T.accentD }} />}
                    </Stack>
                  </Box>
                  <Stack direction="row" gap={1} alignItems="center">
                    <Tooltip title={detail.active ? "Activo" : "Inactivo"}>
                      <Switch checked={detail.active} onChange={() => togglePlanActive(detail)} size="small" />
                    </Tooltip>
                    <IconButton size="small" onClick={() => handleDeletePlan(detail.id)} sx={{ color: T.text3, "&:hover": { color: T.red } }}>
                      <TrashIcon />
                    </IconButton>
                  </Stack>
                </Stack>
              </Box>

              {/* Reglas + simulador */}
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 280px" }, gap: 2 }}>
                {/* Reglas */}
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                    <Typography variant="caption" sx={{ color: T.text3, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, fontSize: 11 }}>
                      Reglas ({detail.rules.length})
                    </Typography>
                    <Button size="small" variant="outlined" onClick={openCreateRule} sx={{ borderColor: T.rule2, color: T.ink }}>
                      + Regla
                    </Button>
                  </Stack>
                  {detail.rules.length === 0 ? (
                    <Box sx={{ p: "24px", border: `1px dashed ${T.rule}`, borderRadius: 2, bgcolor: T.bg2, textAlign: "center" }}>
                      <Typography variant="caption" sx={{ color: T.text3 }}>Sin reglas todavía</Typography>
                    </Box>
                  ) : (
                    <Stack gap={1}>
                      {detail.rules.map((r) => (
                        <RuleRow key={r.id} rule={r} trace={simResult?.trace.find((t) => t.rule_id === r.id)} onEdit={() => openEditRule(r)} onDelete={() => handleDeleteRule(r)} />
                      ))}
                    </Stack>
                  )}
                </Box>

                {/* Simulador */}
                <Box>
                  <Typography variant="caption" sx={{ color: T.text3, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, fontSize: 11, display: "block", mb: 1.5 }}>
                    Simulador
                  </Typography>
                  <TextField
                    label="Contexto (JSON)"
                    value={simContext}
                    onChange={(e) => setSimContext(e.target.value)}
                    fullWidth multiline minRows={5} size="small"
                    slotProps={{ input: { sx: { fontFamily: T.mono, fontSize: 12 } } }}
                  />
                  <Button
                    fullWidth variant="contained" onClick={runSim} disabled={running}
                    sx={{ mt: 1, bgcolor: T.accent, color: "#FFFFFF", boxShadow: "none", "&:hover": { bgcolor: "#0496BA", boxShadow: "none" } }}
                  >
                    {running ? <CircularProgress size={14} sx={{ color: "#FFFFFF" }} /> : "Simular"}
                  </Button>

                  {simResult && (
                    <Box sx={{ mt: 1.5, p: "12px 14px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg }}>
                      <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5, fontFamily: T.mono, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        Resultado
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: T.accent, fontVariantNumeric: "tabular-nums", mt: 0.5 }}>
                        {simResult.total_amount.toLocaleString("es-ES", { maximumFractionDigits: 2 })}
                        <Typography component="span" variant="body2" sx={{ color: T.text3, ml: 0.5 }}>{simResult.currency}</Typography>
                      </Typography>
                      <Typography variant="caption" sx={{ color: T.text2, fontSize: 11 }}>
                        {simResult.matched_rules} regla{simResult.matched_rules !== 1 ? "s" : ""} aplicadas · {simResult.strategy}
                      </Typography>
                      <Box sx={{ mt: 1, pt: 1, borderTop: `1px solid ${T.rule}` }}>
                        <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", mb: 0.5 }}>
                          Variables sugeridas
                        </Typography>
                        <Stack direction="row" gap={0.5} flexWrap="wrap">
                          {ctxVariables.map((v) => (
                            <Chip key={v} label={v} size="small" sx={{ height: 18, fontSize: 10, fontFamily: T.mono, bgcolor: T.surface2 }} />
                          ))}
                        </Stack>
                      </Box>
                    </Box>
                  )}
                </Box>
              </Box>
            </Stack>
          )}
        </Box>
      </Box>

      {/* Plan dialog */}
      <Dialog open={planOpen} onClose={() => setPlanOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Nuevo plan</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ pt: 1 }}>
            <TextField size="small" label="Nombre *" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} fullWidth />
            <TextField size="small" label="Descripción" value={planForm.description || ""} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} fullWidth multiline minRows={2} />
            <Stack direction="row" gap={2}>
              <FormControl size="small" fullWidth>
                <InputLabel>Estrategia</InputLabel>
                <Select label="Estrategia" value={planForm.strategy} onChange={(e) => setPlanForm({ ...planForm, strategy: e.target.value })}>
                  <MenuItem value="first-match">Primera regla que matchea</MenuItem>
                  <MenuItem value="sum-all">Suma todas las que matchean</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Período</InputLabel>
                <Select label="Período" value={planForm.period} onChange={(e) => setPlanForm({ ...planForm, period: e.target.value })}>
                  <MenuItem value="monthly">Mensual</MenuItem>
                  <MenuItem value="quarterly">Trimestral</MenuItem>
                  <MenuItem value="annual">Anual</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <Stack direction="row" gap={2}>
              <TextField size="small" label="Moneda" value={planForm.currency} onChange={(e) => setPlanForm({ ...planForm, currency: e.target.value })} sx={{ width: 100 }} />
              <TextField size="small" label="Departamento (opcional)" value={planForm.scope_department || ""} onChange={(e) => setPlanForm({ ...planForm, scope_department: e.target.value })} fullWidth />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPlanOpen(false)}>Cancelar</Button>
          <Button onClick={savePlan} variant="contained" disabled={savingPlan} sx={{ bgcolor: T.accent, "&:hover": { bgcolor: "#0496BA" } }}>
            {savingPlan ? <CircularProgress size={16} sx={{ color: "#FFFFFF" }} /> : "Crear"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rule dialog */}
      <Dialog open={!!ruleOpen} onClose={() => setRuleOpen(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          {ruleOpen?.editingRule ? "Editar regla" : "Nueva regla"}
        </DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ pt: 1 }}>
            <Stack direction="row" gap={2}>
              <TextField size="small" label="Label *" value={ruleForm.label} onChange={(e) => setRuleForm({ ...ruleForm, label: e.target.value })} fullWidth placeholder="Ej: Tier 1 ventas básicas" />
              <TextField size="small" label="Prioridad" type="number" value={ruleForm.priority} onChange={(e) => setRuleForm({ ...ruleForm, priority: parseInt(e.target.value) || 100 })} sx={{ width: 110 }} />
            </Stack>
            <Tabs value={ruleMode} onChange={(_, v) => setRuleMode(v)} sx={{ minHeight: 32, "& .MuiTab-root": { minHeight: 32, textTransform: "none", fontSize: 13 }, "& .MuiTabs-indicator": { backgroundColor: T.accent } }}>
              <Tab value="form" label="Formulario" />
              <Tab value="json" label="JSONLogic crudo" />
            </Tabs>

            {ruleMode === "form" ? (
              <Stack gap={2}>
                <Box sx={{ p: "12px 14px", bgcolor: T.bg2, borderRadius: 1.5 }}>
                  <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                    Cuándo se aplica
                  </Typography>
                  <Stack direction="row" gap={1.5} mt={1} alignItems="center">
                    <TextField size="small" label="Variable" value={ruleForm.condition.variable} onChange={(e) => setRuleForm({ ...ruleForm, condition: { ...ruleForm.condition, variable: e.target.value } })} sx={{ flex: 1, fontFamily: T.mono }} placeholder="sales" />
                    <FormControl size="small" sx={{ width: 100 }}>
                      <Select value={ruleForm.condition.op} onChange={(e) => setRuleForm({ ...ruleForm, condition: { ...ruleForm.condition, op: e.target.value } })}>
                        {COMP_OPS.map((o) => <MenuItem key={o.val} value={o.val}>{o.label}</MenuItem>)}
                      </Select>
                    </FormControl>
                    <TextField size="small" label="Valor" value={ruleForm.condition.value} onChange={(e) => setRuleForm({ ...ruleForm, condition: { ...ruleForm.condition, value: e.target.value } })} sx={{ flex: 1 }} placeholder="50000" />
                  </Stack>
                </Box>

                <Box sx={{ p: "12px 14px", bgcolor: T.bg2, borderRadius: 1.5 }}>
                  <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                    Cuánto paga
                  </Typography>
                  <FormControl size="small" fullWidth sx={{ mt: 1 }}>
                    <InputLabel>Tipo</InputLabel>
                    <Select label="Tipo" value={ruleForm.amount.mode} onChange={(e) => setRuleForm({ ...ruleForm, amount: { ...ruleForm.amount, mode: e.target.value as AmountForm["mode"] } })}>
                      <MenuItem value="percentage">Porcentaje sobre variable</MenuItem>
                      <MenuItem value="fixed">Importe fijo</MenuItem>
                      <MenuItem value="expression">Expresión JSONLogic (avanzado)</MenuItem>
                    </Select>
                  </FormControl>
                  {ruleForm.amount.mode === "percentage" && (
                    <Stack direction="row" gap={1.5} mt={1}>
                      <TextField size="small" label="Variable base" value={ruleForm.amount.variable} onChange={(e) => setRuleForm({ ...ruleForm, amount: { ...ruleForm.amount, variable: e.target.value } })} fullWidth placeholder="sales" />
                      <TextField size="small" label="Porcentaje (0-1)" value={ruleForm.amount.percentage} onChange={(e) => setRuleForm({ ...ruleForm, amount: { ...ruleForm.amount, percentage: e.target.value } })} sx={{ width: 140 }} placeholder="0.05" />
                      <TextField size="small" label="+ Bono fijo" value={ruleForm.amount.bonus} onChange={(e) => setRuleForm({ ...ruleForm, amount: { ...ruleForm.amount, bonus: e.target.value } })} sx={{ width: 110 }} placeholder="0" />
                    </Stack>
                  )}
                  {ruleForm.amount.mode === "fixed" && (
                    <TextField size="small" label="Importe" value={ruleForm.amount.fixedValue} onChange={(e) => setRuleForm({ ...ruleForm, amount: { ...ruleForm.amount, fixedValue: e.target.value } })} sx={{ mt: 1, width: 200 }} placeholder="1000" />
                  )}
                  {ruleForm.amount.mode === "expression" && (
                    <TextField label="Expresión" value={ruleForm.amount.raw} onChange={(e) => setRuleForm({ ...ruleForm, amount: { ...ruleForm.amount, raw: e.target.value } })} fullWidth multiline minRows={3} sx={{ mt: 1 }} slotProps={{ input: { sx: { fontFamily: T.mono, fontSize: 12 } } }} placeholder='{"+":[{"*":[{"var":"sales"},0.05]}, 200]}' />
                  )}
                </Box>
              </Stack>
            ) : (
              <Stack gap={2}>
                <Box>
                  <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", mb: 0.5 }}>
                    Condición (when)
                  </Typography>
                  <TextField value={ruleWhenJson} onChange={(e) => setRuleWhenJson(e.target.value)} fullWidth multiline minRows={5} slotProps={{ input: { sx: { fontFamily: T.mono, fontSize: 12 } } }} />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", mb: 0.5 }}>
                    Cálculo (amount)
                  </Typography>
                  <TextField value={ruleAmountJson} onChange={(e) => setRuleAmountJson(e.target.value)} fullWidth multiline minRows={5} slotProps={{ input: { sx: { fontFamily: T.mono, fontSize: 12 } } }} />
                </Box>
              </Stack>
            )}

            <TextField size="small" label="Notas" value={ruleForm.notes} onChange={(e) => setRuleForm({ ...ruleForm, notes: e.target.value })} fullWidth multiline minRows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRuleOpen(null)}>Cancelar</Button>
          <Button onClick={saveRule} variant="contained" disabled={savingRule} sx={{ bgcolor: T.accent, "&:hover": { bgcolor: "#0496BA" } }}>
            {savingRule ? <CircularProgress size={16} sx={{ color: "#FFFFFF" }} /> : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>
</Box>
  );
}

/* ─── Helpers ─── */

function buildWhen(c: { variable: string; op: string; value: string }): JsonLogicExpr {
  const raw = c.value.trim();
  const v: unknown = isNaN(Number(raw)) ? raw : Number(raw);
  return { [c.op]: [{ var: c.variable }, v] };
}

function buildAmount(a: {
  mode: "percentage" | "fixed" | "expression";
  variable: string; percentage: string; fixedValue: string; bonus: string; raw: string;
}): JsonLogicExpr {
  if (a.mode === "fixed") return Number(a.fixedValue) || 0;
  if (a.mode === "expression") {
    try { return JSON.parse(a.raw); } catch { return 0; }
  }
  // percentage
  const pct = Number(a.percentage) || 0;
  const bonus = Number(a.bonus) || 0;
  const base: JsonLogicExpr = { "*": [{ var: a.variable }, pct] };
  if (bonus > 0) return { "+": [base, bonus] };
  return base;
}

/* ─── Subcomponents ─── */

function RuleRow({ rule, trace, onEdit, onDelete }: { rule: Rule; trace?: RuleTrace; onEdit: () => void; onDelete: () => void }) {
  const matched = trace?.matched;
  const errored = !!trace?.error;
  const borderL = errored ? T.red : matched ? T.green : T.rule;
  return (
    <Box sx={{
      p: "12px 14px", border: `1px solid ${T.rule}`, borderLeft: `3px solid ${borderL}`,
      borderRadius: 1.5, bgcolor: T.bg,
    }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" gap={1} alignItems="center">
            <Typography variant="body2" sx={{ fontWeight: 600, color: T.ink, fontSize: 13 }}>{rule.label}</Typography>
            <Chip label={`p${rule.priority}`} size="small" sx={{ height: 16, fontSize: 9.5, fontFamily: T.mono, bgcolor: T.surface2, color: T.text3 }} />
            {trace && matched && trace.amount !== null && trace.amount !== undefined && (
              <Chip label={`${trace.amount.toFixed(2)}`} size="small" sx={{ height: 16, fontSize: 9.5, fontWeight: 600, bgcolor: "rgba(1,184,158,0.12)", color: T.green }} />
            )}
            {trace && !matched && <Chip label="skip" size="small" sx={{ height: 16, fontSize: 9.5, bgcolor: T.surface2, color: T.text3 }} />}
            {errored && <Chip label="error" size="small" sx={{ height: 16, fontSize: 9.5, bgcolor: "rgba(209,64,64,0.12)", color: T.red }} />}
          </Stack>
          <Box sx={{ mt: 0.75, p: "6px 8px", bgcolor: T.bg2, borderRadius: 1, fontFamily: T.mono, fontSize: 10.5, color: T.text2, whiteSpace: "pre-wrap", overflow: "hidden" }}>
            <Typography component="div" variant="caption" sx={{ color: T.text3, fontFamily: T.mono, fontSize: 9.5, mb: 0.25 }}>WHEN</Typography>
            {JSON.stringify(rule.when)}
            <Typography component="div" variant="caption" sx={{ color: T.text3, fontFamily: T.mono, fontSize: 9.5, mt: 0.5, mb: 0.25 }}>AMOUNT</Typography>
            {JSON.stringify(rule.amount)}
          </Box>
          {errored && (
            <Typography variant="caption" sx={{ color: T.red, fontSize: 10.5, display: "block", mt: 0.5 }}>{trace?.error}</Typography>
          )}
        </Box>
        <Stack direction="row" gap={0.5}>
          <IconButton size="small" onClick={onEdit} sx={{ color: T.text3 }}><EditIcon /></IconButton>
          <IconButton size="small" onClick={onDelete} sx={{ color: T.text3, "&:hover": { color: T.red } }}><TrashIcon /></IconButton>
        </Stack>
      </Stack>
    </Box>
  );
}

function EditIcon() { return (<svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>); }
function TrashIcon() { return (<svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>); }
