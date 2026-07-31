/* XtaskMark — el símbolo X oficial de Xtask.
 *
 * Reproducción fiel al brandbook: dos trazos angulares formando X
 * con 4 nodos circulares en los extremos (estilo circuito).
 * Color por default cyan #02BDEA — usar `color` prop para sobrescribir.
 */

interface XtaskMarkProps {
  size?: number;
  color?: string;
  className?: string;
  ariaLabel?: string;
}

export default function XtaskMark({
  size = 24,
  color = "#02BDEA",
  className,
  ariaLabel,
}: XtaskMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={ariaLabel ?? "Xtask"}
      role={ariaLabel ? "img" : "presentation"}
    >
      <g stroke={color} strokeWidth={6} strokeLinecap="round">
        <path d="M14 14 L50 50" />
        <path d="M50 14 L14 50" />
      </g>
      <g fill={color}>
        <circle cx="14" cy="14" r="4" />
        <circle cx="50" cy="14" r="4" />
        <circle cx="14" cy="50" r="4" />
        <circle cx="50" cy="50" r="4" />
      </g>
    </svg>
  );
}
