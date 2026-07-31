/* Tipos para el módulo de KPIs — alineado con backend KpiOut */

export interface Kpi {
  id: number;
  employee_id: number;
  name: string;
  description: string | null;
  metric_type: string;          /* numeric | percentage | currency | boolean */
  unit: string | null;
  target_value: number;
  actual_value: number;
  weight: number;
  period: string;               /* ej. "2026-Q2" */
  periodicity: string;          /* weekly | monthly | quarterly | annual */
  status: string;               /* pending | on-track | at-risk | exceeded | met | failed */
  validated: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface KpiCreate {
  employee_id: number;
  name: string;
  description?: string;
  metric_type?: string;
  unit?: string;
  target_value: number;
  weight?: number;
  period: string;
  periodicity?: string;
}

export interface KpiUpdate {
  name?: string;
  description?: string;
  metric_type?: string;
  unit?: string;
  target_value?: number;
  weight?: number;
  period?: string;
  periodicity?: string;
}

export interface KpiMeasurement {
  id: number;
  kpi_id: number;
  value: number;
  recorded_at: string;
  source: string | null;
  notes: string | null;
}
