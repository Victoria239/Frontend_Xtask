/* Generador documental (AI-03) — la pieza más vendedora del Q2.
 *
 * 3 tabs:
 * 1. Generar  → wizard: elegir template + empleado + custom context → preview con citas
 * 2. Plantillas → CRUD de templates Jinja2 con rag_query opcional
 * 3. Generados  → galería de documentos ya generados, ordenados por fecha
 *
 * Render del documento: HTML sanitizado del backend (bleach). Mostramos las citas
 * a la derecha como sidebar. Botón "Copiar markdown" + "Descargar HTML".
 */

import { useEffect, useMemo, useState } from "react";
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControl, IconButton, InputLabel, MenuItem, Select,
  Alert, Stack, Tab, Tabs, TextField, Tooltip, Typography,
} from "@mui/material";
import { docgenApi, employeesApi } from "../../api";
import type { DocTemplate, GeneratedDoc, GeneratedDocSummary } from "../../api/docgen";
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
  accentD: "#0A4D70",
  brand: "#251948",
  amber: "#E08A0E",
  green: "#01B89E",
  red: "#D14040",
  mono: "'JetBrains Mono', monospace",
};

const EMPTY_TEMPLATE = {
  name: "",
  description: "",
  category: "general",
  body: "# Título\n\nHola {{ employee.first_name }},\n\n{{ rag.block }}\n",
  rag_query: "",
};

export default function DocGenPage() {
  const [tab, setTab] = useState<"generate" | "templates" | "documents">("generate");
  const [templates, setTemplates] = useState<DocTemplate[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [documents, setDocuments] = useState<GeneratedDocSummary[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);
  
  /* Generación */
  const [genTemplateId, setGenTemplateId] = useState<number | "">("");
  const [genEmployeeId, setGenEmployeeId] = useState<number | "">("");
  const [genCustom, setGenCustom] = useState("");
  const [genTitle, setGenTitle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<GeneratedDoc | null>(null);

  /* Document viewer */
  const [viewDoc, setViewDoc] = useState<GeneratedDoc | null>(null);
  const [loadingView, setLoadingView] = useState(false);

  /* Template form */
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_TEMPLATE);
  const [savingForm, setSavingForm] = useState(false);

  /* Carga inicial */
  useEffect(() => {
    (async () => {
      try {
        const [tpls, emps] = await Promise.all([
          docgenApi.listTemplates(),
          employeesApi.getEmployees({ pageSize: 100 }),
        ]);
        setTemplates(tpls);
        setEmployees(emps.data);
        if (tpls[0]) setGenTemplateId(tpls[0].id);
        if (emps.data[0]) setGenEmployeeId(emps.data[0].id);
      } catch (e) {
        const err = e as { response?: { data?: { error?: string } } };
        notify({ kind: "error", msg: err.response?.data?.error || "Error cargando datos" });
      } finally {
        setLoadingInit(false);
      }
    })();
  }, []);

  /* Cargar lista de documentos cuando entrás al tab */
  useEffect(() => {
    if (tab !== "documents") return;
    docgenApi.listDocuments().then(setDocuments).catch(() => {});
  }, [tab]);

  /* ── Generación ── */
  const handleGenerate = async () => {
    if (!genTemplateId || !genEmployeeId) {
      notify({ kind: "error", msg: "Elegí template y empleado" });
      return;
    }
    let parsedCustom: Record<string, unknown> = {};
    if (genCustom.trim()) {
      try {
        parsedCustom = JSON.parse(genCustom);
      } catch {
        notify({ kind: "error", msg: "El custom_context tiene que ser JSON válido" });
        return;
      }
    }
    setGenerating(true);
    try {
      const doc = await docgenApi.generate(
        Number(genTemplateId),
        Number(genEmployeeId),
        parsedCustom,
        genTitle.trim() || undefined,
      );
      setGenResult(doc);
      notify({ kind: "success", msg: "Documento generado" });
    } catch (e) {
      const err = e as { response?: { data?: { error?: string; detail?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || err.response?.data?.detail || "Error en la generación" });
    } finally {
      setGenerating(false);
    }
  };

  /* ── Template CRUD ── */
  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_TEMPLATE);
    setFormOpen(true);
  };
  const openEdit = (tpl: DocTemplate) => {
    setEditingId(tpl.id);
    setForm({
      name: tpl.name,
      description: tpl.description || "",
      category: tpl.category,
      body: tpl.body,
      rag_query: tpl.rag_query || "",
    });
    setFormOpen(true);
  };
  const saveTemplate = async () => {
    if (!form.name.trim() || !form.body.trim()) {
      notify({ kind: "error", msg: "Nombre y body son obligatorios" });
      return;
    }
    setSavingForm(true);
    try {
      const data = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category,
        body: form.body,
        rag_query: form.rag_query.trim() || null,
      };
      if (editingId) await docgenApi.updateTemplate(editingId, data);
      else await docgenApi.createTemplate(data);
      const tpls = await docgenApi.listTemplates();
      setTemplates(tpls);
      setFormOpen(false);
      notify({ kind: "success", msg: editingId ? "Template actualizado" : "Template creado" });
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "No se pudo guardar (¿rol manager?)" });
    } finally {
      setSavingForm(false);
    }
  };
  const handleDeleteTemplate = async (id: number, name: string) => {
    if (!confirm(`¿Eliminar template "${name}"?`)) return;
    try {
      await docgenApi.deleteTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      notify({ kind: "success", msg: "Template eliminado" });
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "No se pudo eliminar (¿rol admin?)" });
    }
  };

  /* ── Document viewer ── */
  const openDoc = async (id: number) => {
    setLoadingView(true);
    try {
      const d = await docgenApi.getDocument(id);
      setViewDoc(d);
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "No se cargó el documento" });
    } finally {
      setLoadingView(false);
    }
  };
  const handleDeleteDoc = async (id: number) => {
    if (!confirm("¿Eliminar este documento generado?")) return;
    try {
      await docgenApi.deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      notify({ kind: "success", msg: "Documento eliminado" });
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "No se pudo eliminar" });
    }
  };

  const empName = (id: number) => {
    const e = employees.find((x) => x.id === id);
    return e ? `${e.first_name} ${e.last_name}` : `#${id}`;
  };

  const selectedTemplate = useMemo(() => templates.find((t) => t.id === genTemplateId) || null, [templates, genTemplateId]);

  return (
    <Box sx={{ px: { xs: "16px", md: "32px" }, pb: "32px", maxWidth: 1280, mx: "auto", color: T.ink }}>
      {/* Header */}
      <Box sx={{ pb: "16px", mb: "16px", borderBottom: `1px solid ${T.rule}`, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: "-0.025em", color: T.ink, mb: 0.5 }}>
            Generador documental
          </Typography>
          <Typography variant="body2" sx={{ color: T.text2 }}>
            Plantillas Jinja2 + datos del empleado + RAG citando políticas. Auditable.
          </Typography>
        </Box>
        {tab === "templates" && (
          <Button variant="contained" onClick={openCreate} sx={{ bgcolor: T.accent, color: "#FFFFFF", boxShadow: "none", "&:hover": { bgcolor: "#0496BA", boxShadow: "none" } }}>
            + Nueva plantilla
          </Button>
        )}
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          mb: "20px", minHeight: 40,
          "& .MuiTabs-indicator": { backgroundColor: T.accent, height: 2 },
          "& .MuiTab-root": { minHeight: 40, textTransform: "none", fontWeight: 500, fontSize: 14, color: T.text2 },
          "& .Mui-selected": { color: `${T.ink} !important` },
        }}
      >
        <Tab value="generate" label="Generar" />
        <Tab value="templates" label={`Plantillas (${templates.length})`} />
        <Tab value="documents" label="Generados" />
      </Tabs>

      {/* ── Tab Generar ── */}
      {tab === "generate" && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "360px 1fr" }, gap: "20px" }}>
          {/* Form */}
          <Box sx={{ p: "20px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg, height: "fit-content" }}>
            <Typography variant="caption" sx={{ color: T.text3, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 11, fontWeight: 600 }}>
              Parámetros
            </Typography>
            <Stack gap={2} sx={{ mt: 2 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Plantilla</InputLabel>
                <Select
                  label="Plantilla"
                  value={genTemplateId}
                  onChange={(e) => setGenTemplateId(Number(e.target.value))}
                  disabled={loadingInit}
                >
                  {templates.map((t) => (
                    <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel>Empleado</InputLabel>
                <Select
                  label="Empleado"
                  value={genEmployeeId}
                  onChange={(e) => setGenEmployeeId(Number(e.target.value))}
                  disabled={loadingInit}
                >
                  {employees.map((e) => (
                    <MenuItem key={e.id} value={e.id}>{e.first_name} {e.last_name} — {e.position || "—"}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                size="small"
                label="Título (opcional)"
                value={genTitle}
                onChange={(e) => setGenTitle(e.target.value)}
                fullWidth
                placeholder={selectedTemplate ? `${selectedTemplate.name} · empleado` : ""}
              />
              <TextField
                size="small"
                label="custom_context (JSON)"
                value={genCustom}
                onChange={(e) => setGenCustom(e.target.value)}
                fullWidth
                multiline minRows={3}
                placeholder='{"dias": 25}'
                helperText={<span style={{ fontFamily: T.mono, fontSize: 10.5 }}>Accesible en el template como {`{{ custom.* }}`}</span>}
              />
              {selectedTemplate?.rag_query && (
                <Box sx={{ p: "10px 12px", bgcolor: "rgba(2,189,234,0.08)", borderRadius: 1.5, border: `1px solid rgba(2,189,234,0.3)` }}>
                  <Typography variant="caption" sx={{ color: T.accentD, fontFamily: T.mono, fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Esta plantilla usa RAG
                  </Typography>
                  <Typography variant="body2" sx={{ color: T.ink, fontSize: 12.5, mt: 0.5, fontStyle: "italic" }}>
                    "{selectedTemplate.rag_query}"
                  </Typography>
                </Box>
              )}
              <Button
                variant="contained"
                onClick={handleGenerate}
                disabled={generating || !genTemplateId || !genEmployeeId}
                sx={{ bgcolor: T.accent, color: "#FFFFFF", boxShadow: "none", "&:hover": { bgcolor: "#0496BA", boxShadow: "none" } }}
                startIcon={generating ? <CircularProgress size={14} sx={{ color: "#FFFFFF" }} /> : <SparkIcon />}
              >
                {generating ? "Generando…" : "Generar documento"}
              </Button>
            </Stack>
          </Box>

          {/* Preview del resultado */}
          <Box sx={{ p: "24px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg, minHeight: 400 }}>
            {!genResult ? (
              <Box sx={{ height: "100%", minHeight: 400, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1.5, color: T.text3 }}>
                <Box sx={{ width: 56, height: 56, borderRadius: "50%", bgcolor: "rgba(2,189,234,0.08)", display: "grid", placeItems: "center" }}>
                  <Box sx={{ color: T.accent }}><SparkIcon size={28} /></Box>
                </Box>
                <Typography variant="body1" sx={{ color: T.ink, fontWeight: 500 }}>
                  Esperando configuración
                </Typography>
                <Typography variant="caption" sx={{ color: T.text3, fontSize: 12, textAlign: "center", maxWidth: 320 }}>
                  Elegí una plantilla y un empleado, y dale "Generar" para ver el documento renderizado con las citas del corpus.
                </Typography>
              </Box>
            ) : (
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="caption" sx={{ color: T.green, fontWeight: 600, fontFamily: T.mono, fontSize: 11, textTransform: "uppercase" }}>
                    ✓ Generado · #{genResult.id}
                  </Typography>
                  <Stack direction="row" gap={1}>
                    <Button size="small" variant="outlined" onClick={() => navigator.clipboard.writeText(genResult.body_md)} sx={{ borderColor: T.rule2, color: T.ink }}>
                      Copiar markdown
                    </Button>
                    <Button size="small" variant="outlined" onClick={() => downloadHtml(genResult)} sx={{ borderColor: T.rule2, color: T.ink }}>
                      Descargar HTML
                    </Button>
                  </Stack>
                </Stack>
                <DocumentRender doc={genResult} />
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* ── Tab Plantillas ── */}
      {tab === "templates" && (
        <Box>
          {loadingInit ? (
            <Box sx={{ p: "48px", textAlign: "center" }}>
              <CircularProgress size={22} sx={{ color: T.accent }} />
            </Box>
          ) : templates.length === 0 ? (
            <Box sx={{ p: "48px 32px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg2, textAlign: "center" }}>
              <Typography variant="body1" sx={{ color: T.ink, fontWeight: 500, mb: 0.5 }}>
                Sin plantillas
              </Typography>
              <Typography variant="caption" sx={{ color: T.text3 }}>
                Creá la primera con + Nueva plantilla arriba
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
              {templates.map((tpl) => (
                <Box key={tpl.id} sx={{ p: "18px 20px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg, "&:hover": { borderColor: T.rule2 }, transition: "border-color 160ms" }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1} mb={1.5}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: T.ink, fontSize: 14 }}>
                        {tpl.name}
                      </Typography>
                      {tpl.description && (
                        <Typography variant="caption" sx={{ color: T.text2, fontSize: 12, display: "block", mt: 0.25 }}>
                          {tpl.description}
                        </Typography>
                      )}
                    </Box>
                    <Chip label={tpl.category} size="small" sx={{ bgcolor: T.surface2, color: T.text2, fontFamily: T.mono, fontSize: 10.5, height: 22 }} />
                  </Stack>
                  {tpl.rag_query && (
                    <Box sx={{ mb: 1.5, p: "6px 10px", bgcolor: "rgba(2,189,234,0.06)", borderRadius: 1, display: "inline-block" }}>
                      <Typography variant="caption" sx={{ color: T.accentD, fontFamily: T.mono, fontSize: 10.5 }}>
                        🔍 {tpl.rag_query.length > 60 ? tpl.rag_query.slice(0, 60) + "…" : tpl.rag_query}
                      </Typography>
                    </Box>
                  )}
                  <Stack direction="row" gap={1} mt={1}>
                    <Button size="small" variant="outlined" onClick={() => { setGenTemplateId(tpl.id); setTab("generate"); }} sx={{ borderColor: T.rule2, color: T.ink, "&:hover": { bgcolor: T.bg2 } }}>
                      Generar
                    </Button>
                    <Button size="small" variant="text" onClick={() => openEdit(tpl)} sx={{ color: T.text2 }}>
                      Editar
                    </Button>
                    <IconButton size="small" onClick={() => handleDeleteTemplate(tpl.id, tpl.name)} sx={{ color: T.text3, ml: "auto", "&:hover": { color: T.red } }}>
                      <TrashIcon />
                    </IconButton>
                  </Stack>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* ── Tab Generados ── */}
      {tab === "documents" && (
        <Box>
          {documents.length === 0 ? (
            <Box sx={{ p: "48px 32px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg2, textAlign: "center" }}>
              <Typography variant="body1" sx={{ color: T.ink, fontWeight: 500, mb: 0.5 }}>
                Sin documentos generados
              </Typography>
              <Typography variant="caption" sx={{ color: T.text3 }}>
                Generá el primero desde la pestaña "Generar"
              </Typography>
            </Box>
          ) : (
            <Stack gap={1}>
              {documents.map((d) => (
                <Box
                  key={d.id}
                  onClick={() => openDoc(d.id)}
                  sx={{
                    p: "14px 18px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg,
                    cursor: "pointer", display: "grid", gridTemplateColumns: "1fr auto auto", gap: 2,
                    alignItems: "center", transition: "all 160ms",
                    "&:hover": { borderColor: T.accent, bgcolor: "rgba(2,189,234,0.02)" },
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: T.ink, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {d.title}
                    </Typography>
                    <Stack direction="row" gap={1.5} alignItems="center" sx={{ mt: 0.25 }}>
                      <Typography variant="caption" sx={{ color: T.text3, fontFamily: T.mono, fontSize: 10.5 }}>
                        {d.template_name} · {empName(d.employee_id)}
                      </Typography>
                      {d.citation_count > 0 && (
                        <Chip label={`${d.citation_count} citas`} size="small" sx={{ bgcolor: "rgba(2,189,234,0.08)", color: T.accentD, fontSize: 10, height: 18 }} />
                      )}
                    </Stack>
                  </Box>
                  <Typography variant="caption" sx={{ color: T.text3, fontFamily: T.mono, fontSize: 11 }}>
                    {new Date(d.created_at).toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </Typography>
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteDoc(d.id); }} sx={{ color: T.text3, "&:hover": { color: T.red } }}>
                    <TrashIcon />
                  </IconButton>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      )}

      {/* ── Dialog editar template ── */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          {editingId ? "Editar plantilla" : "Nueva plantilla"}
        </DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ pt: 1 }}>
            <Stack direction="row" gap={2}>
              <TextField size="small" label="Nombre *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth />
              <TextField size="small" label="Categoría" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} sx={{ minWidth: 160 }} />
            </Stack>
            <TextField size="small" label="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} fullWidth multiline minRows={2} />
            <TextField
              size="small"
              label="Consulta RAG (opcional)"
              value={form.rag_query}
              onChange={(e) => setForm({ ...form, rag_query: e.target.value })}
              fullWidth
              placeholder="Política de vacaciones y días hábiles"
              helperText="Si está, se busca en el corpus y los resultados van al contexto como rag.results y rag.block"
            />
            <Box>
              <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, display: "block", mb: 0.5 }}>
                Cuerpo (Markdown + Jinja2) *
              </Typography>
              <TextField
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                fullWidth
                multiline
                minRows={14}
                maxRows={26}
                slotProps={{ input: { sx: { fontFamily: T.mono, fontSize: 13 } } }}
              />
              <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, display: "block", mt: 0.5 }}>
                Variables disponibles:{" "}
                <code style={{ fontFamily: T.mono }}>employee.*</code>,{" "}
                <code style={{ fontFamily: T.mono }}>custom.*</code>,{" "}
                <code style={{ fontFamily: T.mono }}>rag.results[]</code>,{" "}
                <code style={{ fontFamily: T.mono }}>rag.block</code>
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>Cancelar</Button>
          <Button onClick={saveTemplate} variant="contained" disabled={savingForm} sx={{ bgcolor: T.accent, "&:hover": { bgcolor: "#0496BA" } }}>
            {savingForm ? <CircularProgress size={16} sx={{ color: "#FFFFFF" }} /> : editingId ? "Guardar" : "Crear"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog viewer ── */}
      <Dialog open={!!viewDoc || loadingView} onClose={() => setViewDoc(null)} maxWidth="md" fullWidth>
        {loadingView ? (
          <DialogContent>
            <Box sx={{ p: "48px", textAlign: "center" }}>
              <CircularProgress size={22} sx={{ color: T.accent }} />
            </Box>
          </DialogContent>
        ) : viewDoc && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>{viewDoc.title}</Typography>
              <Typography variant="caption" sx={{ color: T.text3, fontFamily: T.mono, fontSize: 11 }}>
                #{viewDoc.id} · {viewDoc.template_name} · {empName(viewDoc.employee_id)} · {new Date(viewDoc.created_at).toLocaleString("es-ES")}
              </Typography>
            </DialogTitle>
            <DialogContent>
              <DocumentRender doc={viewDoc} />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => navigator.clipboard.writeText(viewDoc.body_md)} sx={{ color: T.text2 }}>Copiar markdown</Button>
              <Button onClick={() => downloadHtml(viewDoc)} sx={{ color: T.text2 }}>Descargar HTML</Button>
              <Button onClick={() => setViewDoc(null)} variant="contained" sx={{ bgcolor: T.accent, "&:hover": { bgcolor: "#0496BA" } }}>Cerrar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
</Box>
  );
}

/* ─── Subcomponents ─────────────────────────────────────── */

function DocumentRender({ doc }: { doc: GeneratedDoc }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 220px" }, gap: 2.5, alignItems: "flex-start" }}>
      <Box sx={{
        p: "20px 28px", bgcolor: "#FFFFFF", border: `1px solid ${T.rule}`, borderRadius: 2,
        maxHeight: 560, overflowY: "auto",
        "& h1": { fontSize: 22, fontWeight: 700, mt: 2, mb: 1, color: T.ink },
        "& h2": { fontSize: 16, fontWeight: 600, mt: 2, mb: 1, color: T.ink },
        "& h3": { fontSize: 14, fontWeight: 600, mt: 1.5, mb: 0.5, color: T.ink },
        "& p": { fontSize: 14, lineHeight: 1.65, color: T.ink, my: 1 },
        "& ul, & ol": { pl: 3, my: 1 },
        "& li": { fontSize: 14, lineHeight: 1.55, color: T.ink, mb: 0.5 },
        "& strong": { fontWeight: 600 },
        "& em": { fontStyle: "italic" },
        "& hr": { my: 2, border: "none", borderTop: `1px solid ${T.rule}` },
      }} dangerouslySetInnerHTML={{ __html: doc.body_html }} />

      <Box>
        <Typography variant="caption" sx={{ color: T.text3, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 10.5, fontWeight: 600, display: "block", mb: 1 }}>
          {doc.citations.length} cita{doc.citations.length !== 1 ? "s" : ""} del corpus
        </Typography>
        {doc.citations.length === 0 ? (
          <Typography variant="caption" sx={{ color: T.text3, fontSize: 12 }}>
            Esta plantilla no hace consultas al RAG
          </Typography>
        ) : (
          <Stack gap={1}>
            {doc.citations.map((c, idx) => (
              <Box key={idx} sx={{ p: "10px 12px", border: `1px solid ${T.rule}`, borderRadius: 1.5, bgcolor: T.bg2 }}>
                <Stack direction="row" gap={0.75} alignItems="center" mb={0.5}>
                  <Box sx={{ fontFamily: T.mono, fontSize: 10, color: T.accentD, px: "5px", borderRadius: "3px", bgcolor: "rgba(2,189,234,0.12)" }}>{idx + 1}</Box>
                  <Typography variant="caption" sx={{ color: T.ink, fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.document_title}
                  </Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: T.text2, fontSize: 11, lineHeight: 1.4, display: "block", whiteSpace: "pre-wrap" }}>
                  {c.snippet.length > 140 ? c.snippet.slice(0, 140) + "…" : c.snippet}
                </Typography>
                <Typography variant="caption" sx={{ color: T.text3, fontFamily: T.mono, fontSize: 10, mt: 0.5, display: "block" }}>
                  score {c.score.toFixed(3)}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

function downloadHtml(doc: GeneratedDoc) {
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${doc.title}</title>
<style>body{font-family:system-ui,sans-serif;max-width:780px;margin:40px auto;padding:0 20px;color:#1A1726;line-height:1.6}h1{font-size:24px}h2{font-size:18px}hr{border:none;border-top:1px solid #E5E5EA;margin:24px 0}.citations{margin-top:48px;border-top:2px solid #E5E5EA;padding-top:24px}</style>
</head><body>${doc.body_html}
${doc.citations.length ? `<div class="citations"><h3>Referencias del corpus</h3><ol>${doc.citations.map((c) => `<li><strong>${c.document_title}</strong> — "${c.snippet}"</li>`).join("")}</ol></div>` : ""}
</body></html>`;
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${doc.title.replace(/[^a-z0-9]/gi, "_")}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

function SparkIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}
