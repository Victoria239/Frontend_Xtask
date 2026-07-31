/* Asistente (AI-08) · Chat copiloto con RAG y citas clickables.
 *
 * Layout:
 *   ┌─────────────┬──────────────────────────────┐
 *   │ History     │  Header (modelo + new chat)  │
 *   │ (sidebar)   ├──────────────────────────────┤
 *   │             │  Messages (user/bot+citas)   │
 *   │             │                              │
 *   │             ├──────────────────────────────┤
 *   │             │  Composer (textarea + send)  │
 *   └─────────────┴──────────────────────────────┘
 *
 * Click en cita → abre dialog con el snippet completo del corpus.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Stack, TextField, Tooltip, Typography, Chip, Alert,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { aiApi } from "../../api";
import type { Citation, Conversation, Message, ChatResponse } from "../../api/ai";
import { notify } from "../../hooks/useToast";

/* ─── Tokens ─────────────────────────────────────────────── */
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

/* Limpieza de emojis (los títulos del corpus Obsidian los traen) */
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}\u{FE0F}\u{200D}]/gu;
const clean = (s?: string) => (s ?? "").replace(EMOJI_RE, "").replace(/\s+/g, " ").trim();
const cleanText = (s?: string) => (s ?? "").replace(EMOJI_RE, "").replace(/[ \t]+/g, " ").trim();

/* Metadatos legibles de cada fuente de una cita */
const srcMeta = (st?: string) => {
  if (st === "db") return { kind: "db", label: "Base de datos", color: "#01B89E", bg: "rgba(1,184,158,0.10)" };
  if (st === "vault") return { kind: "vault", label: "Bóveda", color: "#7C3AED", bg: "rgba(124,58,237,0.10)" };
  if (st === "policy") return { kind: "file", label: "Política", color: "#0A4D70", bg: "rgba(2,189,234,0.10)" };
  if (st === "upload") return { kind: "file", label: "Archivo", color: "#0A4D70", bg: "rgba(2,189,234,0.10)" };
  return { kind: "file", label: "Documento", color: "#0A4D70", bg: "rgba(2,189,234,0.10)" };
};
const SrcIcon = ({ kind }: { kind: string }) => {
  if (kind === "db") return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5" /><path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" /></svg>);
  if (kind === "vault") return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="2.4" /><circle cx="5" cy="5" r="1.6" /><circle cx="19" cy="5" r="1.6" /><circle cx="5" cy="19" r="1.6" /><circle cx="19" cy="19" r="1.6" /><line x1="6.4" y1="6.4" x2="10.2" y2="10.2" /><line x1="17.6" y1="6.4" x2="13.8" y2="10.2" /><line x1="6.4" y1="17.6" x2="10.2" y2="13.8" /><line x1="17.6" y1="17.6" x2="13.8" y2="13.8" /></svg>);
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>);
};

interface UIMessage {
  id: string;                // local id (timestamp) o backend id stringified
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  provider?: string;
  used_rag?: boolean;
}

const SUGGESTIONS = [
  "¿Cuántos empleados hay por departamento?",
  "¿Quién está en alto riesgo de fuga?",
  "¿Cuál es el código de vestimenta para reuniones con cliente?",
  "Resumime la política de gastos de 2026",
];

export default function AssistantPage() {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvo, setActiveConvo] = useState<number | null>(null);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvo, setLoadingConvo] = useState(false);
  const [citationOpen, setCitationOpen] = useState<Citation | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

  /* Carga la lista de conversaciones al montar */
  const loadConversations = useCallback(async () => {
    try {
      const list = await aiApi.listConversations();
      setConversations(list);
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "No se cargaron las conversaciones" });
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  /* Al cambiar la convo activa, traer sus mensajes */
  useEffect(() => {
    if (activeConvo == null) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setLoadingConvo(true);
    aiApi.listMessages(activeConvo)
      .then((msgs: Message[]) => {
        if (cancelled) return;
        setMessages(msgs.map((m) => ({
          id: String(m.id),
          role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
          content: m.content,
          citations: Array.isArray(m.citations) ? (m.citations as Citation[]) : [],
        })));
      })
      .catch((e) => {
        const err = e as { response?: { data?: { error?: string } } };
        notify({ kind: "error", msg: err.response?.data?.error || "No se cargaron los mensajes" });
      })
      .finally(() => { if (!cancelled) setLoadingConvo(false); });
    return () => { cancelled = true; };
  }, [activeConvo]);

  /* Auto-scroll al final cada vez que cambia messages */
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const newChat = () => {
    setActiveConvo(null);
    setMessages([]);
    setInput("");
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;

    /* Optimistic add user msg */
    const userMsg: UIMessage = { id: `local-${Date.now()}`, role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res: ChatResponse = await aiApi.chat({
        conversation_id: activeConvo ?? undefined,
        message: text,
      });
      const botMsg: UIMessage = {
        id: `srv-${res.conversation_id}-${Date.now()}`,
        role: "assistant",
        content: res.answer,
        citations: res.citations,
        provider: res.provider,
        used_rag: res.used_rag,
      };
      setMessages((prev) => [...prev, botMsg]);

      /* Si era convo nueva, fijala como activa y recargá lista */
      if (activeConvo == null) {
        setActiveConvo(res.conversation_id);
        loadConversations();
      }
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      notify({ kind: "error", msg: err.response?.data?.error || "Error al enviar el mensaje" });
      /* Rollback: quitamos el user msg optimista */
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Box sx={{
      display: "grid",
      gridTemplateColumns: { xs: "1fr", md: "260px 1fr" },
      height: "calc(100vh - 80px)",   /* descontamos top padding del MainLayout */
      px: { xs: "12px", md: "20px" },
      gap: "20px",
      maxWidth: 1280, mx: "auto", width: "100%",
    }}>
      {/* ── Conversaciones (sidebar izquierda del chat) ── */}
      <Box sx={{
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        border: `1px solid ${T.rule}`, borderRadius: 2,
        bgcolor: T.bg, overflow: "hidden",
      }}>
        <Box sx={{ p: "14px 16px", borderBottom: `1px solid ${T.rule}` }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<PlusIcon />}
            onClick={newChat}
            sx={{ bgcolor: T.accent, color: "#FFFFFF", boxShadow: "none", "&:hover": { bgcolor: "#0496BA", boxShadow: "none" } }}
          >
            Nueva conversación
          </Button>
        </Box>
        <Box sx={{ flex: 1, overflowY: "auto", p: "8px" }}>
          {conversations.length === 0 ? (
            <Typography variant="caption" sx={{ color: T.text3, p: 1, display: "block" }}>
              Aún no hay conversaciones
            </Typography>
          ) : conversations.map((c) => (
            <Box
              key={c.id}
              onClick={() => setActiveConvo(c.id)}
              sx={{
                px: "10px", py: "8px", borderRadius: 1.5, cursor: "pointer",
                bgcolor: activeConvo === c.id ? T.surface2 : "transparent",
                color: activeConvo === c.id ? T.ink : T.text2,
                "&:hover": { bgcolor: T.bg2 },
                transition: "background 120ms",
                mb: "2px",
              }}
            >
              <Typography variant="body2" sx={{
                fontSize: 13, fontWeight: 500,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {c.title || `Conversación ${c.id}`}
              </Typography>
              <Typography variant="caption" sx={{ color: T.text3, fontFamily: T.mono, fontSize: 10.5 }}>
                {new Date(c.updated_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── Chat principal ── */}
      <Box sx={{
        display: "flex", flexDirection: "column",
        border: `1px solid ${T.rule}`, borderRadius: 2,
        bgcolor: T.bg, overflow: "hidden",
      }}>
        {/* Header */}
        <Box sx={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          px: "20px", py: "14px", borderBottom: `1px solid ${T.rule}`,
        }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 16, color: T.ink, letterSpacing: "-0.012em" }}>
              {t("assistant.title")}
            </Typography>
            <Typography variant="caption" sx={{ color: T.text3 }}>
              Responde con citas del corpus de tu tenant
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            {messages.find((m) => m.provider)?.provider?.includes("fallback") && (
              <Tooltip title="Configurá OPENAI_API_KEY para mejor calidad. Hoy va en modo extractivo (devuelve fragmentos del corpus sin reformularlos).">
                <Chip
                  size="small"
                  label="modo extractivo"
                  sx={{ bgcolor: "rgba(224,138,14,0.1)", color: T.amber, fontSize: 11, height: 22, fontFamily: T.mono }}
                />
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Messages */}
        <Box ref={scrollRef} sx={{
          flex: 1, overflowY: "auto",
          padding: { xs: "16px", md: "24px 32px" },
        }}>
          {loadingConvo ? (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <CircularProgress size={24} sx={{ color: T.accent }} />
            </Box>
          ) : messages.length === 0 ? (
            <EmptyState onPick={(q) => { setInput(q); setTimeout(() => sendMessage(), 50); }} />
          ) : (
            <Stack gap={3}>
              {messages.map((m) => (
                <MessageBubble key={m.id} msg={m} onCitation={(c) => setCitationOpen(c)} />
              ))}
              {sending && (
                <Box sx={{ display: "flex", gap: "10px", alignItems: "center", color: T.text3, fontSize: 13 }}>
                  <BotAvatar />
                  <ThinkingDots />
                  <span>pensando…</span>
                </Box>
              )}
            </Stack>
          )}
        </Box>

        {/* Composer */}
        <Box sx={{
          borderTop: `1px solid ${T.rule}`,
          p: { xs: "12px 16px", md: "16px 24px" },
          bgcolor: T.bg,
        }}>
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-end" }}>
            <TextField
              fullWidth
              multiline
              minRows={1}
              maxRows={6}
              placeholder={t("assistant.placeholder")}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={sending}
              size="small"
              sx={{
                "& .MuiOutlinedInput-root": {
                  bgcolor: T.bg2,
                  borderRadius: 2,
                  fontSize: 14,
                  "& fieldset": { borderColor: T.rule },
                  "&:hover fieldset": { borderColor: T.rule2 },
                  "&.Mui-focused fieldset": { borderColor: T.accent },
                },
              }}
            />
            <IconButton
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              sx={{
                bgcolor: T.accent,
                color: "#FFFFFF",
                width: 40, height: 40,
                borderRadius: 2,
                "&:hover": { bgcolor: "#0496BA" },
                "&.Mui-disabled": { bgcolor: T.rule, color: T.text3 },
              }}
            >
              {sending ? <CircularProgress size={16} sx={{ color: "#FFFFFF" }} /> : <SendIcon />}
            </IconButton>
          </Box>
          <Typography variant="caption" sx={{ color: T.text3, fontSize: 11, mt: 0.5, display: "block" }}>
            Enter para enviar · Shift+Enter para nueva línea
          </Typography>
        </Box>
      </Box>

      {/* Modal de cita */}
      <Dialog open={!!citationOpen} onClose={() => setCitationOpen(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: "16px", overflow: "hidden" } }}>
        {citationOpen && (() => {
          const m = srcMeta(citationOpen.source_type);
          const isDb = citationOpen.source_type === "db";
          const pct = Math.max(0, Math.min(100, Math.round((citationOpen.score ?? 0) * 100)));
          return (
            <>
              <Box sx={{ p: "22px 24px 16px", borderBottom: `1px solid ${T.rule}` }}>
                <Box sx={{ display: "inline-flex", alignItems: "center", gap: "6px", px: "9px", py: "4px", borderRadius: "7px", bgcolor: m.bg, color: m.color, mb: 1.25 }}>
                  <SrcIcon kind={m.kind} />
                  <Box component="span" sx={{ fontSize: 11, fontWeight: 700, fontFamily: T.mono }}>{m.label}</Box>
                </Box>
                <Typography sx={{ fontSize: 17, fontWeight: 700, color: T.ink, lineHeight: 1.3 }}>{clean(citationOpen.document_title) || "Fuente"}</Typography>
                {isDb ? (
                  <Typography sx={{ mt: 1.25, fontSize: 12.5, color: T.text2 }}>Dato consultado en vivo en la base de datos de la empresa.</Typography>
                ) : (
                  <Box sx={{ mt: 1.5, display: "flex", alignItems: "center", gap: 1.25 }}>
                    <Typography sx={{ fontFamily: T.mono, fontSize: 11, color: T.text3 }}>Relevancia</Typography>
                    <Box sx={{ flex: 1, maxWidth: 170, height: 6, borderRadius: 3, bgcolor: T.surface2, overflow: "hidden" }}>
                      <Box sx={{ width: `${pct}%`, height: "100%", bgcolor: m.color, borderRadius: 3 }} />
                    </Box>
                    <Typography sx={{ fontFamily: T.mono, fontSize: 12, color: m.color, fontWeight: 700 }}>{pct}%</Typography>
                  </Box>
                )}
              </Box>
              <Box sx={{ p: "18px 24px", maxHeight: "46vh", overflowY: "auto" }}>
                <Typography sx={{ fontFamily: T.mono, fontSize: 9.5, letterSpacing: "0.06em", textTransform: "uppercase", color: T.text3, mb: 1 }}>
                  {isDb ? "Datos obtenidos" : "Fragmento citado"}
                </Typography>
                <Typography sx={{ color: T.ink, fontSize: 14, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{cleanText(citationOpen.snippet) || "—"}</Typography>
              </Box>
              <Box sx={{ p: "13px 24px", borderTop: `1px solid ${T.rule}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
                <Typography sx={{ fontSize: 11.5, color: T.text3, lineHeight: 1.4 }}>El asistente usó esta fuente para elaborar la respuesta.</Typography>
                <Button onClick={() => setCitationOpen(null)} variant="contained" size="small"
                  sx={{ textTransform: "none", fontWeight: 600, bgcolor: T.brand, borderRadius: "8px", flexShrink: 0, "&:hover": { bgcolor: "#1c1338" } }}>Cerrar</Button>
              </Box>
            </>
          );
        })()}
      </Dialog>
</Box>
  );
}

/* ─── Subcomponents ───────────────────────────────────────── */

function MessageBubble({ msg, onCitation }: { msg: UIMessage; onCitation: (c: Citation) => void }) {
  const isUser = msg.role === "user";
  return (
    <Box sx={{
      display: "flex",
      flexDirection: isUser ? "row-reverse" : "row",
      gap: "10px",
      alignItems: "flex-start",
    }}>
      {isUser ? <UserAvatar /> : <BotAvatar />}
      <Box sx={{ maxWidth: "calc(100% - 50px)", display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start", gap: "8px" }}>
        <Box sx={{
          padding: "12px 16px",
          borderRadius: isUser ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
          bgcolor: isUser ? T.brand : T.bg2,
          color: isUser ? "#FFFFFF" : T.ink,
          fontSize: 14, lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          maxWidth: "62ch",
          border: isUser ? "none" : `1px solid ${T.rule}`,
        }}>
          {msg.content}
        </Box>

        {/* Fuentes de la respuesta */}
        {!isUser && msg.citations && msg.citations.length > 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: "7px", mt: "2px" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
              <Typography sx={{ fontFamily: T.mono, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: T.text3 }}>
                De dónde salió esta respuesta
              </Typography>
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {msg.citations.map((c, idx) => {
                const m = srcMeta(c.source_type);
                return (
                  <Box key={`${c.document_id}-${c.position}-${idx}`} onClick={() => onCitation(c)} role="button" tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter") onCitation(c); }}
                    sx={{
                      display: "inline-flex", alignItems: "center", gap: "8px", maxWidth: "100%",
                      bgcolor: T.bg, border: `1px solid ${T.rule}`, borderRadius: "9px", px: "9px", py: "6px", cursor: "pointer",
                      transition: "border-color .15s, background .15s, box-shadow .15s",
                      "&:hover": { borderColor: m.color, bgcolor: T.bg2, boxShadow: `0 1px 6px ${m.bg}` },
                    }}>
                    <Box component="span" sx={{ fontFamily: T.mono, fontSize: 10, color: T.text3, fontWeight: 600, minWidth: 12, textAlign: "center" }}>{idx + 1}</Box>
                    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: "5px", px: "7px", py: "3px", borderRadius: "6px", bgcolor: m.bg, color: m.color, flexShrink: 0 }}>
                      <SrcIcon kind={m.kind} />
                      <Box component="span" sx={{ fontSize: 10.5, fontWeight: 700, fontFamily: T.mono, whiteSpace: "nowrap" }}>{m.label}</Box>
                    </Box>
                    <Box component="span" sx={{ fontSize: 12.5, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "260px" }}>{clean(c.document_title)}</Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3 }}>
      <Box sx={{
        width: 56, height: 56, borderRadius: "50%",
        bgcolor: "rgba(2,189,234,0.08)",
        display: "grid", placeItems: "center",
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.4 8.4 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.4 8.4 0 01-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.4 8.4 0 013.8-.9h.5a8.5 8.5 0 018 8v.5z" />
        </svg>
      </Box>
      <Box sx={{ textAlign: "center" }}>
        <Typography variant="h6" sx={{ color: T.ink, fontWeight: 600, mb: 0.5, letterSpacing: "-0.015em" }}>
          ¿En qué te ayudo hoy?
        </Typography>
        <Typography variant="body2" sx={{ color: T.text2, fontSize: 13.5, maxWidth: "56ch" }}>
          Preguntá lo que necesites del corpus de tu tenant. Cada respuesta incluye las citas exactas para que puedas auditar la fuente.
        </Typography>
      </Box>
      <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, maxWidth: 720, width: "100%", mt: 1 }}>
        {SUGGESTIONS.map((s) => (
          <Box
            key={s}
            onClick={() => onPick(s)}
            sx={{
              p: "12px 16px", borderRadius: 2,
              border: `1px solid ${T.rule}`, bgcolor: T.bg, cursor: "pointer",
              fontSize: 13, color: T.text2,
              "&:hover": { bgcolor: T.bg2, borderColor: T.accent, color: T.ink },
              transition: "all 160ms",
            }}
          >
            {s}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function UserAvatar() {
  return (
    <Box sx={{
      width: 32, height: 32, borderRadius: "50%",
      bgcolor: T.brand, color: "#FFFFFF",
      display: "grid", placeItems: "center",
      fontFamily: T.mono, fontSize: 11, fontWeight: 600,
      flexShrink: 0,
    }}>U</Box>
  );
}

function BotAvatar() {
  return (
    <Box sx={{
      width: 32, height: 32, borderRadius: "50%",
      bgcolor: "rgba(2,189,234,0.12)",
      display: "grid", placeItems: "center",
      flexShrink: 0,
    }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.4 8.4 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.4 8.4 0 01-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.4 8.4 0 013.8-.9h.5a8.5 8.5 0 018 8v.5z" />
      </svg>
    </Box>
  );
}

function ThinkingDots() {
  return (
    <Box sx={{ display: "inline-flex", gap: "3px" }}>
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          sx={{
            width: 5, height: 5, borderRadius: "50%",
            bgcolor: T.text3,
            animation: "xt-bounce 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.15}s`,
            "@keyframes xt-bounce": {
              "0%, 80%, 100%": { opacity: 0.3, transform: "scale(0.85)" },
              "40%": { opacity: 1, transform: "scale(1)" },
            },
          }}
        />
      ))}
    </Box>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
