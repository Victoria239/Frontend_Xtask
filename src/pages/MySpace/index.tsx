/* Mi espacio — self-service portal (H-06).
 *
 * Vista en primera persona: solo lo del usuario logueado.
 * Layout en grid con cards:
 * - Perfil (header) + manager + reports
 * - Balance de ausencias (anillo por tipo)
 * - Reviews pendientes
 * - Mis OKRs (con progress bar)
 * - Mis contratos
 * - Beneficios recomendados para mí
 */
import { useEffect, useState } from "react";
import { Box, Stack, Typography, CircularProgress, Chip, Button, LinearProgress } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { meApi } from "../../api";
import type { MyPortal } from "../../api/me";
import { notify } from "../../hooks/useToast";

const T = {
  bg: "#FFFFFF", bg2: "#F7F7F9", surface2: "#F2F2F5",
  rule: "#E5E5EA", rule2: "#D1D1D6",
  ink: "#1A1726", text2: "#605C70", text3: "#8E8A99",
  accent: "#02BDEA", accentD: "#0A4D70",
  amber: "#E08A0E", green: "#01B89E", red: "#D14040", violet: "#7c3aed",
  mono: "'JetBrains Mono', monospace",
};

const ROLE_LABEL: Record<string, string> = {
  self: "Auto", manager: "Manager", peer: "Peer", report: "Subordinado",
};
const ROLE_COLOR: Record<string, string> = {
  self: T.accent, manager: T.violet, peer: T.amber, report: T.green,
};

const CAT_LABEL: Record<string, string> = {
  learning: "Aprendizaje", wellness: "Bienestar", financial: "Financiero",
  flexibility: "Flexibilidad", recognition: "Reconocimiento",
};

export default function MySpacePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [data, setData] = useState<MyPortal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setData(await meApi.getMyPortal());
      } catch (e) {
        const err = e as { response?: { data?: { error?: string } } };
        notify({ kind: "error", msg: err.response?.data?.error || "Error cargando" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <Box sx={{ p: "48px", textAlign: "center" }}><CircularProgress size={22} sx={{ color: T.accent }} /></Box>;
  }
  if (!data) return null;
  if (data.error) {
    return (
      <Box sx={{ p: "48px", textAlign: "center" }}>
        <Typography sx={{ fontSize: 32, mb: 1 }}>👤</Typography>
        <Typography sx={{ fontWeight: 600, mb: 0.5 }}>{data.error}</Typography>
        <Typography variant="caption" sx={{ color: T.text3 }}>
          Si crees que esto es un error, contactá a People Ops.
        </Typography>
      </Box>
    );
  }

  const p = data.profile;
  const initials = p.name.split(" ").map(s => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  return (
    <Box sx={{ px: { xs: "16px", md: "32px" }, pb: "32px", maxWidth: 1200, mx: "auto", color: T.ink }}>
      {/* Header personalizado */}
      <Box sx={{
        p: "20px 24px", border: `1px solid ${T.rule}`, borderRadius: 2,
        bgcolor: T.bg, mb: 2.5,
        display: "grid", gridTemplateColumns: { xs: "1fr", md: "auto 1fr auto" },
        gap: 3, alignItems: "center",
      }}>
        <Box sx={{
          width: 56, height: 56, borderRadius: "50%",
          bgcolor: T.surface2, display: "grid", placeItems: "center",
          fontFamily: T.mono, fontSize: 20, color: T.text2, fontWeight: 600,
          border: `1px solid ${T.rule2}`,
        }}>{initials}</Box>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: "-0.025em" }}>
            {t("dashboard.welcome")}, {p.name.split(" ")[0]} 👋
          </Typography>
          <Typography variant="body2" sx={{ color: T.text2, mt: 0.5 }}>
            {p.position || "—"} · {p.department || "— sin equipo"}
            {p.manager && <> · reporta a <Box component="span" sx={{ fontWeight: 500 }}>{p.manager}</Box></>}
          </Typography>
          {p.hire_date && (
            <Typography variant="caption" sx={{ color: T.text3, fontFamily: T.mono, fontSize: 11 }}>
              Ingreso: {p.hire_date}
            </Typography>
          )}
        </Box>
        <Stack gap={0.5} sx={{ textAlign: { xs: "left", md: "right" } }}>
          <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Empleado #
          </Typography>
          <Typography sx={{ fontFamily: T.mono, fontSize: 14, fontWeight: 600 }}>
            {p.employee_id}
          </Typography>
        </Stack>
      </Box>

      <Box sx={{
        display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.4fr 1fr" },
        gap: 2, mb: 2,
      }}>
        {/* Reviews pendientes — top left, urgente */}
        <Card title={t("dashboard.pendingReviews")} count={data.reviews_pending.length}>
          {data.reviews_pending.length === 0 ? (
            <Empty msg="Sin reviews pendientes 🎉" />
          ) : (
            <Stack gap={0.75}>
              {data.reviews_pending.map((r) => (
                <Box key={r.id} sx={{
                  p: "10px 14px", border: `1px solid ${T.rule}`, borderRadius: 1.5, bgcolor: T.bg,
                  borderLeft: `3px solid ${ROLE_COLOR[r.role] || T.accent}`,
                  display: "grid", gridTemplateColumns: "1fr auto auto", gap: 1.5, alignItems: "center",
                  cursor: "pointer", "&:hover": { bgcolor: T.bg2 },
                }} onClick={() => navigate("/reviews")}>
                  <Box>
                    <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 500 }}>{r.target_name}</Typography>
                    <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5 }}>
                      {r.cycle_name} · {r.period}
                    </Typography>
                  </Box>
                  <Chip label={ROLE_LABEL[r.role] || r.role} size="small" sx={{
                    height: 18, fontSize: 10.5, fontFamily: T.mono,
                    bgcolor: `${ROLE_COLOR[r.role]}15`, color: ROLE_COLOR[r.role], fontWeight: 600,
                  }} />
                  <Typography variant="caption" sx={{ color: T.text3, fontFamily: T.mono, fontSize: 10.5 }}>
                    {r.deadline || "sin límite"}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Card>

        {/* Balance ausencias */}
        <Card title={`${t("dashboard.myLeaves")} · ${data.leaves.balance.year}`}>
          {data.leaves.balance.by_type.filter(t => t.annual_days > 0).length === 0 ? (
            <Empty msg="Sin tipos configurados" />
          ) : (
            <Stack gap={1.5}>
              {data.leaves.balance.by_type.filter(t => t.annual_days > 0).map((t) => {
                const usedPct = t.annual_days ? (t.used_days / t.annual_days) * 100 : 0;
                return (
                  <Box key={t.type_code}>
                    <Stack direction="row" justifyContent="space-between" mb={0.4}>
                      <Typography variant="caption" sx={{ fontSize: 12, color: T.text2 }}>
                        {t.type_name}
                      </Typography>
                      <Typography sx={{ fontFamily: T.mono, fontWeight: 600, fontSize: 12 }}>
                        <Box component="span" sx={{ color: T.ink }}>{t.remaining_days.toFixed(0)}</Box>
                        <Box component="span" sx={{ color: T.text3 }}> / {t.annual_days.toFixed(0)} días</Box>
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, usedPct)}
                      sx={{
                        height: 5, borderRadius: 3, bgcolor: T.surface2,
                        "& .MuiLinearProgress-bar": {
                          bgcolor: t.color || T.accent, borderRadius: 3,
                        },
                      }}
                    />
                  </Box>
                );
              })}
              <Box sx={{ mt: 1, pt: 1, borderTop: `1px solid ${T.rule}` }}>
                <Button size="small" variant="outlined" fullWidth onClick={() => navigate("/ausencias")}
                  sx={{ borderColor: T.rule2, color: T.ink }}>
                  {t("dashboard.requestLeave")}
                </Button>
              </Box>
            </Stack>
          )}
        </Card>
      </Box>

      <Box sx={{
        display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        gap: 2, mb: 2,
      }}>
        {/* OKRs */}
        <Card title={t("dashboard.myOKRs")} count={data.okrs.length}>
          {data.okrs.length === 0 ? (
            <Empty msg="Sin OKRs asignados como owner individual" />
          ) : (
            <Stack gap={1}>
              {data.okrs.map((o) => {
                const pct = Math.round(o.progress * 100);
                const color = pct >= 70 ? T.green : pct >= 30 ? T.accent : T.amber;
                return (
                  <Box key={o.id}>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography variant="body2" sx={{ fontSize: 13 }}>{o.objective}</Typography>
                      <Typography sx={{ fontFamily: T.mono, fontWeight: 700, fontSize: 12, color }}>
                        {pct}%
                      </Typography>
                    </Stack>
                    <Box sx={{ height: 4, bgcolor: T.surface2, borderRadius: 2, overflow: "hidden" }}>
                      <Box sx={{ height: "100%", width: `${pct}%`, bgcolor: color, transition: "width 240ms" }} />
                    </Box>
                    <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5, fontFamily: T.mono }}>
                      {o.period} · {o.scope}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          )}
        </Card>

        {/* Mis contratos */}
        <Card title={t("dashboard.myContracts")} count={data.contracts.length}>
          {data.contracts.length === 0 ? (
            <Empty msg="Sin contratos registrados" />
          ) : (
            <Stack gap={0.75}>
              {data.contracts.map((c) => (
                <Box key={c.id} sx={{
                  p: "10px 14px", border: `1px solid ${T.rule}`, borderRadius: 1.5, bgcolor: T.bg,
                  display: "grid", gridTemplateColumns: "1fr auto", gap: 1, alignItems: "center",
                }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 500 }}>{c.title}</Typography>
                    <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5, fontFamily: T.mono }}>
                      {c.contract_type} · {c.starts_on || "—"}{c.expires_on ? ` → ${c.expires_on}` : ""}
                    </Typography>
                  </Box>
                  <Chip label={c.status} size="small" sx={{
                    height: 18, fontSize: 10.5, fontFamily: T.mono,
                    bgcolor: c.status === "active" || c.status === "signed" ? `${T.green}15` : T.surface2,
                    color: c.status === "active" || c.status === "signed" ? T.green : T.text2,
                    fontWeight: 600,
                  }} />
                </Box>
              ))}
            </Stack>
          )}
        </Card>
      </Box>

      <Box sx={{
        display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1.3fr" },
        gap: 2,
      }}>
        {/* Reports directos (si tiene) */}
        {data.reports.length > 0 ? (
          <Card title={t("dashboard.team")} count={data.reports.length}>
            <Stack gap={0.5}>
              {data.reports.map((r) => (
                <Stack key={r.id} direction="row" gap={1} alignItems="center" sx={{ py: 0.5 }}>
                  <Box sx={{
                    width: 24, height: 24, borderRadius: "50%", bgcolor: T.surface2,
                    display: "grid", placeItems: "center", fontFamily: T.mono, fontSize: 10, color: T.text2,
                  }}>
                    {(r.first_name[0] + r.last_name[0]).toUpperCase()}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontSize: 12.5 }}>
                      {r.first_name} {r.last_name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: T.text3, fontSize: 10.5 }}>
                      {r.position || "—"}
                    </Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Card>
        ) : (
          <Card title="Sin reportes directos">
            <Empty msg="No tenés a nadie reportando a vos." />
          </Card>
        )}

        {/* Beneficios recomendados para mí */}
        <Card title={t("dashboard.suggestedBenefits")}>
          {data.benefits_recommended.length === 0 ? (
            <Empty msg="Sin recomendaciones disponibles" />
          ) : (
            <Stack gap={1}>
              {data.benefits_recommended.map((b) => (
                <Box key={b.code} sx={{
                  p: "10px 14px", border: `1px solid ${T.rule}`, borderRadius: 1.5, bgcolor: T.bg,
                  display: "grid", gridTemplateColumns: "1fr auto", gap: 1.5, alignItems: "center",
                }}>
                  <Box>
                    <Stack direction="row" gap={0.75} alignItems="center" mb={0.25}>
                      <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>
                        {b.name}
                      </Typography>
                      <Chip label={CAT_LABEL[b.category] || b.category} size="small" sx={{
                        height: 16, fontSize: 9.5, bgcolor: T.surface2, color: T.text2,
                      }} />
                    </Stack>
                    <Typography variant="caption" sx={{ color: T.text2, fontSize: 11, fontStyle: "italic" }}>
                      {b.rationale}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontFamily: T.mono, fontWeight: 700, fontSize: 13, color: T.accent }}>
                    {Math.round(b.score * 100)}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Card>
      </Box>
    </Box>
  );
}

/* ─── Card wrapper ─── */
function Card({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <Box sx={{ p: "16px 20px", border: `1px solid ${T.rule}`, borderRadius: 2, bgcolor: T.bg }}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" mb={1.5}>
        <Typography variant="caption" sx={{
          color: T.text3, fontSize: 11, fontWeight: 600,
          textTransform: "uppercase", letterSpacing: "0.04em",
        }}>
          {title}
        </Typography>
        {count !== undefined && (
          <Typography sx={{ fontFamily: T.mono, fontSize: 12, color: T.text3 }}>
            {count}
          </Typography>
        )}
      </Stack>
      {children}
    </Box>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <Typography variant="caption" sx={{ color: T.text3, fontSize: 12, display: "block", textAlign: "center", py: 2 }}>
      {msg}
    </Typography>
  );
}
