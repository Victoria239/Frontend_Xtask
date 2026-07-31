/* Contratos (E-02).
 *
 * - Lista filtrable por estado + búsqueda.
 * - Indicadores visuales: badges de estado, alertas de vencimiento <30 / <60 días.
 * - Detalle: HTML render, timeline de eventos, transiciones legales.
 * - Crear desde cero o desde DocGen (vincula generated_doc_id).
 */

import { useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControl, IconButton, InputLabel, MenuItem, Select, Stack,
  TextField, Tooltip, Typography,
} from "@mui/material";
import { contractsApi, docgenApi, employeesApi } from "../../api";
import type {
  Contract, ContractEvent, ContractIn, ContractStatus, ContractSummary, StatusTransition,
} from "../../api/contracts";
import type { Employee } from "../../types";
import type { GeneratedDocSummary } from "../../api/docgen";
import GenerateWizard from "./GenerateWizard";
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
  accentD: "#0A4D70",
  amber: "#E08A0E",
  green: "#01B89E",
  red: "#D14040",
  mono: "'JetBrains Mono', monospace",
};

const STATUS_LABEL: Record<ContractStatus, string> = {
  draft: "Borrador",
  review: "En revisión",
  signed: "Firmado",
  expired: "Vencido",
  cancelled: "Cancelado",
};

const STATUS_COLORS: Record<ContractStatus, string> = {
  draft: T.text3,
  review: T.amber,
  signed: T.green,
  expired: T.red,
  cancelled: T.text3,
};

/* Transiciones legales (espejo del backend) */
const LEGAL: Record<ContractStatus, ContractStatus[]> = {
  draft: ["review", "cancelled"],
  review: ["signed", "draft", "cancelled"],
  signed: ["expired", "cancelled"],
  expired: [],
  cancelled: [],
};

const EMPTY_FORM: ContractIn = {
  employee_id: 0,
  counterparty: "",
  title: "",
  contract_type: "general",
  body_md: "",
  starts_on: null,
  expires_on: null,
};

export default function ContractsPage() {
  const [items, setItems] = useState<ContractSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState<"" | ContractStatus>("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [docs, setDocs] = useState<GeneratedDocSummary[]>([]);

  /* Detail dialog */
  const [openDetailId, setOpenDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Contract | null>(null);
  const [events, setEvents] = useState<ContractEvent[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  /* Form dialog */
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ContractIn>(EMPTY_FORM);
  const [savingForm, setSavingForm] = useState(false);
  const [linkDocId, setLinkDocId] = useState<number | "">("");

  /* Transition dialog */
  const [transOpen, setTransOpen] = useState<{ contract: Contract; to: ContractStatus } | null>(null);
  const [transNote, setTransNote] = useState("");
  const [transSignedOn, setTransSignedOn] = useState("");

  /* Wizard E-03 */
  const [wizardOpen, setWizardOpen] = useState(false);

  /* eSign E-04 */
  const [esignOpen, setEsignOpen] = useState(false);
  const [esignEmail, setEsignEmail] = useState("");
  const [esignName, setEsignName] = useState("");
  const [esigning, setEsigning] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await contractsApi.listContracts(
        statusFilter ? { status: statusFilter } : undefined,
      );
      setItems(data);
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "Error cargando contratos" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [statusFilter]);

  useEffect(() => {
    (async () => {
      try {
        const [emps, gd] = await Promise.all([
          employeesApi.getEmployees({ pageSize: 100 }),
          docgenApi.listDocuments().catch(() => [] as GeneratedDocSummary[]),
        ]);
        setEmployees(emps.data);
        setDocs(gd);
      } catch { /* silencioso */ }
    })();
  }, []);

  const empName = (id: number) => {
    const e = employees.find((x) => x.id === id);
    return e ? `${e.first_name} ${e.last_name}` : `#${id}`;
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.counterparty || "").toLowerCase().includes(q) ||
        empName(c.employee_id).toLowerCase().includes(q),
    );
  }, [items, search, employees]);

  /* Detail */
  const openDetail = async (id: number) => {
    setOpenDetailId(id);
    setLoadingDetail(true);
    try {
      const [d, ev] = await Promise.all([contractsApi.getContract(id), contractsApi.listEvents(id)]);
      setDetail(d);
      setEvents(ev);
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "No se cargó el contrato" });
      setOpenDetailId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  /* CRUD */
  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, employee_id: employees[0]?.id || 0 });
    setLinkDocId("");
    setFormOpen(true);
  };

  const openEdit = (d: Contract) => {
    setEditingId(d.id);
    setForm({
      employee_id: d.employee_id,
      counterparty: d.counterparty,
      title: d.title,
      contract_type: d.contract_type,
      body_md: d.body_md,
      starts_on: d.starts_on,
      expires_on: d.expires_on,
      meta: d.meta,
    });
    setLinkDocId("");
    setFormOpen(true);
  };

  const saveForm = async () => {
    if (!form.title.trim() || !form.employee_id) {
      notify({ kind: "error", msg: "Empleado y título son obligatorios" });
      return;
    }
    setSavingForm(true);
    try {
      let saved: Contract;
      if (editingId) {
        saved = await contractsApi.updateContract(editingId, {
          title: form.title.trim(),
          counterparty: form.counterparty?.trim() || null,
          contract_type: form.contract_type,
          body_md: form.body_md || null,
          starts_on: form.starts_on || null,
          expires_on: form.expires_on || null,
        });
      } else if (linkDocId) {
        saved = await contractsApi.createFromDocgen({
          generated_doc_id: Number(linkDocId),
          employee_id: form.employee_id,
          contract_type: form.contract_type || "general",
          counterparty: form.counterparty?.trim() || null,
          starts_on: form.starts_on || null,
          expires_on: form.expires_on || null,
        });
      } else {
        saved = await contractsApi.createContract({
          ...form,
          title: form.title.trim(),
          counterparty: form.counterparty?.trim() || null,
        });
      }
      setFormOpen(false);
      await refresh();
      notify({ kind: "success", msg: editingId ? "Contrato actualizado" : "Contrato creado" });
      // Si veníamos de detalle, recargá
      if (openDetailId === saved.id) openDetail(saved.id);
    } catch (e) {
      const err = e as { response?: { data?: { error?: string; detail?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || err.response?.data?.detail || "No se pudo guardar" });
    } finally {
      setSavingForm(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este contrato? Solo posible si no está firmado.")) return;
    try {
      await contractsApi.deleteContract(id);
      setOpenDetailId(null);
      await refresh();
      notify({ kind: "success", msg: "Contrato eliminado" });
    } catch (e) {
      const err = e as { response?: { data?: { error?: string; detail?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || err.response?.data?.detail || "No se pudo eliminar" });
    }
  };

  /* Transiciones */
  const openTransition = (contract: Contract, to: ContractStatus) => {
    setTransNote("");
    setTransSignedOn(new Date().toISOString().slice(0, 10));
    setTransOpen({ contract, to });
  };

  const doTransition = async () => {
    if (!transOpen) return;
    const payload: StatusTransition = {
      to_status: transOpen.to,
      note: transNote.trim() || undefined,
    };
    if (transOpen.to === "signed") payload.signed_on = transSignedOn || undefined;
    try {
      await contractsApi.transition(transOpen.contract.id, payload);
      setTransOpen(null);
      await refresh();
      if (openDetailId === transOpen.contract.id) openDetail(transOpen.contract.id);
      notify({ kind: "success", msg: `Estado → ${STATUS_LABEL[transOpen.to]}` });
    } catch (e) {
      const err = e as { response?: { data?: { error?: string; detail?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || err.response?.data?.detail || "Transición rechazada" });
    }
  };

  const runScan = async () => {
    try {
      const r = await contractsApi.scanExpiry();
      notify({
        kind: "info",
        msg: `Scan: ${r.scanned} contratos · ${r.notifications_sent} alertas enviadas`,
      });
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "Scan falló" });
    }
  };

  /* Summary stats */
  const summary = useMemo(() => {
    const expiring60 = items.filter((c) => c.days_to_expiry !== null && c.days_to_expiry <= 60 && c.days_to_expiry > 30 && (c.status === "signed" || c.status === "review")).length;
    const expiring30 = items.filter((c) => c.days_to_expiry !== null && c.days_to_expiry <= 30 && c.days_to_expiry > 15 && (c.status === "signed" || c.status === "review")).length;
    const critical = items.filter((c) => c.days_to_expiry !== null && c.days_to_expiry <= 15 && (c.status === "signed" || c.status === "review")).length;
    const signed = items.filter((c) => c.status === "signed").length;
    return { expiring60, expiring30, critical, signed };
  }, [items]);

  return (
    <Box sx={{ px: { xs: "16px", md: "32px" }, pb: "32px", maxWidth: 1280, mx: "auto", color: T.ink }}>
      {/* Header */}
      <Box sx={{ pb: "16px", mb: "16px", borderBottom: `1px solid ${T.rule}`, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: "-0.025em", color: T.ink, mb: 0.5 }}>
            Contratos
          </Typography>
          <Typography variant="body2" sx={{ color: T.text2 }}>
            Ciclo borrador → revisión → firmado → vencido. Alertas automáticas a 60/30/15 días.
          </Typography>
        </Box>
        <Stack direction="row" gap={1.5}>
          <Button variant="outlined" onClick={runScan} sx={{ borderColor: T.rule2, color: T.ink }}>
            Ejecutar scan
          </Button>
          <Button variant="outlined" onClick={() => setWizardOpen(true)} sx={{ borderColor: T.accent, color: T.accentD, "&:hover": { bgcolor: "rgba(2,189,234,0.05)" } }} startIcon={<SparkIcon />}>
            Generar con plantilla
          </Button>
          <Button variant="contained" onClick={openCreate} sx={{ bgcolor: T.accent, color: "#FFFFFF", boxShadow: "none", "&:hover": { bgcolor: "#0496BA", boxShadow: "none" } }}>
            + Nuevo contrato
          </Button>
        </Stack>
      </Box>

      {/* Stats */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 1.5, mb: 2.5 }}>
        <StatCard label="Firmados" value={summary.signed} color={T.green} />
        <StatCard label="Vencen 30-60d" value={summary.expiring60} color={T.amber} />
        <StatCard label="Vencen 15-30d" value={summary.expiring30} color={T.amber} />
        <StatCard label="Críticos <15d" value={summary.critical} color={T.red} />
      </Box>

      {/* Filtros */}
      <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} mb={2}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Estado</InputLabel>
          <Select label="Estado" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "" | ContractStatus)}>
            <MenuItem value="">Todos</MenuItem>
            {(Object.keys(STATUS_LABEL) as ContractStatus[]).map((s) => (
              <MenuItem key={s} value={s}>{STATUS_LABEL[s]}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small" label="Buscar título / empleado / contraparte"
          value={search} onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, minWidth: 280 }}
        />
      </Stack>

      {/* Lista */}
      {loading ? (
        <Box sx={{ p: "48px", textAlign: "center" }}>
          <CircularProgress size={22} sx={{ color: T.accent }} />
        </Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ p: "48px 32px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg2, textAlign: "center" }}>
          <Typography variant="body1" sx={{ color: T.ink, fontWeight: 500, mb: 0.5 }}>Sin contratos</Typography>
          <Typography variant="caption" sx={{ color: T.text3 }}>Creá el primero con + Nuevo contrato</Typography>
        </Box>
      ) : (
        <Stack gap={1}>
          {filtered.map((c) => (
            <ContractRow
              key={c.id}
              item={c}
              employeeName={empName(c.employee_id)}
              onOpen={() => openDetail(c.id)}
            />
          ))}
        </Stack>
      )}

      {/* Detail dialog */}
      <Dialog open={openDetailId !== null} onClose={() => { setOpenDetailId(null); setDetail(null); }} maxWidth="md" fullWidth>
        {loadingDetail ? (
          <DialogContent><Box sx={{ p: "48px", textAlign: "center" }}><CircularProgress size={22} sx={{ color: T.accent }} /></Box></DialogContent>
        ) : detail && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Stack direction="row" gap={1} alignItems="center">
                <Chip
                  label={STATUS_LABEL[detail.status]}
                  size="small"
                  sx={{ bgcolor: `${STATUS_COLORS[detail.status]}15`, color: STATUS_COLORS[detail.status], fontWeight: 600 }}
                />
                <Chip label={detail.contract_type} size="small" sx={{ bgcolor: T.surface2, color: T.text2 }} />
                {detail.source === "docgen" && (
                  <Chip label={`🤖 doc #${detail.generated_doc_id}`} size="small" sx={{ bgcolor: "rgba(2,189,234,0.12)", color: T.accentD, fontFamily: T.mono, fontSize: 10.5 }} />
                )}
              </Stack>
              <Typography variant="h6" sx={{ fontWeight: 600, mt: 1 }}>{detail.title}</Typography>
              <Typography variant="caption" sx={{ color: T.text3, fontFamily: T.mono, fontSize: 11 }}>
                #{detail.id} · {empName(detail.employee_id)} {detail.counterparty ? `· ${detail.counterparty}` : ""}
              </Typography>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 200px" }, gap: 2 }}>
                {/* Body */}
                <Box>
                  <Box sx={{ p: "10px 14px", bgcolor: T.bg2, borderRadius: 1.5, mb: 1.5 }}>
                    <DateRow label="Inicio" value={detail.starts_on} />
                    <DateRow label="Vence" value={detail.expires_on} highlight={detail.days_to_expiry !== null && detail.days_to_expiry <= 30} />
                    <DateRow label="Firmado" value={detail.signed_on} />
                    {detail.days_to_expiry !== null && (
                      <Typography variant="caption" sx={{ color: detail.days_to_expiry <= 15 ? T.red : detail.days_to_expiry <= 30 ? T.amber : T.text3, fontSize: 11, fontFamily: T.mono, display: "block", mt: 0.5 }}>
                        {detail.days_to_expiry >= 0 ? `Faltan ${detail.days_to_expiry} días` : `Vencido hace ${-detail.days_to_expiry} días`}
                      </Typography>
                    )}
                  </Box>

                  {detail.body_html ? (
                    <Box sx={{
                      p: "16px 20px", bgcolor: "#FFFFFF", border: `1px solid ${T.rule}`, borderRadius: 2,
                      maxHeight: 380, overflowY: "auto",
                      "& h1": { fontSize: 20, fontWeight: 700, mt: 1.5, mb: 1 },
                      "& h2": { fontSize: 16, fontWeight: 600, mt: 1.5, mb: 0.5 },
                      "& p": { fontSize: 13.5, lineHeight: 1.6, my: 1 },
                      "& ul, & ol": { pl: 3, my: 1 },
                      "& li": { fontSize: 13.5, lineHeight: 1.55, mb: 0.5 },
                      "& strong": { fontWeight: 600 },
                    }} dangerouslySetInnerHTML={{ __html: detail.body_html }} />
                  ) : (
                    <Box sx={{ p: "32px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg2, textAlign: "center" }}>
                      <Typography variant="caption" sx={{ color: T.text3 }}>Sin contenido — agregalo con editar</Typography>
                    </Box>
                  )}
                </Box>

                {/* Timeline */}
                <Box>
                  <Typography variant="caption" sx={{ color: T.text3, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, fontSize: 10.5, display: "block", mb: 1 }}>
                    Historia
                  </Typography>
                  <Stack gap={0.75}>
                    {events.length === 0 ? (
                      <Typography variant="caption" sx={{ color: T.text3, fontSize: 11 }}>Sin eventos</Typography>
                    ) : events.map((e) => (
                      <Box key={e.id} sx={{ pl: 1, borderLeft: `2px solid ${e.kind === "alert" ? T.amber : T.rule2}` }}>
                        <Typography variant="caption" sx={{ color: T.ink, fontSize: 11, fontWeight: 500, display: "block" }}>
                          {e.kind === "status_change" ? `${e.from_status || "—"} → ${e.to_status}` : e.kind === "alert" ? "Alerta vencimiento" : e.kind}
                        </Typography>
                        {e.note && <Typography variant="caption" sx={{ color: T.text2, fontSize: 10.5, display: "block" }}>{e.note}</Typography>}
                        <Typography variant="caption" sx={{ color: T.text3, fontSize: 10, fontFamily: T.mono }}>
                          {new Date(e.created_at).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, flexWrap: "wrap", gap: 1 }}>
              {LEGAL[detail.status].map((to) => (
                <Button
                  key={to} size="small" variant="outlined"
                  onClick={() => openTransition(detail, to)}
                  sx={{ borderColor: T.rule2, color: T.ink }}
                >
                  → {STATUS_LABEL[to]}
                </Button>
              ))}
              {(detail.status === "draft" || detail.status === "review") && !detail.esign_envelope_id && (
                <Button
                  size="small" variant="outlined"
                  onClick={() => setEsignOpen(true)}
                  sx={{ borderColor: T.accent, color: T.accentD, "&:hover": { bgcolor: "rgba(2,189,234,0.04)" } }}
                  startIcon={<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
                >
                  Enviar a firma
                </Button>
              )}
              {detail.esign_envelope_id && detail.esign_status !== "completed" && (
                <Chip
                  label={`eSign · ${detail.esign_provider} · ${detail.esign_status}`}
                  size="small"
                  sx={{ bgcolor: T.surface2, color: T.accentD, fontFamily: T.mono, fontSize: 11 }}
                />
              )}
              <Box sx={{ flex: 1 }} />
              {detail.status !== "signed" && detail.status !== "expired" && (
                <Button size="small" onClick={() => { setOpenDetailId(null); openEdit(detail); }} sx={{ color: T.text2 }}>Editar</Button>
              )}
              {detail.status !== "signed" && (
                <Button size="small" onClick={() => handleDelete(detail.id)} sx={{ color: T.red }}>Eliminar</Button>
              )}
              <Button onClick={() => { setOpenDetailId(null); setDetail(null); }} variant="contained" sx={{ bgcolor: T.accent, "&:hover": { bgcolor: "#0496BA" } }}>Cerrar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Form */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>{editingId ? "Editar contrato" : "Nuevo contrato"}</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ pt: 1 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Empleado *</InputLabel>
              <Select label="Empleado *" value={form.employee_id || ""} onChange={(e) => setForm({ ...form, employee_id: Number(e.target.value) })}>
                {employees.map((e) => (
                  <MenuItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction="row" gap={2}>
              <TextField size="small" label="Tipo" value={form.contract_type || ""} onChange={(e) => setForm({ ...form, contract_type: e.target.value })} sx={{ minWidth: 140 }} placeholder="indefinido, NDA..." />
              <TextField size="small" label="Contraparte" value={form.counterparty || ""} onChange={(e) => setForm({ ...form, counterparty: e.target.value })} fullWidth />
            </Stack>
            {!editingId && (
              <FormControl size="small" fullWidth>
                <InputLabel>Generado desde plantilla (opcional)</InputLabel>
                <Select label="Generado desde plantilla (opcional)" value={linkDocId} onChange={(e) => {
                  const v = Number(e.target.value) || "";
                  setLinkDocId(v);
                  if (v) {
                    const d = docs.find((x) => x.id === Number(v));
                    if (d) setForm({ ...form, title: d.title, employee_id: d.employee_id });
                  }
                }}>
                  <MenuItem value="">— Crear vacío —</MenuItem>
                  {docs.map((d) => (
                    <MenuItem key={d.id} value={d.id}>#{d.id} · {d.title}</MenuItem>
                  ))}
                </Select>
                <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, mt: 0.5 }}>
                  Crea el contrato copiando el body del doc + linkea {`generated_doc_id`}.
                </Typography>
              </FormControl>
            )}
            <TextField size="small" label="Título *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} fullWidth />
            <Stack direction="row" gap={2}>
              <TextField size="small" type="date" label="Inicio" value={form.starts_on || ""} onChange={(e) => setForm({ ...form, starts_on: e.target.value || null })} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
              <TextField size="small" type="date" label="Vencimiento" value={form.expires_on || ""} onChange={(e) => setForm({ ...form, expires_on: e.target.value || null })} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
            </Stack>
            {!linkDocId && (
              <TextField
                label="Cuerpo (Markdown)"
                value={form.body_md || ""}
                onChange={(e) => setForm({ ...form, body_md: e.target.value })}
                fullWidth multiline minRows={6}
                slotProps={{ input: { sx: { fontFamily: T.mono, fontSize: 13 } } }}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>Cancelar</Button>
          <Button onClick={saveForm} variant="contained" disabled={savingForm} sx={{ bgcolor: T.accent, "&:hover": { bgcolor: "#0496BA" } }}>
            {savingForm ? <CircularProgress size={16} sx={{ color: "#FFFFFF" }} /> : editingId ? "Guardar" : "Crear"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transition */}
      <Dialog open={!!transOpen} onClose={() => setTransOpen(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          {transOpen && `${STATUS_LABEL[transOpen.contract.status]} → ${STATUS_LABEL[transOpen.to]}`}
        </DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ pt: 1 }}>
            {transOpen?.to === "signed" && (
              <TextField size="small" type="date" label="Fecha de firma" value={transSignedOn} onChange={(e) => setTransSignedOn(e.target.value)} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
            )}
            <TextField size="small" label="Nota (opcional)" value={transNote} onChange={(e) => setTransNote(e.target.value)} fullWidth multiline minRows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransOpen(null)}>Cancelar</Button>
          <Button onClick={doTransition} variant="contained" sx={{ bgcolor: T.accent, "&:hover": { bgcolor: "#0496BA" } }}>Confirmar</Button>
        </DialogActions>
      </Dialog>

      {/* Wizard E-03 */}
      <GenerateWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreated={async (c) => {
          await refresh();
          notify({ kind: "success", msg: `Contrato #${c.id} generado con ${c.source_documents.length} citas` });
        }}
      />

      {/* eSign E-04: enviar a firma */}
      <Dialog open={esignOpen} onClose={() => setEsignOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Enviar a firma electrónica</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ pt: 1 }}>
            <Typography variant="caption" sx={{ color: T.text2, fontSize: 12 }}>
              Se generará un envelope con DocuSign o un pad de firma interno según la configuración.
              Al firmar, el contrato pasa automáticamente a estado <b>signed</b>.
            </Typography>
            <TextField size="small" type="email" label="Email del firmante *" value={esignEmail} onChange={(e) => setEsignEmail(e.target.value)} fullWidth />
            <TextField size="small" label="Nombre del firmante *" value={esignName} onChange={(e) => setEsignName(e.target.value)} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEsignOpen(false)}>Cancelar</Button>
          <Button
            onClick={async () => {
              if (!detail || !esignEmail.trim() || !esignName.trim()) {
                notify({ kind: "error", msg: "Email y nombre son obligatorios" });
                return;
              }
              setEsigning(true);
              try {
                const r = await contractsApi.sendForSigning(detail.id, esignEmail.trim(), esignName.trim());
                setEsignOpen(false);
                notify({ kind: "success", msg: `Enviado a firma (${r.provider})` });
                if (r.provider === "mock") {
                  window.open(r.signing_url, "_blank", "noopener");
                } else {
                  window.open(r.signing_url, "_blank", "noopener");
                }
                openDetail(detail.id);
                await refresh();
              } catch (e) {
                const err = e as { response?: { data?: { error?: string; detail?: string } } };
                notify({ kind: "error", msg: err.response?.data?.error || err.response?.data?.detail || "Error" });
              } finally {
                setEsigning(false);
              }
            }}
            variant="contained"
            disabled={esigning}
            sx={{ bgcolor: T.accent, "&:hover": { bgcolor: "#0496BA" } }}
          >
            {esigning ? <CircularProgress size={16} sx={{ color: "#FFFFFF" }} /> : "Enviar"}
          </Button>
        </DialogActions>
      </Dialog>
</Box>
  );
}

function SparkIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  );
}

/* ─── Subcomponents ─── */

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Box sx={{ p: "14px 16px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg }}>
      <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, display: "block" }}>
        {label}
      </Typography>
      <Typography variant="h5" sx={{ color, fontWeight: 700, mt: 0.5, fontVariantNumeric: "tabular-nums" }}>{value}</Typography>
    </Box>
  );
}

function ContractRow({ item, employeeName, onOpen }: { item: ContractSummary; employeeName: string; onOpen: () => void }) {
  const sColor = STATUS_COLORS[item.status];
  const urgency = item.days_to_expiry !== null && item.days_to_expiry <= 30 && (item.status === "signed" || item.status === "review");
  const critical = item.days_to_expiry !== null && item.days_to_expiry <= 15;
  return (
    <Box
      onClick={onOpen}
      sx={{
        p: "14px 18px", border: `1px solid ${T.rule}`,
        borderLeft: `3px solid ${critical ? T.red : urgency ? T.amber : sColor}`,
        borderRadius: 2, bgcolor: T.bg, cursor: "pointer",
        display: "grid", gridTemplateColumns: "1fr auto auto", gap: 2, alignItems: "center",
        transition: "all 160ms",
        "&:hover": { borderColor: T.accent, bgcolor: "rgba(2,189,234,0.02)" },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" gap={1} alignItems="center" mb={0.25}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: T.ink, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</Typography>
          {item.source === "docgen" && <Chip label="🤖" size="small" sx={{ bgcolor: "rgba(2,189,234,0.12)", color: T.accentD, fontSize: 9, height: 16 }} />}
        </Stack>
        <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, fontFamily: T.mono }}>
          {employeeName} · {item.contract_type}{item.counterparty ? ` · ${item.counterparty}` : ""}
        </Typography>
      </Box>
      <Box sx={{ textAlign: "right" }}>
        <Chip label={STATUS_LABEL[item.status]} size="small" sx={{ bgcolor: `${sColor}15`, color: sColor, fontSize: 10.5, height: 20, fontWeight: 600 }} />
        {item.expires_on && (
          <Typography variant="caption" sx={{ color: critical ? T.red : urgency ? T.amber : T.text3, fontSize: 10.5, fontFamily: T.mono, display: "block", mt: 0.25 }}>
            {item.days_to_expiry !== null && item.days_to_expiry < 0 ? `vencido ${-item.days_to_expiry}d` : item.days_to_expiry !== null ? `${item.days_to_expiry}d` : ""}
          </Typography>
        )}
      </Box>
      <IconButton size="small" sx={{ color: T.text3 }}>
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
      </IconButton>
    </Box>
  );
}

function DateRow({ label, value, highlight }: { label: string; value: string | null; highlight?: boolean }) {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.25 }}>
      <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, fontFamily: T.mono }}>{label}</Typography>
      <Typography variant="caption" sx={{ color: highlight ? T.amber : T.ink, fontSize: 11.5, fontWeight: highlight ? 600 : 400 }}>
        {value ? new Date(value).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
      </Typography>
    </Stack>
  );
}
