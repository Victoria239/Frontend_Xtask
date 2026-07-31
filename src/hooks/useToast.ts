/* Capa fina sobre sileo — preserva la API que ya usan las páginas:
 *
 *   setToast({ kind: "success", msg: "Listo" })
 *   setToast({ kind: "error", msg: "Algo falló" })
 *
 * Internamente delega en sileo.success/error/warning/info con física + animaciones.
 *
 * Uso:
 *   import { useToast } from "../../hooks/useToast";
 *   const setToast = useToast();
 *   setToast({ kind: "success", msg: "Guardado" });
 */

import { sileo } from "sileo";

export type ToastKind = "success" | "error" | "warning" | "info";

export interface ToastPayload {
  kind: ToastKind;
  msg: string;
  title?: string;
}

const DEFAULT_TITLE: Record<ToastKind, string> = {
  success: "Listo",
  error: "Error",
  warning: "Aviso",
  info: "Info",
};

const palette = {
  success: { fill: "#01B89E" },
  error:   { fill: "#D14040" },
  warning: { fill: "#E08A0E" },
  info:    { fill: "#02BDEA" },
};

/* DEV: exponer sileo en window para poder disparar toasts desde la consola del browser */
if (typeof window !== "undefined") {
  (window as unknown as { __sileo: unknown }).__sileo = sileo;
}

/** Versión function-call directa para usos sin componente */
export function notify(p: ToastPayload | null) {
  if (!p) return;
  const fn = (sileo as unknown as Record<ToastKind, (opts: Record<string, unknown>) => string>)[p.kind] || sileo.info;
  fn({
    title: p.title || DEFAULT_TITLE[p.kind],
    description: p.msg,
    fill: palette[p.kind].fill,
    duration: p.kind === "error" ? 6000 : 3500,
  });
}

/** Hook que devuelve una función con la misma firma del antiguo setToast */
export function useToast() {
  return notify;
}
