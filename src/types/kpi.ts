/* Tipos para el módulo de KPIs */

export interface Kpi {
  id: number;
  employee_id: number;
  name: string;
  description: string | null;
  target_value: number;
  current_value: number;
  unit: string | null;
  period: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface KpiCreate {
  employee_id: number;
  name: string;
  description?: string;
  target_value: number;
  current_value?: number;
  unit?: string;
  period?: string;
}

export interface KpiUpdate {
  name?: string;
  description?: string;
  target_value?: number;
  current_value?: number;
  unit?: string;
  period?: string;
}
