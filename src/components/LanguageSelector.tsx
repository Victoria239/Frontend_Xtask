/* Selector visual de idioma — bandera actual + menú con las 6 opciones.
 *
 * Persistencia: localStorage "xt.lang" (configurado en i18n/index.ts).
 * Si el usuario cambia, i18next emite un evento y todos los componentes que
 * usan useTranslation se rerenderizan automáticamente.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Box, IconButton, Menu, MenuItem, Tooltip, Typography } from "@mui/material";
import { SUPPORTED_LANGUAGES, type LangCode } from "../i18n";

const T = {
  bg: "#FFFFFF", bg2: "#F7F7F9",
  rule: "#E5E5EA",
  ink: "#1A1726", text2: "#605C70", text3: "#8E8A99",
  accent: "#02BDEA",
  mono: "'JetBrains Mono', monospace",
};

interface Props {
  variant?: "icon" | "compact";
}

export default function LanguageSelector({ variant = "icon" }: Props) {
  const { i18n, t } = useTranslation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const currentCode = (i18n.resolvedLanguage || i18n.language || "es") as LangCode;
  const current = SUPPORTED_LANGUAGES.find(l => l.code === currentCode) || SUPPORTED_LANGUAGES[0];

  const handleSelect = (code: LangCode) => {
    i18n.changeLanguage(code);
    setAnchor(null);
  };

  return (
    <>
      <Tooltip title={t("common.language") + ": " + current.name} placement="bottom">
        <IconButton
          onClick={(e) => setAnchor(e.currentTarget)}
          size="small"
          sx={{
            color: T.text2, p: variant === "compact" ? "4px 8px" : "6px",
            borderRadius: "6px",
            "&:hover": { bgcolor: T.bg2, color: T.ink },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Box sx={{ fontSize: 18, lineHeight: 1 }}>{current.flag}</Box>
            {variant === "compact" && (
              <Typography sx={{
                fontFamily: T.mono, fontSize: 11, fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.05em",
              }}>
                {current.code}
              </Typography>
            )}
          </Box>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        PaperProps={{
          sx: {
            mt: 1, minWidth: 200,
            border: `1px solid ${T.rule}`, boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
          },
        }}
      >
        <Typography
          variant="caption"
          sx={{
            display: "block", px: 2, pt: 1, pb: 0.5,
            color: T.text3, fontSize: 10.5, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.06em",
            fontFamily: T.mono,
          }}
        >
          {t("common.language")}
        </Typography>
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isActive = lang.code === currentCode;
          return (
            <MenuItem
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              selected={isActive}
              sx={{
                py: 1, gap: 1.5,
                "&.Mui-selected": { bgcolor: `${T.accent}11` },
                "&.Mui-selected:hover": { bgcolor: `${T.accent}22` },
              }}
            >
              <Box sx={{ fontSize: 20, lineHeight: 1 }}>{lang.flag}</Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{
                  fontSize: 13.5, fontWeight: isActive ? 600 : 500,
                  color: isActive ? T.accent : T.ink,
                }}>
                  {lang.name}
                </Typography>
                <Typography variant="caption" sx={{
                  color: T.text3, fontSize: 11, fontFamily: T.mono,
                }}>
                  {lang.english.toLowerCase()} · {lang.code}
                </Typography>
              </Box>
              {isActive && (
                <Box sx={{ color: T.accent, fontSize: 16, lineHeight: 1 }}>✓</Box>
              )}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}
