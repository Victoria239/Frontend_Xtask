/* Tablero de Actividades — backlog + Kanban tipo Jira / Azure DevOps.
 *
 * Tres columnas: Pendiente · En curso · Finalizada.
 * - Cambio manual de estado: drag-and-drop nativo HTML5 entre columnas.
 * - Cambio automático: cada actividad puede llevar fecha de inicio y de fin;
 *   el sistema la mueve solo al llegar esas fechas (auto-transición en el backend).
 */

import { useEffect, useMemo, useState } from "react";
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControl, IconButton, InputLabel, MenuItem, Select, Stack,
  TextField, Tooltip, Typography,
} from "@mui/material";
import { activitiesApi, employeesApi } from "../../api";
import type {
  Activity, ActivityIn, ActivityPriority, ActivityStatus, BoardView,
} from "../../api/activities";
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

const COLUMNS: { status: ActivityStatus; label: string; color: string }[] = [
  { status: "pendiente", label: "Pendiente", color: T.text3 },
  { status: "en_curso", label: "En curso", color: T.accent },
  { status: "finalizada", label: "Finalizada", color: T.green },
];

const PRIORITY_META: Record<ActivityPriority, { label: string; color: string; bg: string }> = {
  alta: { label: "Alta", color: T.red, bg: "rgba(209,64,64,0.12)" },
  media: { label: "Media", color: T.amber, bg: "rgba(224,138,14,0.12)" },
  baja: { label: "Baja", color: T.text2, bg: T.surface2 },
};

const emptyForm: ActivityIn = {
  title: "", description: "", status: "pendiente", priority: "media",
  assignee_employee_id: null, start_at: null, due_at: null,
};

/* ISO → valor para <input type="datetime-local"> (hora local) */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
/* valor del input local → ISO con timezone, o null */
function fromLocalInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es", { day: "2-digit", month: "short" });
}

export default function ActivitiesPage() {
  const [board, setBoard] = useState<BoardView | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<ActivityStatus | null>(null);

  /* Form modal (crear / editar) */
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [form, setForm] = useState<ActivityIn>(emptyForm);
  const [saving, setSaving] = useState(false);

  const empName = useMemo(() => {
    const m = new Map<number, string>();
    employees.forEach((e) => m.set(e.id, `${e.first_name} ${e.last_name}`.trim()));
    return m;
  }, [employees]);

  const loadBoard = async () => {
    try {
      const b = await activitiesApi.getBoard();
      setBoard(b);
    } catch (e) {
      const err = e as { response?: { data?: { error?: string; detail?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || err.response?.data?.detail || "No se cargó el tablero" });
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [emps] = await Promise.all([
          employeesApi.getEmployees({ pageSize: 100 }),
          loadBoard(),
        ]);
        setEmployees(emps.data);
      } catch {
        /* board ya notificó su propio error */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ─── Modal ─────────────────────────────────── */
  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };
  const openEdit = (a: Activity) => {
    setEditing(a);
    setForm({
      title: a.title,
      description: a.description || "",
      status: a.status,
      priority: a.priority,
      assignee_employee_id: a.assignee_employee_id,
      start_at: a.start_at,
      due_at: a.due_at,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) {
      notify({ kind: "error", msg: "El título es obligatorio" });
      return;
    }
    if (form.start_at && form.due_at && new Date(form.due_at) < new Date(form.start_at)) {
      notify({ kind: "error", msg: "La fecha de fin no puede ser anterior a la de inicio" });
      return;
    }
    setSaving(true);
    const payload: ActivityIn = {
      ...form,
      title: form.title.trim(),
      description: form.description?.trim() || null,
    };
    try {
      if (editing) {
        await activitiesApi.update(editing.id, payload);
        notify({ kind: "success", msg: "Actividad actualizada" });
      } else {
        await activitiesApi.create(payload);
        notify({ kind: "success", msg: "Actividad creada" });
      }
      setOpen(false);
      await loadBoard();
    } catch (e) {
      const err = e as { response?: { data?: { error?: string; detail?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || err.response?.data?.detail || "No se pudo guardar" });
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await activitiesApi.remove(editing.id);
      setOpen(false);
      await loadBoard();
      notify({ kind: "success", msg: "Actividad eliminada" });
    } catch (e) {
      const err = e as { response?: { data?: { error?: string; detail?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || err.response?.data?.detail || "No se pudo eliminar" });
    } finally {
      setSaving(false);
    }
  };

  /* ─── Drag & drop ─────────────────────────────────── */
  const onDrop = async (toStatus: ActivityStatus) => {
    setDragOver(null);
    if (dragId == null) return;
    const card = board?.columns.flatMap((c) => c.cards).find((a) => a.id === dragId);
    setDragId(null);
    if (!card || card.status === toStatus) return;
    try {
      await activitiesApi.move(card.id, toStatus);
      await loadBoard();
    } catch (e) {
      const err = e as { response?: { data?: { error?: string; detail?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || err.response?.data?.detail || "No se pudo mover" });
    }
  };

  const colCards = (status: ActivityStatus) =>
    board?.columns.find((c) => c.status === status)?.cards ?? [];

  return (
    <Box sx={{ px: { xs: "16px", md: "32px" }, pb: "32px", maxWidth: 1400, mx: "auto", color: T.ink }}>
      {/* Header */}
      <Box sx={{ pb: "16px", mb: "16px", borderBottom: `1px solid ${T.rule}`, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: "-0.025em", mb: 0.5 }}>
            Actividades
          </Typography>
          <Typography variant="body2" sx={{ color: T.text2 }}>
            Backlog y tablero. Arrastrá entre columnas para cambiar el estado, o asigná fechas y el sistema lo hace solo.
          </Typography>
        </Box>
        <Button variant="contained" onClick={openCreate} sx={{ bgcolor: T.accent, color: "#FFFFFF", boxShadow: "none", "&:hover": { bgcolor: "#0496BA", boxShadow: "none" } }}>
          + Nueva actividad
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ p: "64px", textAlign: "center" }}><CircularProgress size={22} sx={{ color: T.accent }} /></Box>
      ) : (
        <Box sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(240px, 1fr))" },
          gap: 1.5, overflowX: "auto", pb: 1,
        }}>
          {COLUMNS.map((col) => {
            const cards = colCards(col.status);
            return (
              <Box
                key={col.status}
                onDragOver={(e) => { e.preventDefault(); if (dragOver !== col.status) setDragOver(col.status); }}
                onDragLeave={() => setDragOver((s) => (s === col.status ? null : s))}
                onDrop={() => onDrop(col.status)}
                sx={{
                  bgcolor: dragOver === col.status ? "rgba(2,189,234,0.06)" : T.bg2,
                  borderRadius: 2, p: "10px",
                  border: `1px solid ${dragOver === col.status ? T.accent : T.rule}`,
                  minHeight: 440, transition: "background 160ms, border-color 160ms",
                }}
              >
                <Stack direction="row" gap={1} alignItems="center" mb={1.25} sx={{ px: "2px" }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: col.color }} />
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12.5, flex: 1 }}>
                    {col.label}
                  </Typography>
                  <Typography variant="caption" sx={{ color: T.text3, fontFamily: T.mono, fontSize: 10.5 }}>
                    {cards.length}
                  </Typography>
                </Stack>

                <Stack gap={1}>
                  {cards.length === 0 && (
                    <Box sx={{ p: "16px", border: `1px dashed ${T.rule2}`, borderRadius: 1.5, textAlign: "center" }}>
                      <Typography variant="caption" sx={{ color: T.text3 }}>Sin actividades</Typography>
                    </Box>
                  )}
                  {cards.map((a) => {
                    const p = PRIORITY_META[a.priority];
                    const scheduled = !!(a.start_at || a.due_at);
                    return (
                      <Box
                        key={a.id}
                        draggable
                        onDragStart={() => setDragId(a.id)}
                        onDragEnd={() => { setDragId(null); setDragOver(null); }}
                        onClick={() => openEdit(a)}
                        sx={{
                          p: "10px 12px", bgcolor: T.bg, borderRadius: 1.5,
                          border: `1px solid ${T.rule}`, cursor: "grab",
                          opacity: dragId === a.id ? 0.5 : 1,
                          "&:active": { cursor: "grabbing" },
                          "&:hover": { borderColor: T.accent },
                          transition: "border-color 160ms, opacity 160ms",
                        }}
                      >
                        <Stack direction="row" gap={0.75} alignItems="flex-start" justifyContent="space-between">
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>
                            {a.title}
                          </Typography>
                          {scheduled && (
                            <Tooltip title={`Auto${a.start_at ? ` · inicia ${fmtDate(a.start_at)}` : ""}${a.due_at ? ` · vence ${fmtDate(a.due_at)}` : ""}`}>
                              <Box sx={{ color: T.accent, display: "grid", placeItems: "center", flexShrink: 0, mt: "1px" }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" />
                                </svg>
                              </Box>
                            </Tooltip>
                          )}
                        </Stack>

                        {a.description && (
                          <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, display: "block", mt: 0.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {a.description}
                          </Typography>
                        )}

                        <Stack direction="row" gap={0.5} mt={1} alignItems="center" flexWrap="wrap">
                          <Chip label={p.label} size="small" sx={{ height: 18, fontSize: 9.5, fontWeight: 600, bgcolor: p.bg, color: p.color }} />
                          {a.assignee_employee_id != null && (
                            <Chip
                              label={empName.get(a.assignee_employee_id) || `#${a.assignee_employee_id}`}
                              size="small"
                              sx={{ height: 18, fontSize: 9.5, bgcolor: T.surface2, color: T.text2 }}
                            />
                          )}
                          {a.due_at && (
                            <Chip
                              label={fmtDate(a.due_at)} size="small"
                              sx={{ height: 18, fontSize: 9.5, fontFamily: T.mono, bgcolor: T.surface2, color: T.text3 }}
                            />
                          )}
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Dialog: crear / editar */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>{editing ? "Editar actividad" : "Nueva actividad"}</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ pt: 1 }}>
            <TextField size="small" label="Título *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} fullWidth autoFocus placeholder="Preparar informe trimestral" />
            <TextField size="small" label="Descripción" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} fullWidth multiline minRows={2} />
            <Stack direction="row" gap={2}>
              <FormControl size="small" fullWidth>
                <InputLabel>Responsable</InputLabel>
                <Select label="Responsable" value={form.assignee_employee_id ?? ""} onChange={(e) => setForm({ ...form, assignee_employee_id: e.target.value === "" ? null : Number(e.target.value) })}>
                  <MenuItem value="">— Sin asignar —</MenuItem>
                  {employees.map((e) => (
                    <MenuItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ width: 160 }}>
                <InputLabel>Prioridad</InputLabel>
                <Select label="Prioridad" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as ActivityPriority })}>
                  <MenuItem value="baja">Baja</MenuItem>
                  <MenuItem value="media">Media</MenuItem>
                  <MenuItem value="alta">Alta</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <Stack direction="row" gap={2}>
              <TextField
                size="small" label="Fecha de inicio" type="datetime-local"
                value={toLocalInput(form.start_at)}
                onChange={(e) => setForm({ ...form, start_at: fromLocalInput(e.target.value) })}
                fullWidth InputLabelProps={{ shrink: true }}
              />
              <TextField
                size="small" label="Fecha de fin" type="datetime-local"
                value={toLocalInput(form.due_at)}
                onChange={(e) => setForm({ ...form, due_at: fromLocalInput(e.target.value) })}
                fullWidth InputLabelProps={{ shrink: true }}
              />
            </Stack>
            <FormControl size="small" fullWidth>
              <InputLabel>Estado</InputLabel>
              <Select label="Estado" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ActivityStatus })}>
                <MenuItem value="pendiente">Pendiente</MenuItem>
                <MenuItem value="en_curso">En curso</MenuItem>
                <MenuItem value="finalizada">Finalizada</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="caption" sx={{ color: T.text3, fontSize: 11 }}>
              Si asignás fechas, el sistema mueve la actividad automáticamente: a <b>En curso</b> al llegar la fecha de inicio y a <b>Finalizada</b> al llegar la de fin.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: "space-between" }}>
          <Box>
            {editing && (
              <Button onClick={del} disabled={saving} sx={{ color: T.red }}>Eliminar</Button>
            )}
          </Box>
          <Stack direction="row" gap={1}>
            <Button onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} variant="contained" disabled={saving} sx={{ bgcolor: T.accent, "&:hover": { bgcolor: "#0496BA" } }}>
              {saving ? <CircularProgress size={16} sx={{ color: "#FFFFFF" }} /> : editing ? "Guardar" : "Crear"}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
