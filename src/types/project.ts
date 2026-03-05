/* Tipos para el módulo de proyectos */

export interface Project {
  id: number;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  department_id: number | null;
  responsible_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  name: string;
  description?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  department_id?: number;
  responsible_id?: number;
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  department_id?: number;
  responsible_id?: number;
}

export interface ProjectStatusUpdate {
  estado: string;
}
