/* Módulo de Habilidades — Dashboard, catálogo, CRUD, evaluaciones, perfil, reportes */

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Box, Grid, Card, CardContent, Typography, Button, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Avatar, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, FormControl, InputLabel,
  Select, MenuItem, IconButton, Tooltip, InputAdornment, LinearProgress,
} from "@mui/material";
import {
  Add as AddIcon, Close as CloseIcon, Search as SearchIcon,
  Visibility as ViewIcon, Edit as EditIcon, Delete as DeleteIcon,
  FilterList as FilterIcon, Download as DownloadIcon, ArrowBack as BackIcon,
  Psychology as BrainIcon, School as SchoolIcon, Star as StarIcon,
  Warning as WarnIcon, People as PeopleIcon, TrendingUp as TrendIcon,
  Category as CatIcon, Assessment as AssessIcon,
} from "@mui/icons-material";
import { skillsApi, employeesApi } from "../../api";
import type { Skill, Employee } from "../../types";
import { brand } from "../../theme";

/* helpers */
const levels = ["principiante", "intermedio", "avanzado", "experto"] as const;
const levelConf: Record<string, { color: string; score: number }> = {
  principiante: { color: "#f59e0b", score: 1 },
  intermedio: { color: "#3b82f6", score: 2 },
  avanzado: { color: "#8b5cf6", score: 3 },
  experto: { color: "#10b981", score: 4 },
};
const categories = ["técnica", "blanda", "liderazgo", "idioma", "certificación"] as const;
const skillTypes = ["conocimiento", "herramienta", "metodología", "comportamiento"] as const;

/* ================================================================== */
export default function SkillsPage() {
  const [view, setView] = useState<"main" | "create" | "profile" | "evaluate">("main");
  const [mainTab, setMainTab] = useState(0);

  const [skills, setSkills] = useState<Skill[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* filtros */
  const [fSearch, setFSearch] = useState("");
  const [fCategory, setFCategory] = useState("");
  const [fLevel, setFLevel] = useState("");

  /* CRUD */
  const [editSkill, setEditSkill] = useState<Skill | null>(null);
  const [delSkill, setDelSkill] = useState<Skill | null>(null);
  const [profileEmp, setProfileEmp] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");

  /* form crear/editar */
  const [form, setForm] = useState({
    name: "", description: "", category: "técnica", type: "conocimiento",
    employee_id: "", level: "intermedio", critical: "opcional",
    area: "", lvlDesc: "",
  });

  /* form evaluación */
  const [evalForm, setEvalForm] = useState({
    employee_id: "", skill_id: "", level: "intermedio", score: "",
    evaluator: "", comment: "", date: new Date().toISOString().split("T")[0],
  });

  const pending = useRef(false);
  const onExited = () => { if (pending.current) { pending.current = false; fetchData(); } };

  const fetchData = useCallback(async (spin = false) => {
    if (spin) setLoading(true);
    try {
      const [sR, eR] = await Promise.allSettled([
        skillsApi.getSkills({ pageSize: 200 }),
        employeesApi.getEmployees({ pageSize: 100 }),
      ]);
      if (sR.status === "fulfilled") setSkills(sR.value.data);
      if (eR.status === "fulfilled") setEmployees(eR.value.data);
    } catch { setError("Error al cargar habilidades"); }
    finally { if (spin) setLoading(false); }
  }, []);
  useEffect(() => { fetchData(true); }, [fetchData]);

  /* derivados */
  const uniqueSkillNames = [...new Set(skills.map((s) => s.name))];
  const avgLevel = skills.length
    ? (skills.reduce((s, sk) => s + (levelConf[sk.level || ""]?.score || 0), 0) / skills.length).toFixed(1)
    : "0";
  const criticalSkills = skills.filter((s) => s.category === "técnica" && (levelConf[s.level || ""]?.score || 0) <= 1);

  const filteredSkills = skills.filter((s) => {
    if (fSearch && !s.name.toLowerCase().includes(fSearch.toLowerCase())) return false;
    if (fCategory && s.category !== fCategory) return false;
    if (fLevel && s.level !== fLevel) return false;
    return true;
  });

  /* helpers por empleado */
  const skillsByEmp = (empId: number) => skills.filter((s) => s.employee_id === empId);

  /* CRUD */
  const openCreate = () => {
    setEditSkill(null);
    setForm({ name: "", description: "", category: "técnica", type: "conocimiento", employee_id: "", level: "intermedio", critical: "opcional", area: "", lvlDesc: "" });
    setFormErr(""); setView("create");
  };

  const openEdit = (s: Skill) => {
    setEditSkill(s);
    setForm({ ...form, name: s.name, category: s.category || "técnica", level: s.level || "intermedio", employee_id: String(s.employee_id) });
    setFormErr(""); setView("create");
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormErr("El nombre es obligatorio"); return; }
    setSaving(true); setFormErr("");
    try {
      if (editSkill) {
        await skillsApi.updateSkill(editSkill.id, { name: form.name, level: form.level, category: form.category });
      } else {
        await skillsApi.createSkill({
          employee_id: Number(form.employee_id) || employees[0]?.id || 1,
          name: form.name,
          level: form.level,
          category: form.category,
        });
      }
      pending.current = true; setView("main"); fetchData();
    } catch { setFormErr("Error al guardar habilidad"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!delSkill) return;
    try { await skillsApi.deleteSkill(delSkill.id); pending.current = true; setDelSkill(null); fetchData(); }
    catch { setError("Error al eliminar"); }
  };

  const handleEvaluate = async () => {
    if (!evalForm.skill_id || !evalForm.employee_id) { setFormErr("Seleccione empleado y habilidad"); return; }
    setSaving(true); setFormErr("");
    try {
      await skillsApi.updateSkill(Number(evalForm.skill_id), { level: evalForm.level });
      pending.current = true; setView("main"); fetchData();
    } catch { setFormErr("Error al evaluar"); }
    finally { setSaving(false); }
  };

  /* ── render ── */
  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh"><CircularProgress sx={{ color: brand.purple }} /></Box>;

  /* ── CREAR / EDITAR ── */
  if (view === "create") return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Button startIcon={<BackIcon />} onClick={() => setView("main")} sx={{ textTransform: "none", fontWeight: 600 }}>Volver</Button>
        <Typography variant="h4" fontWeight={800}>{editSkill ? "Editar" : "Nueva"} Habilidad</Typography>
      </Box>
      {formErr && <Alert severity="error" sx={{ mb: 2 }}>{formErr}</Alert>}

      <Grid container spacing={3}>
        <Grid size={12}><Card sx={{ border: "1px solid", borderColor: "divider" }}><CardContent>
          <Typography variant="h6" fontWeight={700} mb={2}>Información Básica</Typography>
          <Grid container spacing={2}>
            <Grid size={12}><TextField label="Nombre de la habilidad *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth size="small" /></Grid>
            <Grid size={12}><TextField label="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} fullWidth size="small" multiline rows={2} /></Grid>
            <Grid size={6}>
              <FormControl fullWidth size="small"><InputLabel>Categoría</InputLabel>
                <Select value={form.category} label="Categoría" onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {categories.map((c) => <MenuItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={6}>
              <FormControl fullWidth size="small"><InputLabel>Tipo de habilidad</InputLabel>
                <Select value={form.type} label="Tipo de habilidad" onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {skillTypes.map((t) => <MenuItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent></Card></Grid>

        <Grid size={12}><Card sx={{ border: "1px solid", borderColor: "divider" }}><CardContent>
          <Typography variant="h6" fontWeight={700} mb={2}>Configuración de Niveles</Typography>
          <Grid container spacing={2}>
            {levels.map((l) => {
              const lc = levelConf[l];
              return (
                <Grid size={{ xs: 12, sm: 6, md: 3 }} key={l}>
                  <Card sx={{ border: "2px solid", borderColor: form.level === l ? lc.color : "divider", cursor: "pointer", "&:hover": { borderColor: lc.color } }}
                    onClick={() => setForm({ ...form, level: l })}>
                    <CardContent sx={{ textAlign: "center", p: 2, "&:last-child": { pb: 2 } }}>
                      <Avatar sx={{ bgcolor: `${lc.color}15`, color: lc.color, mx: "auto", mb: 1 }}><StarIcon /></Avatar>
                      <Typography fontWeight={700} sx={{ textTransform: "capitalize" }}>{l}</Typography>
                      <Typography variant="caption" color="text.secondary">Puntaje: {lc.score}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </CardContent></Card></Grid>

        <Grid size={12}><Card sx={{ border: "1px solid", borderColor: "divider" }}><CardContent>
          <Typography variant="h6" fontWeight={700} mb={2}>Configuración Adicional</Typography>
          <Grid container spacing={2}>
            <Grid size={6}>
              <FormControl fullWidth size="small"><InputLabel>Criticidad</InputLabel>
                <Select value={form.critical} label="Criticidad" onChange={(e) => setForm({ ...form, critical: e.target.value })}>
                  <MenuItem value="crítica">Crítica</MenuItem><MenuItem value="recomendada">Recomendada</MenuItem><MenuItem value="opcional">Opcional</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={6}>
              <FormControl fullWidth size="small"><InputLabel>Colaborador</InputLabel>
                <Select value={form.employee_id} label="Colaborador" onChange={(e) => setForm({ ...form, employee_id: e.target.value })}>
                  <MenuItem value="">Seleccionar</MenuItem>
                  {employees.map((e) => <MenuItem key={e.id} value={String(e.id)}>{e.first_name} {e.last_name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent></Card></Grid>
      </Grid>

      <Box display="flex" justifyContent="flex-end" gap={1} mt={3}>
        <Button onClick={() => setView("main")} sx={{ textTransform: "none" }}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}
          sx={{ bgcolor: brand.purple, "&:hover": { bgcolor: brand.purpleDark }, textTransform: "none", fontWeight: 600, borderRadius: 2, px: 4 }}>
          {saving ? <CircularProgress size={20} /> : editSkill ? "Guardar" : "Crear Habilidad"}
        </Button>
      </Box>
    </Box>
  );

  /* ── PERFIL COLABORADOR ── */
  if (view === "profile" && profileEmp) {
    const empSkills = skillsByEmp(profileEmp.id);
    const empAvg = empSkills.length
      ? (empSkills.reduce((s, sk) => s + (levelConf[sk.level || ""]?.score || 0), 0) / empSkills.length).toFixed(1)
      : "0";
    return (
      <Box>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Button startIcon={<BackIcon />} onClick={() => { setView("main"); setProfileEmp(null); }} sx={{ textTransform: "none", fontWeight: 600 }}>Volver</Button>
          <Avatar sx={{ bgcolor: `${brand.purple}15`, color: brand.purple, width: 48, height: 48 }}>{profileEmp.first_name[0]}{profileEmp.last_name[0]}</Avatar>
          <Box>
            <Typography variant="h5" fontWeight={800}>{profileEmp.first_name} {profileEmp.last_name}</Typography>
            <Typography variant="body2" color="text.secondary">{profileEmp.position} · {profileEmp.department}</Typography>
          </Box>
        </Box>

        {/* cards */}
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card sx={{ border: "1px solid", borderColor: "divider" }}><CardContent>
              <Typography variant="caption" color="text.secondary">Habilidades</Typography>
              <Typography variant="h4" fontWeight={700}>{empSkills.length}</Typography>
            </CardContent></Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card sx={{ border: "1px solid", borderColor: "divider" }}><CardContent>
              <Typography variant="caption" color="text.secondary">Nivel Promedio</Typography>
              <Typography variant="h4" fontWeight={700} color={brand.purple}>{empAvg}</Typography>
            </CardContent></Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card sx={{ border: "1px solid", borderColor: "divider" }}><CardContent>
              <Typography variant="caption" color="text.secondary">Categorías</Typography>
              <Typography variant="h4" fontWeight={700}>{new Set(empSkills.map((s) => s.category)).size}</Typography>
            </CardContent></Card>
          </Grid>
        </Grid>

        {/* radar placeholder + progress */}
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Card sx={{ height: "100%", border: "1px solid", borderColor: "divider" }}><CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}>Perfil de Competencias</Typography>
              <Box display="flex" alignItems="center" justifyContent="center" minHeight={200}>
                {categories.map((cat) => {
                  const catSkills = empSkills.filter((s) => s.category === cat);
                  const avg = catSkills.length ? catSkills.reduce((s, sk) => s + (levelConf[sk.level || ""]?.score || 0), 0) / catSkills.length : 0;
                  return (
                    <Box key={cat} textAlign="center" mx={1}>
                      <Box sx={{ width: 40, bgcolor: `${brand.purple}${Math.round((avg / 4) * 255).toString(16).padStart(2, "0")}`, height: Math.max(avg * 40, 8), borderRadius: 1, mx: "auto", mb: .5 }} />
                      <Typography variant="caption" sx={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontSize: 10 }}>{cat}</Typography>
                    </Box>
                  );
                })}
              </Box>
            </CardContent></Card>
          </Grid>
          <Grid size={{ xs: 12, md: 7 }}>
            <Card sx={{ height: "100%", border: "1px solid", borderColor: "divider" }}><CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}>Progreso por Habilidad</Typography>
              {empSkills.length === 0
                ? <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>Sin habilidades registradas</Typography>
                : empSkills.map((s) => {
                  const lc = levelConf[s.level || ""] || { color: "#6b7280", score: 0 };
                  return (
                    <Box key={s.id} mb={2}>
                      <Box display="flex" justifyContent="space-between" mb={.5}>
                        <Typography variant="body2" fontWeight={600}>{s.name}</Typography>
                        <Chip label={s.level || "—"} size="small" sx={{ bgcolor: `${lc.color}15`, color: lc.color, fontWeight: 700, fontSize: 11, textTransform: "capitalize" }} />
                      </Box>
                      <LinearProgress variant="determinate" value={(lc.score / 4) * 100} sx={{ height: 6, borderRadius: 3, bgcolor: "#f3f4f6", "& .MuiLinearProgress-bar": { bgcolor: lc.color, borderRadius: 3 } }} />
                    </Box>
                  );
                })
              }
            </CardContent></Card>
          </Grid>
        </Grid>

        {/* tabla habilidades */}
        <Card sx={{ border: "1px solid", borderColor: "divider" }}><CardContent>
          <Typography variant="h6" fontWeight={700} mb={2}>Habilidades del Colaborador</Typography>
          <TableContainer><Table size="small">
            <TableHead><TableRow sx={{ bgcolor: "#fafafa" }}>
              <TableCell sx={{ fontWeight: 700 }}>Habilidad</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Categoría</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Nivel</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Última evaluación</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {empSkills.map((s) => {
                const lc = levelConf[s.level || ""] || { color: "#6b7280", score: 0 };
                return (
                  <TableRow key={s.id}>
                    <TableCell><Typography fontWeight={600}>{s.name}</Typography></TableCell>
                    <TableCell><Chip label={s.category || "—"} size="small" sx={{ fontWeight: 600, textTransform: "capitalize" }} /></TableCell>
                    <TableCell><Chip label={s.level || "—"} size="small" sx={{ bgcolor: `${lc.color}15`, color: lc.color, fontWeight: 700, textTransform: "capitalize" }} /></TableCell>
                    <TableCell><Typography variant="caption" color="text.secondary">{new Date(s.updated_at).toLocaleDateString("es-CO")}</Typography></TableCell>
                  </TableRow>
                );
              })}
              {!empSkills.length && <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: "text.secondary" }}>Sin habilidades</TableCell></TableRow>}
            </TableBody>
          </Table></TableContainer>
        </CardContent></Card>
      </Box>
    );
  }

  /* ── EVALUAR ── */
  if (view === "evaluate") return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Button startIcon={<BackIcon />} onClick={() => setView("main")} sx={{ textTransform: "none", fontWeight: 600 }}>Volver</Button>
        <Typography variant="h4" fontWeight={800}>Evaluar Habilidad</Typography>
      </Box>
      {formErr && <Alert severity="error" sx={{ mb: 2 }}>{formErr}</Alert>}
      <Card sx={{ border: "1px solid", borderColor: "divider" }}><CardContent>
        <Grid container spacing={2}>
          <Grid size={6}>
            <FormControl fullWidth size="small"><InputLabel>Colaborador *</InputLabel>
              <Select value={evalForm.employee_id} label="Colaborador *" onChange={(e) => setEvalForm({ ...evalForm, employee_id: e.target.value })}>
                {employees.map((e) => <MenuItem key={e.id} value={String(e.id)}>{e.first_name} {e.last_name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={6}>
            <FormControl fullWidth size="small"><InputLabel>Habilidad *</InputLabel>
              <Select value={evalForm.skill_id} label="Habilidad *" onChange={(e) => setEvalForm({ ...evalForm, skill_id: e.target.value })}>
                {skills.filter((s) => !evalForm.employee_id || s.employee_id === Number(evalForm.employee_id)).map((s) => (
                  <MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={4}>
            <FormControl fullWidth size="small"><InputLabel>Nivel</InputLabel>
              <Select value={evalForm.level} label="Nivel" onChange={(e) => setEvalForm({ ...evalForm, level: e.target.value })}>
                {levels.map((l) => <MenuItem key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={4}><TextField label="Puntuación" type="number" value={evalForm.score} onChange={(e) => setEvalForm({ ...evalForm, score: e.target.value })} fullWidth size="small" /></Grid>
          <Grid size={4}><TextField label="Fecha" type="date" value={evalForm.date} onChange={(e) => setEvalForm({ ...evalForm, date: e.target.value })} fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} /></Grid>
          <Grid size={6}><TextField label="Evaluador" value={evalForm.evaluator} onChange={(e) => setEvalForm({ ...evalForm, evaluator: e.target.value })} fullWidth size="small" /></Grid>
          <Grid size={6}><TextField label="Comentario" value={evalForm.comment} onChange={(e) => setEvalForm({ ...evalForm, comment: e.target.value })} fullWidth size="small" /></Grid>
        </Grid>
      </CardContent></Card>
      <Box display="flex" justifyContent="flex-end" gap={1} mt={3}>
        <Button onClick={() => setView("main")} sx={{ textTransform: "none" }}>Cancelar</Button>
        <Button variant="contained" onClick={handleEvaluate} disabled={saving}
          sx={{ bgcolor: brand.purple, "&:hover": { bgcolor: brand.purpleDark }, textTransform: "none", fontWeight: 600, borderRadius: 2, px: 4 }}>
          {saving ? <CircularProgress size={20} /> : "Registrar Evaluación"}
        </Button>
      </Box>
    </Box>
  );

  /* ── VISTA PRINCIPAL ── */
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Habilidades</Typography>
          <Typography variant="body2" color="text.secondary">Gestión del talento y competencias del equipo</Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="outlined" onClick={() => { setEvalForm({ employee_id: "", skill_id: "", level: "intermedio", score: "", evaluator: "", comment: "", date: new Date().toISOString().split("T")[0] }); setFormErr(""); setView("evaluate"); }}
            sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, borderColor: brand.purple, color: brand.purple }}>
            Evaluar
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
            sx={{ bgcolor: brand.purple, "&:hover": { bgcolor: brand.purpleDark }, textTransform: "none", fontWeight: 600, borderRadius: 2, px: 3 }}>
            Nueva Habilidad
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      <Tabs value={mainTab} onChange={(_, v) => setMainTab(v)} sx={{ mb: 3, borderBottom: "2px solid", borderColor: "divider",
        "& .MuiTab-root": { textTransform: "none", fontWeight: 600 }, "& .Mui-selected": { color: brand.purple }, "& .MuiTabs-indicator": { bgcolor: brand.purple } }}>
        <Tab icon={<BrainIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Dashboard" />
        <Tab icon={<CatIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Catálogo" />
        <Tab icon={<PeopleIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Colaboradores" />
        <Tab icon={<DownloadIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Reportes" />
      </Tabs>

      {/* ════════════ TAB 0: DASHBOARD ════════════ */}
      {mainTab === 0 && (
        <Box>
          {/* cards */}
          <Grid container spacing={2} mb={3}>
            {[
              { t: "Colaboradores Evaluados", v: new Set(skills.map((s) => s.employee_id)).size, s: "Con al menos 1 habilidad", icon: <PeopleIcon />, c: brand.purple },
              { t: "Habilidades Registradas", v: uniqueSkillNames.length, s: "Tipos únicos", icon: <BrainIcon />, c: "#3b82f6" },
              { t: "Nivel Promedio", v: avgLevel, s: "Del equipo (1-4)", icon: <TrendIcon />, c: "#10b981" },
              { t: "Habilidades Críticas", v: criticalSkills.length, s: "Nivel principiante en técnica", icon: <WarnIcon />, c: "#ef4444" },
            ].map((c) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={c.t}>
                <Card sx={{ height: "100%", border: "1px solid", borderColor: "divider" }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>{c.t}</Typography>
                        <Typography variant="h4" fontWeight={700} mt={.5}>{c.v}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block" mt={.3}>{c.s}</Typography>
                      </Box>
                      <Avatar sx={{ bgcolor: `${c.c}12`, color: c.c, width: 44, height: 44 }}>{c.icon}</Avatar>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* distribución niveles + competencias */}
          <Grid container spacing={2} mb={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: "100%", border: "1px solid", borderColor: "divider" }}><CardContent>
                <Typography variant="h6" fontWeight={700} mb={2}>Distribución de Niveles</Typography>
                {levels.map((l) => {
                  const count = skills.filter((s) => s.level === l).length;
                  const pctVal = skills.length ? (count / skills.length) * 100 : 0;
                  const lc = levelConf[l];
                  return (
                    <Box key={l} mb={2}>
                      <Box display="flex" justifyContent="space-between" mb={.5}>
                        <Typography variant="body2" fontWeight={600} sx={{ textTransform: "capitalize" }}>{l}</Typography>
                        <Typography variant="body2" fontWeight={700} color={lc.color}>{count}</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={pctVal} sx={{ height: 8, borderRadius: 4, bgcolor: "#f3f4f6", "& .MuiLinearProgress-bar": { bgcolor: lc.color, borderRadius: 4 } }} />
                    </Box>
                  );
                })}
              </CardContent></Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: "100%", border: "1px solid", borderColor: "divider" }}><CardContent>
                <Typography variant="h6" fontWeight={700} mb={2}>Mapa de Competencias</Typography>
                {categories.map((cat) => {
                  const catSkills = skills.filter((s) => s.category === cat);
                  const avg = catSkills.length ? catSkills.reduce((s, sk) => s + (levelConf[sk.level || ""]?.score || 0), 0) / catSkills.length : 0;
                  return (
                    <Box key={cat} display="flex" alignItems="center" gap={2} mb={1.5}>
                      <Typography variant="body2" fontWeight={600} sx={{ width: 100, textTransform: "capitalize" }}>{cat}</Typography>
                      <Box flex={1}><LinearProgress variant="determinate" value={(avg / 4) * 100} sx={{ height: 10, borderRadius: 5, bgcolor: "#f3f4f6", "& .MuiLinearProgress-bar": { bgcolor: brand.purple, borderRadius: 5 } }} /></Box>
                      <Typography variant="body2" fontWeight={700} sx={{ width: 30 }}>{avg.toFixed(1)}</Typography>
                    </Box>
                  );
                })}
              </CardContent></Card>
            </Grid>
          </Grid>

          {/* evaluaciones recientes */}
          <Card sx={{ border: "1px solid", borderColor: "divider" }}><CardContent>
            <Typography variant="h6" fontWeight={700} mb={2}>Evaluaciones Recientes</Typography>
            <TableContainer><Table size="small">
              <TableHead><TableRow sx={{ bgcolor: "#fafafa" }}>
                <TableCell sx={{ fontWeight: 700 }}>Fecha</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Colaborador</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Habilidad</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Nivel</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {skills.slice(0, 8).map((s) => {
                  const emp = employees.find((e) => e.id === s.employee_id);
                  const lc = levelConf[s.level || ""] || { color: "#6b7280" };
                  return (
                    <TableRow key={s.id}>
                      <TableCell><Typography variant="caption">{new Date(s.updated_at).toLocaleDateString("es-CO")}</Typography></TableCell>
                      <TableCell><Typography variant="body2" fontWeight={600}>{emp ? `${emp.first_name} ${emp.last_name}` : "—"}</Typography></TableCell>
                      <TableCell>{s.name}</TableCell>
                      <TableCell><Chip label={s.level || "—"} size="small" sx={{ bgcolor: `${lc.color}15`, color: lc.color, fontWeight: 700, textTransform: "capitalize" }} /></TableCell>
                    </TableRow>
                  );
                })}
                {!skills.length && <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: "text.secondary" }}>Sin evaluaciones</TableCell></TableRow>}
              </TableBody>
            </Table></TableContainer>
          </CardContent></Card>
        </Box>
      )}

      {/* ════════════ TAB 1: CATÁLOGO ════════════ */}
      {mainTab === 1 && (
        <Box>
          <Box display="flex" alignItems="center" gap={1} mb={2} flexWrap="wrap">
            <TextField size="small" placeholder="Buscar habilidad..." value={fSearch} onChange={(e) => setFSearch(e.target.value)}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} sx={{ width: 240 }} />
            <FormControl size="small" sx={{ minWidth: 140 }}><InputLabel>Categoría</InputLabel>
              <Select value={fCategory} label="Categoría" onChange={(e) => setFCategory(e.target.value)}>
                <MenuItem value="">Todas</MenuItem>{categories.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}><InputLabel>Nivel</InputLabel>
              <Select value={fLevel} label="Nivel" onChange={(e) => setFLevel(e.target.value)}>
                <MenuItem value="">Todos</MenuItem>{levels.map((l) => <MenuItem key={l} value={l}>{l}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>

          <Card sx={{ border: "1px solid", borderColor: "divider" }}>
            <TableContainer><Table>
              <TableHead><TableRow sx={{ bgcolor: "#fafafa" }}>
                <TableCell sx={{ fontWeight: 700 }}>Habilidad</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Categoría</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Nivel</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Colaborador</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Creación</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Acciones</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {filteredSkills.length === 0 ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>No hay habilidades</TableCell></TableRow>
                ) : filteredSkills.map((s) => {
                  const emp = employees.find((e) => e.id === s.employee_id);
                  const lc = levelConf[s.level || ""] || { color: "#6b7280" };
                  return (
                    <TableRow key={s.id} hover>
                      <TableCell><Typography fontWeight={700}>{s.name}</Typography></TableCell>
                      <TableCell><Chip label={s.category || "—"} size="small" sx={{ fontWeight: 600, textTransform: "capitalize" }} /></TableCell>
                      <TableCell><Chip label={s.level || "—"} size="small" sx={{ bgcolor: `${lc.color}15`, color: lc.color, fontWeight: 700, textTransform: "capitalize" }} /></TableCell>
                      <TableCell>{emp ? `${emp.first_name} ${emp.last_name}` : "—"}</TableCell>
                      <TableCell><Typography variant="caption" color="text.secondary">{new Date(s.created_at).toLocaleDateString("es-CO")}</Typography></TableCell>
                      <TableCell align="right">
                        <Tooltip title="Editar"><IconButton size="small" onClick={() => openEdit(s)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => setDelSkill(s)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table></TableContainer>
          </Card>
        </Box>
      )}

      {/* ════════════ TAB 2: COLABORADORES ════════════ */}
      {mainTab === 2 && (
        <Box>
          <Typography variant="h5" fontWeight={800} mb={3}>Habilidades por Colaborador</Typography>
          <Grid container spacing={2}>
            {employees.map((emp) => {
              const empSkills = skillsByEmp(emp.id);
              const avg = empSkills.length ? (empSkills.reduce((s, sk) => s + (levelConf[sk.level || ""]?.score || 0), 0) / empSkills.length).toFixed(1) : "0";
              return (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={emp.id}>
                  <Card sx={{ border: "1px solid", borderColor: "divider", cursor: "pointer", "&:hover": { borderColor: brand.purple } }}
                    onClick={() => { setProfileEmp(emp); setView("profile"); }}>
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={2} mb={2}>
                        <Avatar sx={{ bgcolor: `${brand.purple}15`, color: brand.purple }}>{emp.first_name[0]}{emp.last_name[0]}</Avatar>
                        <Box>
                          <Typography fontWeight={700}>{emp.first_name} {emp.last_name}</Typography>
                          <Typography variant="body2" color="text.secondary">{emp.position} · {emp.department}</Typography>
                        </Box>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">{empSkills.length} habilidades</Typography>
                        <Typography variant="body2" fontWeight={700} color={brand.purple}>Promedio: {avg}</Typography>
                      </Box>
                      {empSkills.length > 0 && (
                        <Box display="flex" gap={.5} mt={1} flexWrap="wrap">
                          {empSkills.slice(0, 4).map((s) => (
                            <Chip key={s.id} label={s.name} size="small" sx={{ fontSize: 10, height: 20 }} />
                          ))}
                          {empSkills.length > 4 && <Chip label={`+${empSkills.length - 4}`} size="small" sx={{ fontSize: 10, height: 20 }} />}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
            {!employees.length && <Grid size={12}><Typography color="text.secondary" textAlign="center" py={4}>No hay colaboradores</Typography></Grid>}
          </Grid>
        </Box>
      )}

      {/* ════════════ TAB 3: REPORTES ════════════ */}
      {mainTab === 3 && (
        <Box>
          <Typography variant="h5" fontWeight={800} mb={3}>Reportes de Habilidades</Typography>
          <Grid container spacing={2}>
            {[
              { title: "Mapa de habilidades del equipo", desc: "Visión general de competencias por categoría" },
              { title: "Habilidades por colaborador", desc: "Detalle individual de cada miembro del equipo" },
              { title: "Brechas de habilidades", desc: "Identificación de áreas con déficit de talento" },
              { title: "Evolución del talento", desc: "Progreso de habilidades en el tiempo" },
            ].map((r) => (
              <Grid size={{ xs: 12, sm: 6 }} key={r.title}>
                <Card sx={{ border: "1px solid", borderColor: "divider", "&:hover": { borderColor: brand.purple }, cursor: "pointer" }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={700} mb={.5}>{r.title}</Typography>
                    <Typography variant="body2" color="text.secondary" mb={2}>{r.desc}</Typography>
                    <Box display="flex" gap={1}>
                      <Chip label="PDF" size="small" icon={<DownloadIcon sx={{ fontSize: 14 }} />} sx={{ fontWeight: 600 }} />
                      <Chip label="Excel" size="small" icon={<DownloadIcon sx={{ fontSize: 14 }} />} sx={{ fontWeight: 600 }} />
                      <Chip label="CSV" size="small" icon={<DownloadIcon sx={{ fontSize: 14 }} />} sx={{ fontWeight: 600 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Dialog eliminar */}
      <Dialog open={Boolean(delSkill)} onClose={() => setDelSkill(null)} TransitionProps={{ onExited }} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>¿Eliminar habilidad?</DialogTitle>
        <DialogContent><Typography variant="body2" color="text.secondary">Se eliminará <strong>{delSkill?.name}</strong> de forma permanente.</Typography></DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDelSkill(null)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDelete} sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
