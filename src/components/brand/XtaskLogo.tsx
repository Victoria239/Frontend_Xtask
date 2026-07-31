/* XtaskLogo — símbolo X + wordmark "task".
 *
 * Composición horizontal del brandbook:
 *   [símbolo cyan]  task   (wordmark en aubergine sobre fondos claros,
 *                           en blanco sobre fondos oscuros)
 *
 * Uso típico: header de landing, login, sidebar (versión chica).
 * Para fondos oscuros (aubergine/black) → wordColor "#FFFFFF"
 * Para fondos claros (white) → wordColor "#251948"
 */

import XtaskMark from "./XtaskMark";

interface XtaskLogoProps {
  size?: number;            // alto del símbolo en px; el wordmark se escala proporcional
  wordColor?: string;       // color del wordmark "task"
  markColor?: string;       // color del símbolo X
  className?: string;
}

export default function XtaskLogo({
  size = 28,
  wordColor = "#F5F4F1",
  markColor = "#02BDEA",
  className,
}: XtaskLogoProps) {
  const fontSize = Math.round(size * 0.95);
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: `${Math.max(4, Math.round(size * 0.18))}px`,
        lineHeight: 1,
      }}
    >
      <XtaskMark size={size} color={markColor} />
      <span
        style={{
          fontFamily: "'Bermont', 'Gilroy', 'Inter', system-ui, sans-serif",
          fontWeight: 700,
          fontSize: `${fontSize}px`,
          color: wordColor,
          letterSpacing: "-0.025em",
        }}
      >
        task
      </span>
    </span>
  );
}
