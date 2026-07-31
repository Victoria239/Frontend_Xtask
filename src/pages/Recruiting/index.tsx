/* ATS Kanban (H-03).
 *
 * Split view:
 *   - Sidebar: lista de pipelines (vacantes)
 *   - Main: kanban del pipeline seleccionado
 *
 * Drag-and-drop nativo HTML5 entre columnas. Doble click en card abre detalle.
 */

import { useEffect, useState } from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControl, IconButton, InputLabel, MenuItem, Select, Stack,
  TextField, Typography,
} from "@mui/material";
import { atsApi, employeesApi } from "../../api";
import type {
  Candidate, CandidateIn, KanbanView, PipelineDetail, PipelineIn, PipelineSummary,
} from "../../api/ats";
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

export default function RecruitingPage() {
  const [pipelines, setPipelines] = useState<PipelineSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [kanban, setKanban] = useState<KanbanView | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingKb, setLoadingKb] = useState(false);
  
  /* Drag */
  const [dragApp, setDragApp] = useState<number | null>(null);

  /* Pipeline form */
  const [pipeOpen, setPipeOpen] = useState(false);
  const [pipeForm, setPipeForm] = useState<PipelineIn>({ title: "", description: "", department: "", location: "" });
  const [savingPipe, setSavingPipe] = useState(false);

  /* Candidate form */
  const [candOpen, setCandOpen] = useState(false);
  const [candForm, setCandForm] = useState<CandidateIn>({ first_name: "", last_name: "" });
  const [savingCand, setSavingCand] = useState(false);

  /* Add to pipeline */
  const [addAppOpen, setAddAppOpen] = useState(false);
  const [pickCandidateId, setPickCandidateId] = useState<number | "">("");

  /* Initial */
  useEffect(() => {
    (async () => {
      try {
        const [list, emps, cands] = await Promise.all([
          atsApi.listPipelines(),
          employeesApi.getEmployees({ pageSize: 100 }),
          atsApi.listCandidates(),
        ]);
        setPipelines(list);
        setEmployees(emps.data);
        setCandidates(cands);
        if (list[0]) setSelectedId(list[0].id);
      } catch (e) {
        const err = e as { response?: { data?: { error?: string } } };
        notify({ kind: "error", msg: err.response?.data?.error || "Error cargando" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedId) loadKanban(selectedId);
    else setKanban(null);
  }, [selectedId]);

  const loadKanban = async (id: number) => {
    setLoadingKb(true);
    try {
      const k = await atsApi.getKanban(id);
      setKanban(k);
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "No se cargó el kanban" });
    } finally {
      setLoadingKb(false);
    }
  };

  /* Pipeline CRUD */
  const openCreatePipe = () => {
    setPipeForm({ title: "", description: "", department: "", location: "" });
    setPipeOpen(true);
  };
  const savePipeline = async () => {
    if (!pipeForm.title.trim()) {
      notify({ kind: "error", msg: "El título es obligatorio" });
      return;
    }
    setSavingPipe(true);
    try {
      const p = await atsApi.createPipeline({
        ...pipeForm,
        title: pipeForm.title.trim(),
        description: pipeForm.description?.trim() || null,
        department: pipeForm.department?.trim() || null,
        location: pipeForm.location?.trim() || null,
      });
      setPipeOpen(false);
      const list = await atsApi.listPipelines();
      setPipelines(list);
      setSelectedId(p.id);
      notify({ kind: "success", msg: "Pipeline creado" });
    } catch (e) {
      const err = e as { response?: { data?: { error?: string; detail?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || err.response?.data?.detail || "No se pudo crear" });
    } finally {
      setSavingPipe(false);
    }
  };

  /* Candidate CRUD */
  const openCreateCand = () => {
    setCandForm({ first_name: "", last_name: "" });
    setCandOpen(true);
  };
  const saveCandidate = async () => {
    if (!candForm.first_name.trim() || !candForm.last_name.trim()) {
      notify({ kind: "error", msg: "Nombre y apellido son obligatorios" });
      return;
    }
    setSavingCand(true);
    try {
      await atsApi.createCandidate(candForm);
      const cands = await atsApi.listCandidates();
      setCandidates(cands);
      setCandOpen(false);
      notify({ kind: "success", msg: "Candidato agregado" });
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "No se pudo agregar" });
    } finally {
      setSavingCand(false);
    }
  };

  /* Add to pipeline */
  const handleAddToPipeline = async () => {
    if (!selectedId || !pickCandidateId) return;
    try {
      await atsApi.addApplication(selectedId, Number(pickCandidateId));
      setAddAppOpen(false);
      await loadKanban(selectedId);
      notify({ kind: "success", msg: "Candidato agregado al pipeline" });
    } catch (e) {
      const err = e as { response?: { data?: { error?: string; detail?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || err.response?.data?.detail || "Error" });
    }
  };

  /* Drag handlers */
  const onDragStart = (appId: number) => setDragApp(appId);
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = async (toStageId: number) => {
    if (!dragApp || !selectedId) return;
    try {
      await atsApi.moveApplication(dragApp, toStageId);
      await loadKanban(selectedId);
    } catch (e) {
      const err = e as { response?: { data?: { error?: string; detail?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || err.response?.data?.detail || "Movimiento ilegal" });
    } finally {
      setDragApp(null);
    }
  };

  return (
    <Box sx={{ px: { xs: "16px", md: "32px" }, pb: "32px", maxWidth: 1400, mx: "auto", color: T.ink }}>
      {/* Header */}
      <Box sx={{ pb: "16px", mb: "16px", borderBottom: `1px solid ${T.rule}`, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: "-0.025em", mb: 0.5 }}>
            Recruiting
          </Typography>
          <Typography variant="body2" sx={{ color: T.text2 }}>
            Kanban de candidatos por vacante. Drag-and-drop entre etapas para mover.
          </Typography>
        </Box>
        <Stack direction="row" gap={1.5}>
          <Button variant="outlined" onClick={openCreateCand} sx={{ borderColor: T.rule2, color: T.ink }}>
            + Candidato
          </Button>
          <Button variant="contained" onClick={openCreatePipe} sx={{ bgcolor: T.accent, color: "#FFFFFF", boxShadow: "none", "&:hover": { bgcolor: "#0496BA", boxShadow: "none" } }}>
            + Vacante
          </Button>
        </Stack>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "240px 1fr" }, gap: 2 }}>
        {/* Sidebar */}
        <Box>
          <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, display: "block", mb: 1 }}>
            Vacantes ({pipelines.length})
          </Typography>
          {loading ? (
            <Box sx={{ p: "24px", textAlign: "center" }}><CircularProgress size={18} sx={{ color: T.accent }} /></Box>
          ) : pipelines.length === 0 ? (
            <Box sx={{ p: "16px", border: `1px solid ${T.rule}`, borderRadius: 1.5, bgcolor: T.bg2, textAlign: "center" }}>
              <Typography variant="caption" sx={{ color: T.text3 }}>Sin vacantes</Typography>
            </Box>
          ) : (
            <Stack gap={0.75}>
              {pipelines.map((p) => (
                <Box
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  sx={{
                    p: "10px 12px", border: `1px solid ${selectedId === p.id ? T.accent : T.rule}`,
                    borderRadius: 1.5, cursor: "pointer", bgcolor: selectedId === p.id ? "rgba(2,189,234,0.05)" : T.bg,
                    transition: "all 160ms", "&:hover": { borderColor: T.rule2 },
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: T.text3, fontFamily: T.mono, fontSize: 10.5 }}>
                    {p.department || "—"} · {p.application_count} candidato{p.application_count !== 1 ? "s" : ""}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Box>

        {/* Kanban */}
        <Box>
          {!selectedId ? (
            <Box sx={{ p: "48px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg2, textAlign: "center" }}>
              <Typography variant="body1" sx={{ color: T.ink, fontWeight: 500 }}>Elegí una vacante</Typography>
            </Box>
          ) : loadingKb || !kanban ? (
            <Box sx={{ p: "48px", textAlign: "center" }}><CircularProgress size={22} sx={{ color: T.accent }} /></Box>
          ) : (
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>{kanban.pipeline_title}</Typography>
                <Button size="small" variant="outlined" onClick={() => setAddAppOpen(true)} sx={{ borderColor: T.rule2, color: T.ink }}>
                  + Agregar candidato
                </Button>
              </Stack>

              <Box sx={{
                display: "grid",
                gridTemplateColumns: `repeat(${kanban.columns.length}, minmax(220px, 1fr))`,
                gap: 1.5, overflowX: "auto", pb: 1,
              }}>
                {kanban.columns.map((col) => (
                  <Box
                    key={col.stage.id}
                    onDragOver={onDragOver}
                    onDrop={() => onDrop(col.stage.id)}
                    sx={{
                      bgcolor: T.bg2, borderRadius: 2, p: "8px 10px",
                      border: `1px solid ${T.rule}`,
                      minHeight: 400,
                    }}
                  >
                    <Stack direction="row" gap={1} alignItems="center" mb={1}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: col.stage.color }} />
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12.5, flex: 1 }}>
                        {col.stage.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: T.text3, fontFamily: T.mono, fontSize: 10.5 }}>
                        {col.cards.length}
                      </Typography>
                    </Stack>

                    <Stack gap={0.75}>
                      {col.cards.map((card) => (
                        <Box
                          key={card.application_id}
                          draggable
                          onDragStart={() => onDragStart(card.application_id)}
                          sx={{
                            p: "10px 12px", bgcolor: T.bg, borderRadius: 1.5,
                            border: `1px solid ${T.rule}`, cursor: "grab",
                            "&:active": { cursor: "grabbing" },
                            "&:hover": { borderColor: T.rule2 },
                            transition: "border-color 160ms",
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
                            {card.candidate_name}
                          </Typography>
                          {card.candidate_email && (
                            <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {card.candidate_email}
                            </Typography>
                          )}
                          <Stack direction="row" gap={0.5} mt={0.75}>
                            {card.candidate_source && (
                              <Chip label={card.candidate_source} size="small" sx={{ height: 16, fontSize: 9.5, bgcolor: T.surface2, color: T.text2 }} />
                            )}
                            <Chip
                              label={`${card.days_in_stage}d`} size="small"
                              sx={{
                                height: 16, fontSize: 9.5, fontFamily: T.mono,
                                bgcolor: card.days_in_stage > 14 ? "rgba(224,138,14,0.12)" : T.surface2,
                                color: card.days_in_stage > 14 ? T.amber : T.text3,
                              }}
                            />
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* Dialog: pipeline */}
      <Dialog open={pipeOpen} onClose={() => setPipeOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Nueva vacante</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ pt: 1 }}>
            <TextField size="small" label="Título *" value={pipeForm.title} onChange={(e) => setPipeForm({ ...pipeForm, title: e.target.value })} fullWidth placeholder="Senior Frontend Engineer" />
            <Stack direction="row" gap={2}>
              <TextField size="small" label="Departamento" value={pipeForm.department || ""} onChange={(e) => setPipeForm({ ...pipeForm, department: e.target.value })} fullWidth />
              <TextField size="small" label="Ubicación" value={pipeForm.location || ""} onChange={(e) => setPipeForm({ ...pipeForm, location: e.target.value })} fullWidth placeholder="Remote, Barcelona, ..." />
            </Stack>
            <FormControl size="small" fullWidth>
              <InputLabel>Hiring manager</InputLabel>
              <Select label="Hiring manager" value={pipeForm.hiring_manager_employee_id || ""} onChange={(e) => setPipeForm({ ...pipeForm, hiring_manager_employee_id: Number(e.target.value) || null })}>
                <MenuItem value="">— Sin asignar —</MenuItem>
                {employees.map((e) => (
                  <MenuItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField size="small" label="Descripción" value={pipeForm.description || ""} onChange={(e) => setPipeForm({ ...pipeForm, description: e.target.value })} fullWidth multiline minRows={3} />
            <Typography variant="caption" sx={{ color: T.text3, fontSize: 11 }}>
              Se crean automáticamente 6 etapas: Sourced · Phone screen · Interview · Offer · Hired · Rejected.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPipeOpen(false)}>Cancelar</Button>
          <Button onClick={savePipeline} variant="contained" disabled={savingPipe} sx={{ bgcolor: T.accent, "&:hover": { bgcolor: "#0496BA" } }}>
            {savingPipe ? <CircularProgress size={16} sx={{ color: "#FFFFFF" }} /> : "Crear"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: candidate */}
      <Dialog open={candOpen} onClose={() => setCandOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Nuevo candidato</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ pt: 1 }}>
            <Stack direction="row" gap={2}>
              <TextField size="small" label="Nombre *" value={candForm.first_name} onChange={(e) => setCandForm({ ...candForm, first_name: e.target.value })} fullWidth />
              <TextField size="small" label="Apellido *" value={candForm.last_name} onChange={(e) => setCandForm({ ...candForm, last_name: e.target.value })} fullWidth />
            </Stack>
            <Stack direction="row" gap={2}>
              <TextField size="small" label="Email" value={candForm.email || ""} onChange={(e) => setCandForm({ ...candForm, email: e.target.value })} fullWidth />
              <TextField size="small" label="Teléfono" value={candForm.phone || ""} onChange={(e) => setCandForm({ ...candForm, phone: e.target.value })} sx={{ width: 160 }} />
            </Stack>
            <Stack direction="row" gap={2}>
              <TextField size="small" label="Ubicación" value={candForm.location || ""} onChange={(e) => setCandForm({ ...candForm, location: e.target.value })} fullWidth />
              <FormControl size="small" sx={{ width: 180 }}>
                <InputLabel>Origen</InputLabel>
                <Select label="Origen" value={candForm.source || ""} onChange={(e) => setCandForm({ ...candForm, source: e.target.value || null })}>
                  <MenuItem value="">— Sin definir —</MenuItem>
                  <MenuItem value="linkedin">LinkedIn</MenuItem>
                  <MenuItem value="referral">Referral</MenuItem>
                  <MenuItem value="website">Web propio</MenuItem>
                  <MenuItem value="external_recruiter">Recruiter externo</MenuItem>
                  <MenuItem value="other">Otro</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <TextField size="small" label="LinkedIn URL" value={candForm.linkedin_url || ""} onChange={(e) => setCandForm({ ...candForm, linkedin_url: e.target.value })} fullWidth />
            <TextField size="small" label="Notas" value={candForm.notes || ""} onChange={(e) => setCandForm({ ...candForm, notes: e.target.value })} fullWidth multiline minRows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCandOpen(false)}>Cancelar</Button>
          <Button onClick={saveCandidate} variant="contained" disabled={savingCand} sx={{ bgcolor: T.accent, "&:hover": { bgcolor: "#0496BA" } }}>
            {savingCand ? <CircularProgress size={16} sx={{ color: "#FFFFFF" }} /> : "Agregar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: add candidate to pipeline */}
      <Dialog open={addAppOpen} onClose={() => setAddAppOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Agregar al pipeline</DialogTitle>
        <DialogContent>
          <FormControl size="small" fullWidth sx={{ mt: 1 }}>
            <InputLabel>Candidato</InputLabel>
            <Select label="Candidato" value={pickCandidateId} onChange={(e) => setPickCandidateId(Number(e.target.value))}>
              {candidates.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.first_name} {c.last_name} {c.email ? `· ${c.email}` : ""}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddAppOpen(false)}>Cancelar</Button>
          <Button onClick={handleAddToPipeline} variant="contained" disabled={!pickCandidateId} sx={{ bgcolor: T.accent, "&:hover": { bgcolor: "#0496BA" } }}>
            Agregar
          </Button>
        </DialogActions>
      </Dialog>
</Box>
  );
}
