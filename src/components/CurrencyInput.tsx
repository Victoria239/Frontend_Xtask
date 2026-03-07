/* CurrencyInput — campo de texto con formato colombiano (puntos de miles)
   Acepta valores grandes (millones, miles de millones).
   Almacena el valor numérico limpio y muestra con formato.
   Ejemplo: usuario escribe 200000000 → se muestra 200.000.000 */

import { TextField, InputAdornment } from "@mui/material";
import type { TextFieldProps } from "@mui/material";

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  size?: "small" | "medium";
  fullWidth?: boolean;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  slotProps?: TextFieldProps["slotProps"];
}

function formatColCurrency(n: number): string {
  if (!n && n !== 0) return "";
  return n.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function parseColCurrency(raw: string): number {
  const cleaned = raw.replace(/[^0-9]/g, "");
  return cleaned ? parseInt(cleaned, 10) : 0;
}

export default function CurrencyInput({
  value,
  onChange,
  label = "",
  size = "small",
  fullWidth = true,
  required = false,
  placeholder = "0",
  disabled = false,
}: CurrencyInputProps) {
  const display = value ? formatColCurrency(value) : "";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const num = parseColCurrency(raw);
    onChange(num);
  };

  return (
    <TextField
      label={label}
      value={display}
      onChange={handleChange}
      size={size}
      fullWidth={fullWidth}
      required={required}
      placeholder={placeholder}
      disabled={disabled}
      slotProps={{
        input: {
          startAdornment: <InputAdornment position="start">$</InputAdornment>,
        },
      }}
    />
  );
}
