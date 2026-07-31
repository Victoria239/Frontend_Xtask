/* Wizard "Generar contrato" (E-03).
 *
 * 3 pasos:
 *   1. Elegir plantilla + empleado
 *   2. Completar datos del contrato (fechas, contraparte, custom_context)
 *   3. Preview con citas del corpus + botón guardar / descargar PDF
 *
 * El PDF se genera en navegador via window.print() con una hoja de estilos
 * específica que oculta toda la UI fuera del documento (clase printable).
 */

import { useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControl, IconButton, InputLabel, MenuItem, Select, Stack, Step,
  StepLabel, Stepper, TextField, Typography,
} from "@mui/material";
import { contractsApi, docgenApi, employeesApi } from "../../api";
import type { Contract } from "../../api/contracts";
import type { DocTemplate } from "../../api/docgen";
import type { Employee } from "../../types";

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
  green: "#01B89E",
  red: "#D14040",
  mono: "'JetBrains Mono', monospace",
};

const STEPS = ["Plantilla y empleado", "Datos del contrato", "Previsualizar y guardar"];

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (contract: Contract) => void;
}

export default function GenerateWizard({ open, onClose, onCreated }: Props) {
  const [step, setStep] = useState(0);
  const [templates, setTemplates] = useState<DocTemplate[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);

  const [templateId, setTemplateId] = useState<number | "">("");
  const [employeeId, setEmployeeId] = useState<number | "">("");
  const [contractType, setContractType] = useState("indefinido");
  const [counterparty, setCounterparty] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [customJson, setCustomJson] = useState("{\n  \n}");

  const [generated, setGenerated] = useState<Contract | null>(null);
  const [generating, setGenerating] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setGenerated(null);
    setError(null);
    setCustomJson("{\n  \n}");
    (async () => {
      setLoading(true);
      try {
        const [tpls, emps] = await Promise.all([
          docgenApi.listTemplates(),
          employeesApi.getEmployees({ pageSize: 100 }),
        ]);
        // priorizamos los con category=contrato|freelance|nda|adenda
        const ctTpls = tpls.filter((t) => ["contrato", "nda", "freelance", "adenda"].includes(t.category));
        setTemplates(ctTpls.length ? ctTpls : tpls);
        setEmployees(emps.data);
        if (ctTpls[0]) setTemplateId(ctTpls[0].id);
        if (emps.data[0]) setEmployeeId(emps.data[0].id);
      } catch (e) {
        const err = e as { response?: { data?: { error?: string } } };
        setError(err.response?.data?.error || "Error cargando datos");
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId) || null,
    [templates, templateId],
  );
  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === employeeId) || null,
    [employees, employeeId],
  );

  const goNext = () => {
    setError(null);
    if (step === 0 && (!templateId || !employeeId)) {
      setError("Elegí plantilla y empleado para continuar");
      return;
    }
    if (step === 1) {
      try {
        if (customJson.trim()) JSON.parse(customJson);
      } catch (err) {
        setError(`custom_context inválido: ${(err as Error).message}`);
        return;
      }
      runGenerate();
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const runGenerate = async () => {
    if (!templateId || !employeeId) return;
    setGenerating(true);
    setError(null);
    try {
      const ctx = customJson.trim() ? JSON.parse(customJson) : {};
      const c = await contractsApi.generateContract({
        template_id: Number(templateId),
        employee_id: Number(employeeId),
        contract_type: contractType || "general",
        counterparty: counterparty.trim() || null,
        starts_on: startsOn || null,
        expires_on: expiresOn || null,
        custom_context: ctx,
      });
      setGenerated(c);
      setStep(2);
    } catch (e) {
      const err = e as { response?: { data?: { error?: string; detail?: string } } };
      setError(err.response?.data?.error || err.response?.data?.detail || "Error generando");
    } finally {
      setGenerating(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    setError(null);
    try {
      await docgenApi.seedContractTemplates();
      const tpls = await docgenApi.listTemplates();
      const ctTpls = tpls.filter((t) => ["contrato", "nda", "freelance", "adenda"].includes(t.category));
      setTemplates(ctTpls.length ? ctTpls : tpls);
      if (ctTpls[0]) setTemplateId(ctTpls[0].id);
    } catch (e) {
      const err = e as { response?: { data?: { error?: string; detail?: string } } };
      setError(err.response?.data?.error || err.response?.data?.detail || "No se pudo cargar (¿rol admin?)");
    } finally {
      setSeeding(false);
    }
  };

  const handleConfirm = () => {
    if (generated) {
      onCreated(generated);
      onClose();
    }
  };

  const printPdf = () => {
    if (!generated) return;
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>${escapeHtml(generated.title)}</title>
<style>
  @page { margin: 30mm 22mm 26mm; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1A1726; line-height: 1.6; }
  h1 { font-size: 22pt; margin: 0 0 14pt; }
  h2 { font-size: 14pt; margin: 18pt 0 6pt; border-bottom: 1px solid #E5E5EA; padding-bottom: 4pt; }
  h3 { font-size: 12pt; margin: 12pt 0 4pt; }
  p { font-size: 11pt; margin: 6pt 0; }
  ul, ol { padding-left: 20pt; }
  li { font-size: 11pt; margin-bottom: 3pt; }
  hr { border: none; border-top: 1px solid #E5E5EA; margin: 18pt 0; }
  .meta { font-size: 9pt; color: #605C70; margin-bottom: 18pt; border-left: 3pt solid #02BDEA; padding-left: 10pt; }
  .citations { margin-top: 32pt; border-top: 2pt solid #E5E5EA; padding-top: 14pt; }
  .citation { margin-bottom: 8pt; font-size: 9.5pt; color: #605C70; }
  .footer { margin-top: 48pt; font-size: 10pt; color: #8E8A99; border-top: 1px dashed #D1D1D6; padding-top: 12pt; }
</style></head><body>
<div class="meta">
  Contrato #${generated.id} · ${escapeHtml(generated.contract_type)} · Generado ${new Date(generated.created_at).toLocaleString("es-ES")}<br/>
  Empleado: ${escapeHtml(employeeFullName(selectedEmployee))}${generated.counterparty ? ` · Contraparte: ${escapeHtml(generated.counterparty)}` : ""}
</div>
${generated.body_html || ""}
${generated.source_documents.length ? `<div class="citations"><h3>Referencias del corpus</h3>${generated.source_documents.map((c, i) =>
  `<div class="citation"><b>[${i + 1}] ${escapeHtml(c.document_title)}</b> — "${escapeHtml(c.snippet)}"</div>`
).join("")}</div>` : ""}
<div class="footer">Firmado en _____________ a _____ de _____________ de ${new Date().getFullYear()}.</div>
</body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); }, 250);
  };

  const empName = (id: number) => {
    const e = employees.find((x) => x.id === id);
    return e ? `${e.first_name} ${e.last_name}` : `#${id}`;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>Generar contrato</Typography>
        <Typography variant="caption" sx={{ color: T.text3 }}>
          Plantilla + datos del empleado + políticas del corpus → contrato firmable
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stepper activeStep={step} sx={{
          mb: 3, mt: 1,
          "& .MuiStepIcon-root.Mui-active, & .MuiStepIcon-root.Mui-completed": { color: T.accent },
        }}>
          {STEPS.map((s) => (
            <Step key={s}><StepLabel>{s}</StepLabel></Step>
          ))}
        </Stepper>

        {loading ? (
          <Box sx={{ p: "48px", textAlign: "center" }}><CircularProgress size={22} sx={{ color: T.accent }} /></Box>
        ) : (
          <>
            {/* PASO 0: plantilla + empleado */}
            {step === 0 && (
              <Stack gap={2}>
                {templates.length === 0 ? (
                  <Box sx={{ p: "20px", border: `1px dashed ${T.rule2}`, borderRadius: 2, bgcolor: T.bg2 }}>
                    <Typography variant="body2" sx={{ color: T.ink, fontWeight: 500, mb: 1 }}>
                      No tenés plantillas de contratos todavía
                    </Typography>
                    <Typography variant="caption" sx={{ color: T.text2, fontSize: 12, display: "block", mb: 2 }}>
                      Podemos cargar 5 plantillas pre-configuradas (indefinido, temporal, NDA, freelance, adenda salarial).
                      Son editables después.
                    </Typography>
                    <Button variant="outlined" onClick={handleSeed} disabled={seeding} sx={{ borderColor: T.rule2, color: T.ink }}>
                      {seeding ? <CircularProgress size={14} /> : "Cargar plantillas pre-configuradas"}
                    </Button>
                  </Box>
                ) : (
                  <>
                    <FormControl size="small" fullWidth>
                      <InputLabel>Plantilla *</InputLabel>
                      <Select label="Plantilla *" value={templateId} onChange={(e) => setTemplateId(Number(e.target.value))}>
                        {templates.map((t) => (
                          <MenuItem key={t.id} value={t.id}>
                            <Stack direction="row" gap={1} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                              <Chip label={t.category} size="small" sx={{ height: 18, fontSize: 9.5, bgcolor: T.surface2, color: T.text2 }} />
                              <Typography variant="body2" sx={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {t.name}
                              </Typography>
                            </Stack>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {selectedTemplate?.description && (
                      <Typography variant="caption" sx={{ color: T.text2, fontSize: 12 }}>
                        {selectedTemplate.description}
                      </Typography>
                    )}
                    {selectedTemplate?.rag_query && (
                      <Box sx={{ p: "10px 12px", bgcolor: "rgba(2,189,234,0.06)", borderRadius: 1.5, border: `1px solid rgba(2,189,234,0.25)` }}>
                        <Typography variant="caption" sx={{ color: T.accentD, fontFamily: T.mono, fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Esta plantilla consulta el corpus
                        </Typography>
                        <Typography variant="body2" sx={{ color: T.ink, fontSize: 12.5, mt: 0.25, fontStyle: "italic" }}>
                          "{selectedTemplate.rag_query}"
                        </Typography>
                      </Box>
                    )}
                  </>
                )}
                <FormControl size="small" fullWidth>
                  <InputLabel>Empleado *</InputLabel>
                  <Select label="Empleado *" value={employeeId} onChange={(e) => setEmployeeId(Number(e.target.value))}>
                    {employees.map((e) => (
                      <MenuItem key={e.id} value={e.id}>{e.first_name} {e.last_name} — {e.position || "—"}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            )}

            {/* PASO 1: datos del contrato */}
            {step === 1 && (
              <Stack gap={2}>
                <Stack direction="row" gap={2}>
                  <TextField size="small" label="Tipo de contrato" value={contractType} onChange={(e) => setContractType(e.target.value)} fullWidth />
                  <TextField size="small" label="Contraparte (opcional)" value={counterparty} onChange={(e) => setCounterparty(e.target.value)} fullWidth />
                </Stack>
                <Stack direction="row" gap={2}>
                  <TextField size="small" type="date" label="Inicio" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
                  <TextField size="small" type="date" label="Vencimiento" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
                </Stack>
                <Box>
                  <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, display: "block", mb: 0.5 }}>
                    custom_context (JSON) — variables para la plantilla
                  </Typography>
                  <TextField
                    value={customJson}
                    onChange={(e) => setCustomJson(e.target.value)}
                    fullWidth multiline minRows={5}
                    placeholder='{"salary_eur": 48000, "start_date": "2026-07-01"}'
                    slotProps={{ input: { sx: { fontFamily: T.mono, fontSize: 12 } } }}
                  />
                  <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, display: "block", mt: 0.5 }}>
                    Accesible en la plantilla como <code style={{ fontFamily: T.mono }}>{`{{ custom.* }}`}</code>. Por ejemplo,
                    el contrato indefinido usa <code style={{ fontFamily: T.mono }}>custom.salary_eur</code> y <code style={{ fontFamily: T.mono }}>custom.start_date</code>.
                  </Typography>
                </Box>
              </Stack>
            )}

            {/* PASO 2: preview */}
            {step === 2 && generated && (
              <Stack gap={2}>
                <Box sx={{ p: "12px 14px", bgcolor: "rgba(1,184,158,0.08)", borderRadius: 1.5, border: `1px solid rgba(1,184,158,0.3)` }}>
                  <Typography variant="caption" sx={{ color: T.green, fontWeight: 600, fontFamily: T.mono, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    ✓ Contrato #{generated.id} creado en estado "borrador"
                  </Typography>
                  <Typography variant="body2" sx={{ color: T.ink, fontSize: 13, mt: 0.5 }}>
                    {generated.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: T.text2, fontSize: 11.5 }}>
                    {empName(generated.employee_id)} · {generated.source_documents.length} cita{generated.source_documents.length !== 1 ? "s" : ""} del corpus
                  </Typography>
                </Box>

                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 200px" }, gap: 2 }}>
                  <Box sx={{
                    p: "16px 20px", bgcolor: "#FFFFFF", border: `1px solid ${T.rule}`, borderRadius: 2,
                    maxHeight: 440, overflowY: "auto",
                    "& h1": { fontSize: 18, fontWeight: 700, mt: 1, mb: 1, color: T.ink },
                    "& h2": { fontSize: 14, fontWeight: 600, mt: 1.5, mb: 0.5, color: T.ink },
                    "& h3": { fontSize: 13, fontWeight: 600, mt: 1, color: T.ink },
                    "& p": { fontSize: 13, lineHeight: 1.6, my: 1, color: T.ink },
                    "& ul, & ol": { pl: 3, my: 1 },
                    "& li": { fontSize: 13, lineHeight: 1.5 },
                    "& strong": { fontWeight: 600 },
                    "& hr": { my: 2, border: "none", borderTop: `1px solid ${T.rule}` },
                  }} dangerouslySetInnerHTML={{ __html: generated.body_html || "" }} />
                  <Box>
                    <Typography variant="caption" sx={{ color: T.text3, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 10.5, fontWeight: 600, display: "block", mb: 1 }}>
                      Citas del corpus
                    </Typography>
                    {generated.source_documents.length === 0 ? (
                      <Typography variant="caption" sx={{ color: T.text3 }}>(sin citas)</Typography>
                    ) : (
                      <Stack gap={1}>
                        {generated.source_documents.map((c, idx) => (
                          <Box key={idx} sx={{ p: "8px 10px", border: `1px solid ${T.rule}`, borderRadius: 1.5, bgcolor: T.bg2 }}>
                            <Stack direction="row" gap={0.75} alignItems="center" mb={0.5}>
                              <Box sx={{ fontFamily: T.mono, fontSize: 9.5, color: T.accentD, px: "4px", borderRadius: "3px", bgcolor: "rgba(2,189,234,0.12)" }}>{idx + 1}</Box>
                              <Typography variant="caption" sx={{ color: T.ink, fontSize: 11, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {c.document_title}
                              </Typography>
                            </Stack>
                            <Typography variant="caption" sx={{ color: T.text2, fontSize: 10.5, lineHeight: 1.4 }}>
                              {c.snippet.length > 90 ? c.snippet.slice(0, 90) + "…" : c.snippet}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </Box>
                </Box>
              </Stack>
            )}

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Box sx={{ flex: 1 }} />
        {step > 0 && step < 2 && (
          <Button onClick={() => setStep((s) => Math.max(0, s - 1))}>Atrás</Button>
        )}
        {step < 2 && (
          <Button onClick={goNext} variant="contained" disabled={generating || loading} sx={{ bgcolor: T.accent, color: "#FFFFFF", boxShadow: "none", "&:hover": { bgcolor: "#0496BA", boxShadow: "none" } }}>
            {generating ? <CircularProgress size={16} sx={{ color: "#FFFFFF" }} /> : step === 1 ? "Generar" : "Siguiente"}
          </Button>
        )}
        {step === 2 && (
          <>
            <Button onClick={printPdf} variant="outlined" sx={{ borderColor: T.rule2, color: T.ink }}>Descargar PDF</Button>
            <Button onClick={handleConfirm} variant="contained" sx={{ bgcolor: T.accent, color: "#FFFFFF", "&:hover": { bgcolor: "#0496BA" } }}>Listo</Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

function employeeFullName(e: Employee | null): string {
  return e ? `${e.first_name} ${e.last_name}` : "—";
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
