/* Organigrama (H-01) · árbol jerárquico interactivo.
 *
 * Estrategia:
 *  - Backend devuelve [OrgNode] con reports[] anidados (los nodos raíz son los
 *    que no tienen manager).
 *  - Calculamos x,y para cada nodo con un layout "tidy tree" simple:
 *      - hijos en nivel y = depth * V_SPACING
 *      - x = centro del subtree
 *  - Renderizamos SVG con:
 *      - lineas curvas parent → child
 *      - cards de empleado como <foreignObject> con HTML
 *      - pan con drag, zoom con scroll
 *  - Click en card → drawer lateral con detalle
 *  - Search filtra resaltando coincidencias
 */

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Box, Chip, CircularProgress, IconButton, TextField, Typography, Drawer, Stack, Tooltip, Alert } from "@mui/material";
import { employeesApi } from "../../api";
import type { OrgNode } from "../../api/employees";
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
  mono: "'JetBrains Mono', monospace",
};

/* Dimensiones del nodo y del layout */
const NODE_W = 220;
const NODE_H = 92;
const H_GAP = 28;        /* gap horizontal entre siblings */
const V_GAP = 70;        /* gap vertical entre niveles */
const PAD = 80;          /* padding alrededor del svg */

interface LaidOutNode {
  id: number;
  full_name: string;
  position: string;
  department: string;
  manager_id: number | null;
  reports: LaidOutNode[];
  x: number;       /* centro horizontal */
  y: number;       /* top */
  width: number;   /* ancho del subtree para el cálculo */
  depth: number;
}

/* Layout tidy-tree clásico: ancho de cada subtree es la suma de sus hijos.
 * Devuelve el nodo con x relativo al subtree y luego se aplica un offset global. */
function layoutNode(node: OrgNode, depth: number, xCursor: number): LaidOutNode {
  if (!node.reports || node.reports.length === 0) {
    return {
      ...node,
      reports: [],
      depth,
      x: xCursor + NODE_W / 2,
      y: depth * (NODE_H + V_GAP),
      width: NODE_W,
    };
  }
  let cursor = xCursor;
  const laidReports: LaidOutNode[] = [];
  for (const r of node.reports) {
    const ln = layoutNode(r, depth + 1, cursor);
    laidReports.push(ln);
    cursor += ln.width + H_GAP;
  }
  /* el cursor final menos el inicial = ancho real del subtree (sin el último gap) */
  const subWidth = cursor - xCursor - H_GAP;
  const firstChildX = laidReports[0].x;
  const lastChildX = laidReports[laidReports.length - 1].x;
  const centerX = (firstChildX + lastChildX) / 2;
  return {
    ...node,
    reports: laidReports,
    depth,
    x: centerX,
    y: depth * (NODE_H + V_GAP),
    width: Math.max(subWidth, NODE_W),
  };
}

/* Aplana el árbol en una lista para renderizar */
function flatten(node: LaidOutNode, out: LaidOutNode[] = []): LaidOutNode[] {
  out.push(node);
  for (const r of node.reports) flatten(r, out);
  return out;
}

export default function OrgChartPage() {
  const [roots, setRoots] = useState<OrgNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(0.9);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<LaidOutNode | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number; px: number; py: number }>({ x: 0, y: 0, px: 0, py: 0 });

  /* Cargar org chart */
  useEffect(() => {
    let cancel = false;
    setLoading(true);
    employeesApi.getOrgChart()
      .then((data) => { if (!cancel) setRoots(data); })
      .catch((e) => {
        const err = e as { response?: { data?: { error?: string } } };
        if (!cancel) notify({ kind: "error", msg: err.response?.data?.error || "No se cargó el organigrama" });
      })
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, []);

  /* Calcula layout completo */
  const { laidRoots, allNodes, viewW, viewH } = useMemo(() => {
    if (roots.length === 0) return { laidRoots: [], allNodes: [], viewW: 0, viewH: 0 };
    let cursor = 0;
    const laid = roots.map((r) => {
      const ln = layoutNode(r, 0, cursor);
      cursor += ln.width + H_GAP * 2;
      return ln;
    });
    const all = laid.flatMap((r) => flatten(r));
    const maxX = Math.max(...all.map((n) => n.x + NODE_W / 2));
    const maxY = Math.max(...all.map((n) => n.y + NODE_H));
    return { laidRoots: laid, allNodes: all, viewW: maxX + PAD * 2, viewH: maxY + PAD * 2 };
  }, [roots]);

  /* ── Pan drag ─────────────────────────── */
  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".org-node")) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
  };
  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return;
    setPan({
      x: dragStart.current.px + (e.clientX - dragStart.current.x),
      y: dragStart.current.py + (e.clientY - dragStart.current.y),
    });
  }, [dragging]);
  const onMouseUp = useCallback(() => setDragging(false), []);
  useEffect(() => {
    if (!dragging) return;
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragging, onMouseMove, onMouseUp]);

  /* ── Wheel zoom ──────────────────────── */
  const onWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const next = Math.max(0.4, Math.min(1.6, zoom + (e.deltaY < 0 ? 0.08 : -0.08)));
    setZoom(next);
  };

  const fitToScreen = () => { setPan({ x: 0, y: 0 }); setZoom(0.9); };

  /* Search highlight */
  const matchIds = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return new Set(
      allNodes
        .filter((n) =>
          n.full_name.toLowerCase().includes(q) ||
          (n.position || "").toLowerCase().includes(q) ||
          (n.department || "").toLowerCase().includes(q)
        )
        .map((n) => n.id)
    );
  }, [search, allNodes]);

  /* Aristas: para cada nodo con hijos, una línea por hijo */
  const edges = useMemo(() => {
    const eds: { from: LaidOutNode; to: LaidOutNode }[] = [];
    for (const n of allNodes) {
      for (const r of n.reports) eds.push({ from: n, to: r });
    }
    return eds;
  }, [allNodes]);

  return (
    <Box sx={{ px: { xs: "16px", md: "32px" }, pb: "32px", maxWidth: 1440, mx: "auto", color: T.ink }}>
      {/* Header */}
      <Box sx={{ pb: "16px", mb: "20px", borderBottom: `1px solid ${T.rule}`, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: "-0.025em", color: T.ink, mb: 0.5 }}>
            Organigrama
          </Typography>
          <Typography variant="body2" sx={{ color: T.text2 }}>
            Estructura jerárquica del tenant · click en cada empleado para detalle
          </Typography>
        </Box>
        <Stack direction="row" gap={1} alignItems="center">
          <TextField
            size="small"
            placeholder="Buscar persona, posición, área…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 260 }}
          />
          <Tooltip title="Ajustar al lienzo">
            <IconButton onClick={fitToScreen} sx={{ color: T.text2, border: `1px solid ${T.rule}`, borderRadius: 1.5 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </IconButton>
          </Tooltip>
          <Tooltip title="Acercar (Cmd/Ctrl + scroll)">
            <IconButton onClick={() => setZoom((z) => Math.min(1.6, z + 0.1))} sx={{ color: T.text2, border: `1px solid ${T.rule}`, borderRadius: 1.5 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
            </IconButton>
          </Tooltip>
          <Tooltip title="Alejar">
            <IconButton onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))} sx={{ color: T.text2, border: `1px solid ${T.rule}`, borderRadius: 1.5 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Canvas */}
      <Box
        ref={containerRef}
        onMouseDown={onMouseDown}
        onWheel={onWheel}
        sx={{
          position: "relative",
          width: "100%",
          height: "calc(100vh - 220px)",
          minHeight: 480,
          border: `1px solid ${T.rule}`,
          borderRadius: 2,
          bgcolor: T.bg2,
          overflow: "hidden",
          cursor: dragging ? "grabbing" : "grab",
          /* Grid background */
          backgroundImage: `radial-gradient(circle at 1px 1px, ${T.rule} 1px, transparent 0)`,
          backgroundSize: "20px 20px",
        }}
      >
        {loading ? (
          <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CircularProgress size={28} sx={{ color: T.accent }} />
          </Box>
        ) : allNodes.length === 0 ? (
          <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
            <Box>
              <Typography variant="body1" sx={{ color: T.ink, fontWeight: 500, mb: 0.5 }}>
                Sin empleados en el organigrama
              </Typography>
              <Typography variant="caption" sx={{ color: T.text3 }}>
                Cargá empleados desde el módulo Empleados y asigná manager_id para construir la jerarquía
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              position: "absolute",
              top: PAD + pan.y,
              left: PAD + pan.x,
              transform: `scale(${zoom})`,
              transformOrigin: "0 0",
              willChange: "transform",
              pointerEvents: dragging ? "none" : "auto",
            }}
          >
            <svg width={viewW} height={viewH} style={{ display: "block" }}>
              {/* Aristas */}
              {edges.map((e) => {
                const x1 = e.from.x;
                const y1 = e.from.y + NODE_H;
                const x2 = e.to.x;
                const y2 = e.to.y;
                const midY = (y1 + y2) / 2;
                /* Curva en S */
                const d = `M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`;
                return (
                  <path
                    key={`${e.from.id}-${e.to.id}`}
                    d={d}
                    fill="none"
                    stroke={T.rule2}
                    strokeWidth="1.5"
                  />
                );
              })}

              {/* Nodos */}
              {allNodes.map((n) => {
                const isMatch = matchIds == null || matchIds.has(n.id);
                const isActive = active?.id === n.id;
                return (
                  <foreignObject key={n.id} x={n.x - NODE_W / 2} y={n.y} width={NODE_W} height={NODE_H}>
                    <Box
                      className="org-node"
                      onClick={() => setActive(n)}
                      sx={{
                        boxSizing: "border-box",
                        width: NODE_W, height: NODE_H,
                        bgcolor: T.bg,
                        border: `1.5px solid ${isActive ? T.accent : isMatch ? T.rule2 : T.rule}`,
                        borderRadius: 2,
                        p: "12px 14px",
                        cursor: "pointer",
                        display: "flex", alignItems: "center", gap: "10px",
                        opacity: isMatch ? 1 : 0.35,
                        boxShadow: isActive ? `0 0 0 4px ${T.accent}22` : "none",
                        transition: "border-color 160ms, opacity 200ms, box-shadow 200ms, transform 120ms",
                        "&:hover": { borderColor: T.accent, transform: "translateY(-1px)" },
                      }}
                    >
                      <Box sx={{
                        width: 36, height: 36, borderRadius: "50%",
                        bgcolor: T.brand, color: "#FFFFFF",
                        display: "grid", placeItems: "center",
                        fontFamily: T.mono, fontSize: 12, fontWeight: 700,
                        flexShrink: 0,
                      }}>
                        {n.full_name.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" sx={{
                          fontWeight: 600, color: T.ink, fontSize: 13.5, lineHeight: 1.2,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {n.full_name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: T.text2, fontSize: 11.5, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {n.position || "Sin posición"}
                        </Typography>
                        <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5, fontFamily: T.mono, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {n.department || "—"} {n.reports.length > 0 && `· ${n.reports.length} report${n.reports.length > 1 ? "s" : ""}`}
                        </Typography>
                      </Box>
                    </Box>
                  </foreignObject>
                );
              })}
            </svg>
          </Box>
        )}

        {/* Zoom level indicator */}
        <Box sx={{
          position: "absolute", bottom: 12, right: 16,
          bgcolor: T.bg, border: `1px solid ${T.rule}`, borderRadius: 1.5,
          px: 1, py: 0.5,
          fontFamily: T.mono, fontSize: 11, color: T.text2,
          pointerEvents: "none",
        }}>
          {Math.round(zoom * 100)}%
        </Box>
      </Box>

      <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, mt: 1, display: "block" }}>
        Arrastrá el lienzo para mover · Cmd/Ctrl + scroll para zoom · click en una persona para ver detalle
      </Typography>

      {/* Drawer detalle */}
      <Drawer anchor="right" open={!!active} onClose={() => setActive(null)}>
        {active && (
          <Box sx={{ width: 340, p: 3, bgcolor: T.bg, color: T.ink, height: "100%" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
              <Box sx={{
                width: 56, height: 56, borderRadius: "50%",
                bgcolor: T.brand, color: "#FFFFFF",
                display: "grid", placeItems: "center",
                fontFamily: T.mono, fontSize: 18, fontWeight: 700,
              }}>
                {active.full_name.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: T.ink, lineHeight: 1.2 }}>
                  {active.full_name}
                </Typography>
                <Typography variant="caption" sx={{ color: T.text2, fontSize: 12 }}>
                  Empleado #{active.id}
                </Typography>
              </Box>
            </Box>

            <Stack gap={2.5}>
              <DetailField label="Posición" value={active.position || "—"} />
              <DetailField label="Departamento" value={active.department || "—"} />
              <DetailField label="Reporta a" value={
                active.manager_id
                  ? (allNodes.find((n) => n.id === active.manager_id)?.full_name || `Empleado #${active.manager_id}`)
                  : "Top of tree"
              } />
              <Box>
                <Typography variant="caption" sx={{ color: T.text3, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 11, fontWeight: 600, display: "block", mb: 0.5 }}>
                  Reports directos ({active.reports.length})
                </Typography>
                {active.reports.length === 0 ? (
                  <Typography variant="body2" sx={{ color: T.text3, fontSize: 13 }}>
                    Sin reportes directos
                  </Typography>
                ) : (
                  <Stack gap={1}>
                    {active.reports.map((r) => (
                      <Box
                        key={r.id}
                        onClick={() => setActive(r)}
                        sx={{
                          p: "8px 12px", border: `1px solid ${T.rule}`, borderRadius: 1.5,
                          cursor: "pointer", transition: "all 160ms",
                          "&:hover": { bgcolor: T.bg2, borderColor: T.accent },
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: 13, color: T.ink }}>
                          {r.full_name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: T.text2, fontSize: 11 }}>
                          {r.position}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>
            </Stack>
          </Box>
        )}
      </Drawer>
</Box>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: T.text3, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 11, fontWeight: 600, display: "block", mb: 0.25 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ color: T.ink, fontSize: 13.5 }}>
        {value}
      </Typography>
    </Box>
  );
}
