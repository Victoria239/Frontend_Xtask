/* Tipos para el módulo de dashboard */

export interface DashboardLayout {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardWidget {
  id: number;
  layout_id: number;
  widget_type: string;
  title: string;
  config: Record<string, unknown> | null;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  created_at: string;
}
