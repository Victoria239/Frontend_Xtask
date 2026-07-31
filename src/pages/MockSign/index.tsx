/* Pad de firma para el modo mock de E-04.
 *
 * URL: /contratos/{id}/mock-sign?envelope=mock-XXX
 * El usuario dibuja en un canvas, confirma, y el backend marca el contrato como signed.
 */

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { contractsApi } from "../../api";
import type { Contract } from "../../api/contracts";
import { notify } from "../../hooks/useToast";

const T = {
  bg: "#FFFFFF", bg2: "#F7F7F9", rule: "#E5E5EA",
  ink: "#1A1726", text2: "#605C70", text3: "#8E8A99",
  accent: "#02BDEA", green: "#01B89E", red: "#D14040",
  mono: "'JetBrains Mono', monospace",
};

export default function MockSignPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const envelopeId = params.get("envelope") || "";
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [contract, setContract] = useState<Contract | null>(null);
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    if (!id) return;
    contractsApi.getContract(parseInt(id)).then(setContract).catch(() => {
      notify({ kind: "error", msg: "Contrato no encontrado" });
    });
  }, [id]);

  const start = (e: React.PointerEvent) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setDrawing(true);
  };
  const draw = (e: React.PointerEvent) => {
    if (!drawing) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = T.ink;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
    setHasDrawn(true);
  };
  const stop = () => setDrawing(false);

  const clear = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const confirm = async () => {
    if (!id || !envelopeId || !hasDrawn) return;
    setSigning(true);
    try {
      const canvas = canvasRef.current;
      const dataUrl = canvas?.toDataURL("image/png");
      await contractsApi.mockSignConfirm(parseInt(id), envelopeId, dataUrl);
      notify({ kind: "success", msg: "Contrato firmado correctamente" });
      setTimeout(() => navigate(`/contratos`), 1200);
    } catch (e) {
      const err = e as { response?: { data?: { error?: string; detail?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || err.response?.data?.detail || "Error firmando" });
    } finally {
      setSigning(false);
    }
  };

  if (!contract) {
    return (
      <Box sx={{ p: "48px", textAlign: "center" }}>
        <CircularProgress size={22} sx={{ color: T.accent }} />
      </Box>
    );
  }

  if (contract.esign_status === "completed") {
    return (
      <Box sx={{ p: "48px", textAlign: "center", maxWidth: 600, mx: "auto" }}>
        <Typography variant="h4" sx={{ color: T.green, mb: 2 }}>✓ Ya firmado</Typography>
        <Typography variant="body1" sx={{ color: T.text2 }}>Este contrato ya fue firmado.</Typography>
        <Button onClick={() => navigate("/contratos")} sx={{ mt: 3, color: T.accent }}>Volver</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 760, mx: "auto", p: { xs: 2, md: 4 }, color: T.ink }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>Firma electrónica</Typography>
      <Typography variant="caption" sx={{ color: T.text3, fontFamily: T.mono }}>
        envelope · {envelopeId}
      </Typography>

      <Box sx={{ mt: 3, p: "20px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>{contract.title}</Typography>
        <Box sx={{
          maxHeight: 280, overflowY: "auto", p: "12px 16px", border: `1px solid ${T.rule}`,
          borderRadius: 1.5, bgcolor: T.bg2, mb: 2,
          "& h1": { fontSize: 16, fontWeight: 700, mt: 1, mb: 0.5 },
          "& h2": { fontSize: 14, fontWeight: 600, mt: 1 },
          "& p": { fontSize: 12.5, lineHeight: 1.55, my: 0.5 },
        }} dangerouslySetInnerHTML={{ __html: contract.body_html || "" }} />

        <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Tu firma
        </Typography>
        <Box sx={{ mt: 1, position: "relative" }}>
          <canvas
            ref={canvasRef}
            width={680} height={180}
            style={{
              width: "100%", height: 180,
              border: `1px solid ${T.rule}`, borderRadius: 8,
              background: T.bg, cursor: "crosshair", touchAction: "none",
            }}
            onPointerDown={start}
            onPointerMove={draw}
            onPointerUp={stop}
            onPointerLeave={stop}
          />
          {!hasDrawn && (
            <Box sx={{
              position: "absolute", inset: 0, display: "grid", placeItems: "center",
              pointerEvents: "none", color: T.text3, fontStyle: "italic", fontSize: 14,
            }}>
              Dibujá tu firma con el dedo o el ratón
            </Box>
          )}
        </Box>
        <Stack direction="row" gap={1.5} mt={2} justifyContent="flex-end">
          <Button onClick={clear} disabled={!hasDrawn} sx={{ color: T.text2 }}>Borrar</Button>
          <Button
            variant="contained" onClick={confirm} disabled={!hasDrawn || signing}
            sx={{ bgcolor: T.green, "&:hover": { bgcolor: "#019683" } }}
          >
            {signing ? <CircularProgress size={16} sx={{ color: "#FFFFFF" }} /> : "Firmar y enviar"}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
