/* Documentos · Corpus RAG (AI-02)
 *
 * Lista los documentos del tenant + drag-drop upload + ingesta de texto crudo.
 * Estado del documento: pending | embedded | failed → semáforo en la fila.
 */

import { useEffect, useRef, useState } from "react";
import {
  Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, Stack, TextField, Tooltip, Typography, Alert,
} from "@mui/material";
import { ragApi } from "../../api";
import type { RagDocument } from "../../api/rag";
import { notify } from "../../hooks/useToast";

/* ─── Tokens locales aligned con MUI light theme ─────────── */
const T = {
  bg: "#FFFFFF",
  bg2: "#F7F7F9",
  rule: "#E5E5EA",
  rule2: "#D1D1D6",
  ink: "#1A1726",
  text2: "#605C70",
  text3: "#8E8A99",
  accent: "#02BDEA",
  accent2: "#01E3D5",
  green: "#01B89E",
  amber: "#E08A0E",
  red: "#D14040",
  mono: "'JetBrains Mono', monospace",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Procesando",
  embedded: "Indexado",
  failed: "Falló",
};
const STATUS_COLOR: Record<string, string> = {
  pending: T.amber,
  embedded: T.green,
  failed: T.red,
};

export default function DocumentsPage() {
  const [docs, setDocs] = useState<RagDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const [textDialog, setTextDialog] = useState(false);
  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");
    const fileInput = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await ragApi.list();
      setDocs(data);
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "No se pudieron cargar los documentos" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (!arr.length) return;
    setUploading(true);
    let ok = 0;
    let fail = 0;
    for (const f of arr) {
      try {
        await ragApi.ingestFile(f);
        ok++;
      } catch {
        fail++;
      }
    }
    setUploading(false);
    if (ok) notify({ kind: "success", msg: `${ok} archivo${ok > 1 ? "s" : ""} subido${ok > 1 ? "s" : ""}` });
    if (fail) notify({ kind: "error", msg: `${fail} archivo${fail > 1 ? "s" : ""} con error — verificá rol y formato (texto plano)` });
    load();
  };

  const handleIngestText = async () => {
    if (!textTitle.trim() || !textContent.trim()) {
      notify({ kind: "error", msg: "Título y contenido son obligatorios" });
      return;
    }
    setUploading(true);
    try {
      await ragApi.ingestText({ title: textTitle, content: textContent });
      notify({ kind: "success", msg: "Texto ingerido correctamente" });
      setTextDialog(false);
      setTextTitle("");
      setTextContent("");
      load();
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "No se pudo ingerir" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`¿Eliminar "${title}" del corpus? Esto borra todos sus embeddings.`)) return;
    try {
      await ragApi.remove(id);
      notify({ kind: "success", msg: "Documento eliminado" });
      load();
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "No se pudo eliminar (rol manager requerido)" });
    }
  };

  /* Stats derivadas para el strip superior */
  const stats = (() => {
    const total = docs.length;
    const embedded = docs.filter(d => d.status === "embedded").length;
    const pending = docs.filter(d => d.status === "pending").length;
    const failed = docs.filter(d => d.status === "failed").length;
    return { total, embedded, pending, failed };
  })();

  return (
    <Box sx={{ px: { xs: "16px", md: "32px" }, pb: "32px", maxWidth: 1280, mx: "auto", color: T.ink }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 2, pb: "20px", mb: "24px", borderBottom: `1px solid ${T.rule}` }}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ letterSpacing: "-0.025em", color: T.ink, mb: 0.5 }}>
            Documentos
          </Typography>
          <Typography variant="body2" sx={{ color: T.text2 }}>
            Corpus de tu tenant. Cada documento se chunkea y embebe en pgvector para que el copiloto pueda citarlo.
          </Typography>
        </Box>
        <Stack direction="row" gap={1}>
          <Button
            variant="outlined"
            onClick={() => setTextDialog(true)}
            sx={{ borderColor: T.rule2, color: T.ink, "&:hover": { borderColor: T.text3, bgcolor: T.bg2 } }}
            startIcon={<TextIcon />}
          >
            Ingresar texto
          </Button>
          <Button
            variant="contained"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            sx={{ bgcolor: T.accent, color: "#FFFFFF", "&:hover": { bgcolor: "#0496BA" } }}
            startIcon={uploading ? <CircularProgress size={14} sx={{ color: "#FFFFFF" }} /> : <UploadIcon />}
          >
            {uploading ? "Subiendo…" : "Subir archivo"}
          </Button>
          <input
            ref={fileInput}
            type="file"
            multiple
            accept=".txt,.md,.csv,.json,.html,.xml,.log"
            style={{ display: "none" }}
            onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ""; }}
          />
        </Stack>
      </Box>

      {/* Stats strip */}
      <Box sx={{
        display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
        gap: 0, mb: "28px",
        border: `1px solid ${T.rule}`, borderRadius: 2, overflow: "hidden", bgcolor: T.bg,
      }}>
        <StatTile label="Total documentos" value={loading ? "—" : stats.total.toString()} sub="en el corpus" />
        <StatTile label="Indexados" value={loading ? "—" : stats.embedded.toString()} sub="listos para citar" color={T.green} />
        <StatTile label="Procesando" value={loading ? "—" : stats.pending.toString()} sub="en ingestión" color={stats.pending > 0 ? T.amber : T.text3} />
        <StatTile label="Con error" value={loading ? "—" : stats.failed.toString()} sub="reintentar o eliminar" color={stats.failed > 0 ? T.red : T.text3} />
      </Box>

      {/* Drop zone */}
      <Box
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
        sx={{
          border: `2px dashed ${drag ? T.accent : T.rule2}`,
          bgcolor: drag ? "rgba(2,189,234,0.04)" : T.bg2,
          borderRadius: 2,
          padding: "32px",
          textAlign: "center",
          mb: "28px",
          transition: "border-color 160ms, background 160ms",
        }}
      >
        <Box sx={{ color: drag ? T.accent : T.text3, mb: 1 }}>
          <UploadIcon size={32} />
        </Box>
        <Typography variant="body1" sx={{ color: T.ink, fontWeight: 500, mb: 0.5 }}>
          Arrastrá archivos acá
        </Typography>
        <Typography variant="caption" sx={{ color: T.text3 }}>
          .txt, .md, .csv, .json — máximo ~10 MB · UTF-8
        </Typography>
      </Box>

      {/* Lista de documentos */}
      <Card sx={{ border: `1px solid ${T.rule}`, boxShadow: "none", borderRadius: 2 }}>
        <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 60px", gap: 2, p: "14px 20px", borderBottom: `1px solid ${T.rule}`, bgcolor: T.bg2 }}>
            <Header>Título</Header>
            <Header>Tipo</Header>
            <Header>Estado</Header>
            <Box />
          </Box>

          {loading ? (
            <Box sx={{ p: "48px", textAlign: "center" }}>
              <CircularProgress size={24} sx={{ color: T.accent }} />
            </Box>
          ) : docs.length === 0 ? (
            <Box sx={{ p: "64px 32px", textAlign: "center" }}>
              <Typography variant="body1" sx={{ color: T.ink, fontWeight: 500, mb: 0.5 }}>
                No hay documentos
              </Typography>
              <Typography variant="caption" sx={{ color: T.text3 }}>
                Subí el primer archivo o ingresá texto para empezar el corpus
              </Typography>
            </Box>
          ) : (
            docs.map((d, idx) => (
              <Box
                key={d.id}
                sx={{
                  display: "grid", gridTemplateColumns: "1fr 120px 120px 60px", gap: 2,
                  p: "14px 20px",
                  borderBottom: idx === docs.length - 1 ? "none" : `1px solid ${T.rule}`,
                  alignItems: "center",
                  transition: "background 120ms",
                  "&:hover": { bgcolor: T.bg2 },
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ color: T.ink, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {d.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: T.text3, fontFamily: T.mono, fontSize: 10.5 }}>
                    {new Date(d.created_at).toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
                    {d.source_uri ? ` · ${d.source_uri}` : ""}
                  </Typography>
                </Box>
                <Box>
                  <Chip
                    label={d.source_type}
                    size="small"
                    sx={{ fontSize: 11, height: 22, bgcolor: T.bg2, color: T.text2, fontFamily: T.mono }}
                  />
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: STATUS_COLOR[d.status] || T.text3 }} />
                  <Typography variant="caption" sx={{ color: T.text2, fontSize: 12 }}>
                    {STATUS_LABEL[d.status] || d.status}
                  </Typography>
                </Box>
                <Tooltip title="Eliminar" placement="left">
                  <IconButton size="small" onClick={() => handleDelete(d.id, d.title)} sx={{ color: T.text3, "&:hover": { color: T.red } }}>
                    <TrashIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            ))
          )}
        </CardContent>
      </Card>

      {/* Dialog texto crudo */}
      <Dialog open={textDialog} onClose={() => setTextDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, color: T.ink }}>Ingresar texto crudo al corpus</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ pt: 1 }}>
            <TextField
              label="Título del documento"
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label="Contenido"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              fullWidth
              multiline
              minRows={8}
              maxRows={20}
              placeholder="Pegá acá el texto a indexar. Se chunkeará en fragmentos de ~350 tokens con overlap 50."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTextDialog(false)}>Cancelar</Button>
          <Button onClick={handleIngestText} variant="contained" disabled={uploading} sx={{ bgcolor: T.accent, "&:hover": { bgcolor: "#0496BA" } }}>
            {uploading ? "Ingiriendo…" : "Ingerir"}
          </Button>
        </DialogActions>
      </Dialog>
</Box>
  );
}

/* ─── Sub-components ─────────────────────────────────────── */

function Header({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="caption" sx={{ color: T.text3, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 11 }}>
      {children}
    </Typography>
  );
}

function StatTile({ label, value, sub, color }: { label: string; value: string; sub: string; color?: string }) {
  return (
    <Box sx={{
      padding: "20px 24px",
      borderRight: `1px solid ${T.rule}`,
      "&:last-child": { borderRight: "none" },
      "@media (max-width: 600px)": {
        "&:nth-of-type(2)": { borderRight: "none" },
        "&:nth-of-type(1), &:nth-of-type(2)": { borderBottom: `1px solid ${T.rule}` },
      },
    }}>
      <Typography variant="caption" sx={{ color: T.text3, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 10.5 }}>
        {label}
      </Typography>
      <Typography variant="h5" sx={{ color: color || T.ink, fontWeight: 600, mt: 0.5, letterSpacing: "-0.02em" }}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{ color: T.text3, fontSize: 11 }}>
        {sub}
      </Typography>
    </Box>
  );
}

function UploadIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function TextIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}
