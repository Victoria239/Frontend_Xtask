/* Bóveda — red neuronal de conocimiento con PROFUNDIDAD (futurista).
 *
 * Grafo de fuerzas de los documentos del corpus RAG, renderizado como una red
 * neuronal 3D-ish: fondo espacial, nodos con bloom aditivo, profundidad por
 * eje Z (parallax con el cursor), pulsos de datos con estela y estrellas de
 * fondo. Sprites de glow pre-renderizados para rendimiento. Mantiene toda la
 * funcionalidad: búsqueda semántica, lista, clic→detalle, exportar.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Stack, Typography, IconButton, Tooltip, CircularProgress, InputBase, Button } from "@mui/material";
import * as ragApi from "../../api/rag";
import type { RagDocument, SearchHit } from "../../api/rag";

/* ── paleta oscura futurista ── */
const T = {
  bg: "#070A12", panel: "#0B0F1C", glass: "rgba(13,18,33,0.72)",
  line: "#1B2236", line2: "#2A3350",
  ink: "#EAF2FF", ink2: "#C7D3E6", text2: "#93A2BD", text3: "#68768F", text4: "#47536B",
  accent: "#22D3EE", accent2: "#01E3D5",
  mono: "'JetBrains Mono', ui-monospace, monospace",
};

const TYPE_META: Record<string, { color: string; rgb: [number, number, number]; label: string }> = {
  vault:  { color: "#22D3EE", rgb: [34, 211, 238], label: "Bóveda" },
  policy: { color: "#34E5B7", rgb: [52, 229, 183], label: "Política" },
  upload: { color: "#F2B84B", rgb: [242, 184, 75], label: "Subido" },
  raw:    { color: "#8A93A8", rgb: [138, 147, 168], label: "Texto" },
  db:     { color: "#A78BFA", rgb: [167, 139, 250], label: "Datos" },
};
const typeMeta = (t: string) => TYPE_META[t] ?? { color: "#8A93A8", rgb: [138, 147, 168] as [number, number, number], label: t };

const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}\u{FE0F}\u{200D}]/gu;
const cleanTitle = (t: string) => t.replace(EMOJI_RE, "").replace(/\s+/g, " ").trim() || t;

const fmtDate = (iso?: string) => { try { return iso ? new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }) : "—"; } catch { return "—"; } };
const download = (name: string, content: string, mime: string) => {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
const csvCell = (v: unknown) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

/* markdown → bloques legibles (oscuro) */
const inlineFmt = (t: string) => t.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
  p.startsWith("**") && p.endsWith("**") ? <strong key={i} style={{ color: T.ink, fontWeight: 700 }}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>);
function renderMarkdown(raw: string): ReactNode[] {
  let text = raw.replace(EMOJI_RE, "");
  text = text.replace(/```[\s\S]*?```/g, "").replace(/`([^`]+)`/g, "$1")
    .replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  const out: ReactNode[] = []; let list: string[] = []; let key = 0, skippedH1 = false;
  const flush = () => { if (!list.length) return; const items = list; list = [];
    out.push(<Box key={`l${key++}`} component="ul" sx={{ m: "2px 0 12px", p: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "6px" }}>
      {items.map((it, i) => (<Box key={i} component="li" sx={{ display: "flex", gap: 1, fontSize: 13, color: T.ink2, lineHeight: 1.5 }}>
        <Box sx={{ mt: "7px", width: 4, height: 4, borderRadius: "50%", bgcolor: T.accent, flexShrink: 0, boxShadow: `0 0 6px ${T.accent}` }} /><span>{inlineFmt(it)}</span></Box>))}
    </Box>); };
  for (const ln of text.split(/\r?\n/)) {
    const t = ln.trim(); if (!t) { flush(); continue; }
    if (/^(?:```|TABLE\b|FROM\b|WHERE\b|SORT\b|LIMIT\b|FLATTEN\b|GROUP BY\b|---+$|\|)/i.test(t)) continue;
    const h = t.match(/^(#{1,6})\s+(.*)$/);
    if (h) { flush(); if (h[1].length === 1 && !skippedH1) { skippedH1 = true; continue; }
      out.push(<Typography key={`h${key++}`} sx={{ mt: 1.75, mb: 0.5, fontWeight: 700, fontSize: h[1].length <= 2 ? 13.5 : 12.5, color: T.ink }}>{h[2]}</Typography>); continue; }
    if (/^[-*+]\s+/.test(t)) { list.push(t.replace(/^[-*+]\s+/, "")); continue; }
    if (/^\d+[.)]\s+/.test(t)) { list.push(t.replace(/^\d+[.)]\s+/, "")); continue; }
    flush(); out.push(<Typography key={`p${key++}`} sx={{ mb: 1, fontSize: 13, color: T.ink2, lineHeight: 1.6 }}>{inlineFmt(t)}</Typography>);
  }
  flush(); return out;
}

interface Node { x: number; y: number; vx: number; vy: number; z: number; zp: number; doc: RagDocument; }
interface Edge { a: number; b: number; }

/* sprite de glow pre-renderizado por color (bloom rápido) */
const glowCache: Record<string, HTMLCanvasElement> = {};
function glowSprite(rgb: [number, number, number]): HTMLCanvasElement {
  const key = rgb.join(",");
  if (glowCache[key]) return glowCache[key];
  const s = document.createElement("canvas"); s.width = s.height = 64;
  const g = s.getContext("2d")!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  const [r, gr, b] = rgb;
  grd.addColorStop(0, `rgba(${r},${gr},${b},0.9)`);
  grd.addColorStop(0.25, `rgba(${r},${gr},${b},0.35)`);
  grd.addColorStop(1, `rgba(${r},${gr},${b},0)`);
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  glowCache[key] = s; return s;
}

export default function VaultPage() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<RagDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef<number | null>(null);
  const selRef = useRef<number | null>(null);
  const queryRef = useRef("");
  const hlRef = useRef<Set<number> | null>(null);
  useEffect(() => { selRef.current = selectedId; }, [selectedId]);
  useEffect(() => { queryRef.current = results ? "" : query.toLowerCase().trim(); }, [query, results]);
  useEffect(() => { hlRef.current = results ? new Set(results.map((h) => h.document_id)) : null; }, [results]);

  const selectedDoc = useMemo(() => docs.find((d) => d.id === selectedId) ?? null, [docs, selectedId]);

  useEffect(() => { let alive = true; setLoading(true); setError(false);
    ragApi.list().then((d) => { if (alive) { setDocs(d); setLoading(false); } }).catch(() => { if (alive) { setError(true); setLoading(false); } });
    return () => { alive = false; }; }, [reloadKey]);

  useEffect(() => {
    if (selectedId == null) { setPreview(null); return; }
    const doc = docs.find((d) => d.id === selectedId); if (!doc) return;
    let alive = true; setPreviewLoading(true); setPreview(null);
    ragApi.search(cleanTitle(doc.title), 6).then((res) => { if (!alive) return;
      const hit = res.hits.find((h) => h.document_id === selectedId) ?? res.hits[0]; setPreview(hit?.content ?? null);
    }).catch(() => alive && setPreview(null)).finally(() => alive && setPreviewLoading(false));
    return () => { alive = false; };
  }, [selectedId, docs]);

  const filtered = useMemo(() => { const q = query.toLowerCase().trim(); if (!q) return docs;
    return docs.filter((d) => cleanTitle(d.title).toLowerCase().includes(q) || d.source_type.includes(q)); }, [docs, query]);
  const grouped = useMemo(() => { const g: Record<string, RagDocument[]> = {};
    for (const d of filtered) (g[d.source_type] ??= []).push(d); return Object.entries(g).sort((a, b) => b[1].length - a[1].length); }, [filtered]);
  const embeddedCount = useMemo(() => docs.filter((d) => d.status === "embedded").length, [docs]);

  const runSearch = async () => { const q = query.trim(); if (!q) { setResults(null); return; }
    setSearching(true); try { const res = await ragApi.search(q, 12); setResults(res.hits); } catch { setResults([]); } finally { setSearching(false); } };
  const clearSearch = () => { setResults(null); setQuery(""); };
  const exportCorpus = () => { const header = "id,titulo,tipo,estado,idioma,creado";
    const rows = docs.map((d) => [d.id, cleanTitle(d.title), d.source_type, d.status, d.language, d.created_at].map(csvCell).join(","));
    download("boveda-corpus.csv", [header, ...rows].join("\n"), "text/csv"); };
  const exportDoc = () => { if (!selectedDoc) return; const d = selectedDoc;
    const md = `# ${cleanTitle(d.title)}\n\n- Tipo: ${typeMeta(d.source_type).label}\n- Estado: ${d.status}\n- Idioma: ${d.language}\n- Fuente: ${d.source_uri ?? "—"}\n- Creado: ${fmtDate(d.created_at)}\n\n---\n\n${preview ?? "(sin vista previa)"}\n`;
    download(`${cleanTitle(d.title).slice(0, 40).replace(/[^\w\s-]/g, "").trim() || "documento"}.md`, md, "text/markdown"); };

  /* ── grafo neuronal con profundidad ── */
  useEffect(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap || !docs.length) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = 0, H = 0, DPR = 1, raf = 0, REST = 90, t0 = performance.now();
    let nodes: Node[] = [], edges: Edge[] = [];
    let pulses: { e: number; t: number; sp: number }[] = [];
    let stars: { x: number; y: number; z: number; tw: number }[] = [];
    // parallax: objetivo (mouse) y actual (suavizado)
    let mx = 0, my = 0, px = 0, py = 0;
    const PARALLAX = 26;

    const build = () => {
      DPR = Math.min(2, window.devicePixelRatio || 1);
      W = wrap.clientWidth; H = wrap.clientHeight;
      canvas.width = W * DPR; canvas.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      REST = Math.max(46, Math.min(104, Math.sqrt((W * H) / docs.length)));
      nodes = docs.map((doc, i) => {
        const ang = i * 2.399963, rad = Math.min(W, H) * 0.42 * Math.sqrt((i + 1) / docs.length);
        return { x: W / 2 + Math.cos(ang) * rad, y: H / 2 + Math.sin(ang) * rad, vx: 0, vy: 0,
          z: 0.12 + Math.random() * 0.88, zp: Math.random() * 6.283, doc };
      });
      const K = 3; const seen = new Set<string>(); edges = [];
      for (let i = 0; i < nodes.length; i++) {
        const ds: { j: number; d: number }[] = [];
        for (let j = 0; j < nodes.length; j++) { if (i === j) continue; const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y; ds.push({ j, d: dx * dx + dy * dy }); }
        ds.sort((p, q) => p.d - q.d);
        for (let k = 0; k < K && k < ds.length; k++) { const a = Math.min(i, ds[k].j), b = Math.max(i, ds[k].j), key = a + "-" + b; if (!seen.has(key)) { seen.add(key); edges.push({ a, b }); } }
      }
      pulses = [];
      stars = Array.from({ length: Math.round((W * H) / 5200) }, () => ({ x: Math.random() * W, y: Math.random() * H, z: Math.random(), tw: Math.random() * 6.283 }));
    };

    const step = () => {
      const n = nodes.length; const fx = new Float64Array(n), fy = new Float64Array(n); const CUT2 = 240 * 240;
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y, d2 = dx * dx + dy * dy;
        if (d2 > CUT2) continue; const d = Math.sqrt(d2) || 0.01, f = 1400 / (d2 + 40), ux = dx / d, uy = dy / d;
        fx[i] += ux * f; fy[i] += uy * f; fx[j] -= ux * f; fy[j] -= uy * f;
      }
      for (const e of edges) { const a = nodes[e.a], b = nodes[e.b], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01, f = (d - REST) * 0.02, ux = dx / d, uy = dy / d;
        fx[e.a] += ux * f; fy[e.a] += uy * f; fx[e.b] -= ux * f; fy[e.b] -= uy * f; }
      for (let i = 0; i < n; i++) {
        fx[i] += (W / 2 - nodes[i].x) * 0.0012 + (Math.random() - 0.5) * 0.1;
        fy[i] += (H / 2 - nodes[i].y) * 0.0012 + (Math.random() - 0.5) * 0.1;
        nodes[i].vx = (nodes[i].vx + fx[i]) * 0.85; nodes[i].vy = (nodes[i].vy + fy[i]) * 0.85;
        const sp = Math.hypot(nodes[i].vx, nodes[i].vy); if (sp > 2.2) { nodes[i].vx *= 2.2 / sp; nodes[i].vy *= 2.2 / sp; }
        nodes[i].x = Math.max(16, Math.min(W - 16, nodes[i].x + nodes[i].vx));
        nodes[i].y = Math.max(16, Math.min(H - 16, nodes[i].y + nodes[i].vy));
      }
    };

    const isOn = (nd: Node) => { const hl = hlRef.current; if (hl) return hl.has(nd.doc.id);
      const q = queryRef.current; return !q || cleanTitle(nd.doc.title).toLowerCase().includes(q) || nd.doc.source_type.includes(q); };
    // profundidad efectiva (respira) y posición proyectada con parallax
    const zOf = (nd: Node, tt: number) => Math.max(0.06, Math.min(1, nd.z + (reduce ? 0 : 0.12 * Math.sin(tt * 0.0006 + nd.zp))));
    const proj = (nd: Node, z: number) => ({ x: nd.x + px * z, y: nd.y + py * z });

    const draw = () => {
      if (!reduce) step();
      const tt = performance.now() - t0;
      px += (mx * PARALLAX - px) * 0.06; py += (my * PARALLAX - py) * 0.06;
      const sel = selRef.current, hov = hoverRef.current;
      ctx.clearRect(0, 0, W, H);

      // estrellas de fondo
      ctx.globalCompositeOperation = "lighter";
      for (const s of stars) { const a = (0.10 + 0.10 * Math.sin(tt * 0.001 + s.tw)) * s.z;
        ctx.fillStyle = `rgba(120,170,220,${a})`; ctx.fillRect(s.x + px * s.z * 0.4, s.y + py * s.z * 0.4, 1.4, 1.4); }

      // aristas (glow aditivo, alpha por profundidad)
      ctx.lineWidth = 0.9;
      for (const e of edges) {
        const a = nodes[e.a], b = nodes[e.b]; const za = zOf(a, tt), zb = zOf(b, tt);
        const pa = proj(a, za), pb = proj(b, zb); const on = isOn(a) && isOn(b);
        const al = (on ? 0.32 : 0.05) * Math.min(za, zb);
        ctx.strokeStyle = `rgba(34,211,238,${al})`;
        ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
      }

      // pulsos con estela
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i]; p.t += p.sp; const e = edges[p.e];
        if (p.t >= 1 || !e) { pulses.splice(i, 1); continue; }
        const a = nodes[e.a], b = nodes[e.b]; const za = zOf(a, tt), zb = zOf(b, tt);
        const pa = proj(a, za), pb = proj(b, zb);
        const x = pa.x + (pb.x - pa.x) * p.t, y = pa.y + (pb.y - pa.y) * p.t;
        const tx = pa.x + (pb.x - pa.x) * Math.max(0, p.t - 0.12), ty = pa.y + (pb.y - pa.y) * Math.max(0, p.t - 0.12);
        const grd = ctx.createLinearGradient(tx, ty, x, y);
        grd.addColorStop(0, "rgba(120,230,255,0)"); grd.addColorStop(1, "rgba(150,240,255,0.9)");
        ctx.strokeStyle = grd; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, 2.1, 0, 6.283); ctx.fillStyle = "rgba(200,250,255,0.95)"; ctx.fill();
      }
      if (edges.length && !reduce && Math.random() < 0.35) pulses.push({ e: (Math.random() * edges.length) | 0, t: 0, sp: 0.012 + Math.random() * 0.02 });

      // nodos ordenados por profundidad (lejos→cerca) con bloom
      const order = nodes.map((_, i) => i).sort((i, j) => zOf(nodes[i], tt) - zOf(nodes[j], tt));
      for (const i of order) {
        const nd = nodes[i]; const z = zOf(nd, tt); const p = proj(nd, z);
        const on = isOn(nd); const isSel = nd.doc.id === sel, isHov = i === hov;
        const m = typeMeta(nd.doc.source_type);
        const core = (1.4 + z * 3.0) * (isSel || isHov ? 1.8 : 1);
        const glowR = core * (isSel || isHov ? 7 : 4.5);
        ctx.globalAlpha = on ? (0.35 + 0.65 * z) : 0.08;
        const sprite = glowSprite(m.rgb);
        ctx.drawImage(sprite, p.x - glowR, p.y - glowR, glowR * 2, glowR * 2);
        // núcleo nítido
        ctx.globalAlpha = on ? Math.min(1, 0.55 + 0.5 * z) : 0.12;
        ctx.beginPath(); ctx.arc(p.x, p.y, core, 0, 6.283); ctx.fillStyle = "#eafcff"; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, core * 0.62, 0, 6.283); ctx.fillStyle = m.color; ctx.fill();
        if (isSel || isHov) { ctx.globalAlpha = 1; ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.beginPath(); ctx.arc(p.x, p.y, core + 3, 0, 6.283); ctx.stroke(); }
        ctx.globalAlpha = 1;
      }

      // etiqueta (hover/selección)
      ctx.globalCompositeOperation = "source-over";
      ctx.font = "600 12px -apple-system, system-ui, sans-serif";
      for (let i = 0; i < nodes.length; i++) {
        const nd = nodes[i]; if (nd.doc.id !== sel && i !== hov) continue;
        const z = zOf(nd, tt), p = proj(nd, z); const label = cleanTitle(nd.doc.title); const tw = ctx.measureText(label).width;
        const lx = Math.min(Math.max(p.x + 12, 8), W - tw - 18), ly = p.y - 12;
        ctx.fillStyle = "rgba(8,12,22,0.92)"; ctx.strokeStyle = "rgba(34,211,238,0.5)"; ctx.lineWidth = 1;
        if ((ctx as any).roundRect) { ctx.beginPath(); (ctx as any).roundRect(lx - 9, ly - 15, tw + 18, 24, 7); ctx.fill(); ctx.stroke(); }
        else ctx.fillRect(lx - 9, ly - 15, tw + 18, 24);
        ctx.fillStyle = "#EAF2FF"; ctx.fillText(label, lx, ly + 1.5);
      }
      raf = requestAnimationFrame(draw);
    };

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect(); const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
      mx = (cx / W - 0.5) * -2; my = (cy / H - 0.5) * -2;   // parallax objetivo
      const tt = performance.now() - t0; let best = -1, bd = 22 * 22;
      for (let i = 0; i < nodes.length; i++) { const z = zOf(nodes[i], tt), p = proj(nodes[i], z); const dx = p.x - cx, dy = p.y - cy, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } }
      hoverRef.current = best >= 0 ? best : null; canvas.style.cursor = best >= 0 ? "pointer" : "default";
    };
    const onLeave = () => { mx = 0; my = 0; hoverRef.current = null; };
    const onClick = () => { const h = hoverRef.current; if (h != null) setSelectedId(nodes[h].doc.id); };

    build(); draw();
    canvas.addEventListener("mousemove", onMove); canvas.addEventListener("mouseleave", onLeave); canvas.addEventListener("click", onClick);
    let rt: number; const ro = new ResizeObserver(() => { clearTimeout(rt); rt = window.setTimeout(() => { cancelAnimationFrame(raf); build(); draw(); }, 120); });
    ro.observe(wrap);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); clearTimeout(rt);
      canvas.removeEventListener("mousemove", onMove); canvas.removeEventListener("mouseleave", onLeave); canvas.removeEventListener("click", onClick); };
  }, [docs]);

  const chip = (active: boolean) => ({ display: "flex", alignItems: "center", gap: 1, px: "8px", py: "7px", borderRadius: "7px", cursor: "pointer",
    bgcolor: active ? "rgba(34,211,238,0.10)" : "transparent", "&:hover": { bgcolor: active ? "rgba(34,211,238,0.12)" : "rgba(255,255,255,0.04)" } });

  return (
    <Box sx={{ position: "fixed", top: 0, left: "var(--sidebar-w, 240px)", right: 0, bottom: 0, zIndex: 1200,
      bgcolor: T.bg, display: "flex", flexDirection: "column", transition: "left 240ms cubic-bezier(0.23, 1, 0.32, 1)" }}>
      {/* Toolbar */}
      <Stack direction="row" alignItems="center" gap={1.5} sx={{ px: "22px", py: "12px", borderBottom: `1px solid ${T.line}`, bgcolor: T.panel, flexShrink: 0 }}>
        <Box sx={{ width: 30, height: 30, borderRadius: "8px", bgcolor: "rgba(34,211,238,0.12)", display: "grid", placeItems: "center", boxShadow: "0 0 16px rgba(34,211,238,0.25)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="2">
            <circle cx="12" cy="12" r="3" /><circle cx="4" cy="4" r="2" /><circle cx="20" cy="4" r="2" /><circle cx="4" cy="20" r="2" /><circle cx="20" cy="20" r="2" />
            <line x1="6" y1="6" x2="10" y2="10" /><line x1="18" y1="6" x2="14" y2="10" /><line x1="6" y1="18" x2="10" y2="14" /><line x1="18" y1="18" x2="14" y2="14" /></svg>
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 15, color: T.ink, lineHeight: 1.1 }}>Bóveda de conocimiento</Typography>
          <Typography sx={{ fontFamily: T.mono, fontSize: 11, color: T.text3 }}>Red neuronal · {docs.length} documentos · {embeddedCount} embebidos</Typography>
        </Box>
        <Button onClick={exportCorpus} size="small" startIcon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>}
          sx={{ textTransform: "none", fontWeight: 600, fontSize: 12.5, color: T.ink2, borderRadius: "8px", border: `1px solid ${T.line2}`, px: 1.5 }}>Exportar CSV</Button>
        <Tooltip title="Actualizar"><IconButton size="small" onClick={() => setReloadKey((k) => k + 1)} sx={{ color: T.text2 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></svg>
        </IconButton></Tooltip>
      </Stack>

      <Box sx={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Panel izquierdo */}
        <Box sx={{ width: 300, flexShrink: 0, borderRight: `1px solid ${T.line}`, display: "flex", flexDirection: "column", bgcolor: T.panel }}>
          <Box sx={{ p: "12px 14px", borderBottom: `1px solid ${T.line}` }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, bgcolor: T.bg, border: `1px solid ${results ? T.accent : T.line2}`, borderRadius: "8px", px: 1.25, py: 0.75 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="2"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <InputBase value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") runSearch(); if (e.key === "Escape") clearSearch(); }}
                placeholder="Buscar o preguntar…  ⏎" sx={{ fontSize: 13, color: T.ink, flex: 1, "& input::placeholder": { color: T.text4, opacity: 1 } }} />
              {(results || query) && <Box component="button" onClick={clearSearch} sx={{ border: "none", background: "transparent", cursor: "pointer", color: T.text3, display: "grid", placeItems: "center", p: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></Box>}
            </Box>
            <Typography sx={{ mt: 0.75, fontFamily: T.mono, fontSize: 9.5, color: T.text4 }}>{results ? "Búsqueda semántica" : "Enter para búsqueda semántica"}</Typography>
          </Box>
          <Box sx={{ flex: 1, overflowY: "auto", p: "8px 8px 16px" }}>
            {loading && <Stack alignItems="center" sx={{ pt: 6 }}><CircularProgress size={22} sx={{ color: T.accent }} /></Stack>}
            {error && <Typography sx={{ p: 2, fontSize: 12.5, color: T.text3 }}>No se pudo cargar el corpus.</Typography>}
            {!loading && results && (<>
              <Typography sx={{ fontFamily: T.mono, fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: T.text3, px: "8px", py: "6px" }}>{searching ? "Buscando…" : `${results.length} resultados`}</Typography>
              {results.map((h, idx) => (<Box key={`${h.document_id}-${idx}`} onClick={() => setSelectedId(h.document_id)}
                sx={{ px: "10px", py: "9px", mb: 0.5, borderRadius: "9px", cursor: "pointer", border: `1px solid ${h.document_id === selectedId ? T.accent : T.line}`, bgcolor: h.document_id === selectedId ? "rgba(34,211,238,0.06)" : T.bg, "&:hover": { borderColor: T.line2 } }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: typeMeta(h.source_type).color, flexShrink: 0 }} />
                  <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: T.ink, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cleanTitle(h.document_title)}</Typography>
                  <Typography sx={{ fontFamily: T.mono, fontSize: 10, color: T.accent2 }}>{(h.score * 100).toFixed(0)}%</Typography></Box>
                <Typography sx={{ mt: 0.5, fontSize: 11.5, color: T.text2, lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{h.content}</Typography></Box>))}
              {!searching && !results.length && <Typography sx={{ p: 2, fontSize: 12.5, color: T.text3, textAlign: "center" }}>Sin coincidencias.</Typography>}
            </>)}
            {!loading && !error && !results && grouped.map(([type, items]) => (<Box key={type} sx={{ mb: 1 }}>
              <Typography sx={{ fontFamily: T.mono, fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: T.text3, px: "8px", py: "6px" }}>{typeMeta(type).label} · {items.length}</Typography>
              {items.map((d) => (<Box key={d.id} onClick={() => setSelectedId(d.id)} sx={chip(d.id === selectedId)}>
                <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: typeMeta(d.source_type).color, flexShrink: 0, boxShadow: `0 0 6px ${typeMeta(d.source_type).color}` }} />
                <Typography sx={{ fontSize: 12.5, color: d.id === selectedId ? T.ink : T.text2, fontWeight: d.id === selectedId ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cleanTitle(d.title)}</Typography></Box>))}
            </Box>))}
            {!loading && !error && !results && !filtered.length && <Typography sx={{ p: 2, fontSize: 12.5, color: T.text3, textAlign: "center" }}>Sin resultados.</Typography>}
          </Box>
        </Box>

        {/* Grafo (espacio profundo) */}
        <Box ref={wrapRef} sx={{ flex: 1, position: "relative", minWidth: 0, overflow: "hidden",
          background: `radial-gradient(120% 120% at 50% 30%, #0E1526 0%, #090D18 55%, #05070E 100%)` }}>
          <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
          {/* viñeta */}
          <Box sx={{ position: "absolute", inset: 0, pointerEvents: "none", boxShadow: "inset 0 0 180px 40px rgba(0,0,0,0.55)" }} />
          {loading && (<Stack alignItems="center" justifyContent="center" sx={{ position: "absolute", inset: 0 }}>
            <CircularProgress size={24} sx={{ color: T.accent }} /><Typography sx={{ mt: 1.5, fontSize: 12.5, color: T.text2 }}>Cargando red neuronal…</Typography></Stack>)}
          {!loading && !error && (<Stack direction="row" gap={1} sx={{ position: "absolute", bottom: 14, left: 14, flexWrap: "wrap" }}>
            {[...new Set(docs.map((d) => d.source_type))].map((type) => (<Box key={type} sx={{ display: "flex", alignItems: "center", gap: 0.75, bgcolor: T.glass, border: `1px solid ${T.line2}`, borderRadius: "7px", px: 1, py: 0.5, backdropFilter: "blur(6px)" }}>
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: typeMeta(type).color, boxShadow: `0 0 8px ${typeMeta(type).color}` }} />
              <Typography sx={{ fontFamily: T.mono, fontSize: 10, color: T.text2 }}>{typeMeta(type).label}</Typography></Box>))}
          </Stack>)}
        </Box>

        {/* Panel de detalle */}
        {selectedDoc && (<Box sx={{ width: 340, flexShrink: 0, borderLeft: `1px solid ${T.line}`, display: "flex", flexDirection: "column", bgcolor: T.panel }}>
          <Box sx={{ p: "16px 18px", borderBottom: `1px solid ${T.line}` }}>
            <Stack direction="row" alignItems="flex-start" gap={1}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, px: 1, py: 0.35, borderRadius: "6px", bgcolor: `${typeMeta(selectedDoc.source_type).color}22`, mb: 1 }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: typeMeta(selectedDoc.source_type).color }} />
                  <Typography sx={{ fontFamily: T.mono, fontSize: 10, color: typeMeta(selectedDoc.source_type).color, fontWeight: 600 }}>{typeMeta(selectedDoc.source_type).label}</Typography></Box>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: T.ink, lineHeight: 1.25 }}>{cleanTitle(selectedDoc.title)}</Typography></Box>
              <IconButton size="small" onClick={() => setSelectedId(null)} sx={{ color: T.text3, mt: -0.5 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></IconButton>
            </Stack>
            <Stack direction="row" gap={2.5} sx={{ mt: 1.5 }}>
              <Box><Typography sx={{ fontFamily: T.mono, fontSize: 9, color: T.text4, textTransform: "uppercase" }}>Estado</Typography><Typography sx={{ fontSize: 12.5, color: selectedDoc.status === "embedded" ? T.accent2 : T.text2, fontWeight: 600 }}>{selectedDoc.status === "embedded" ? "Indexado" : selectedDoc.status}</Typography></Box>
              <Box><Typography sx={{ fontFamily: T.mono, fontSize: 9, color: T.text4, textTransform: "uppercase" }}>Idioma</Typography><Typography sx={{ fontSize: 12.5, color: T.text2, fontWeight: 600 }}>{selectedDoc.language?.toUpperCase() || "—"}</Typography></Box>
              <Box><Typography sx={{ fontFamily: T.mono, fontSize: 9, color: T.text4, textTransform: "uppercase" }}>Creado</Typography><Typography sx={{ fontSize: 12.5, color: T.text2, fontWeight: 600 }}>{fmtDate(selectedDoc.created_at)}</Typography></Box>
            </Stack>
          </Box>
          <Box sx={{ flex: 1, overflowY: "auto", p: "16px 18px" }}>
            <Typography sx={{ fontFamily: T.mono, fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: T.text3, mb: 1 }}>Vista previa</Typography>
            {previewLoading && <Stack alignItems="center" sx={{ py: 3 }}><CircularProgress size={18} sx={{ color: T.accent }} /></Stack>}
            {!previewLoading && (preview ? <Box>{renderMarkdown(preview)}</Box> : <Typography sx={{ fontSize: 13, color: T.text3 }}>Sin vista previa disponible.</Typography>)}
            {selectedDoc.source_uri && <Typography sx={{ mt: 2.5, pt: 1.5, borderTop: `1px solid ${T.line}`, fontFamily: T.mono, fontSize: 10.5, color: T.text3, wordBreak: "break-all" }}>Fuente · {cleanTitle(selectedDoc.source_uri)}</Typography>}
          </Box>
          <Stack direction="row" gap={1} sx={{ p: "12px 18px", borderTop: `1px solid ${T.line}` }}>
            <Button onClick={exportDoc} size="small" fullWidth sx={{ textTransform: "none", fontWeight: 600, fontSize: 12.5, color: T.ink2, border: `1px solid ${T.line2}`, borderRadius: "8px" }}>Exportar</Button>
            <Button onClick={() => navigate("/asistente")} size="small" fullWidth sx={{ textTransform: "none", fontWeight: 600, fontSize: 12.5, color: "#04121a", bgcolor: T.accent, borderRadius: "8px", "&:hover": { bgcolor: "#22c9e0" } }}>Preguntar al asistente</Button>
          </Stack>
        </Box>)}
      </Box>
    </Box>
  );
}
