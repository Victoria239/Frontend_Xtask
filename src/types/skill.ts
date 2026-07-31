/* Tipos para el módulo de habilidades */

export interface Skill {
  id: number;
  employee_id: number;
  name: string;
  level: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
}

export interface SkillCreate {
  employee_id: number;
  name: string;
  level?: string;
  category?: string;
}

export interface SkillUpdate {
  name?: string;
  level?: string;
  category?: string;
}
