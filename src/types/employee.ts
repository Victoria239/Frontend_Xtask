/* Tipos para el módulo de empleados */

export interface Employee {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  position: string | null;
  department: string | null;
  salary: number;
  contract_status: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeCreate {
  user_id: number;
  first_name: string;
  last_name: string;
  position: string;
  department: string;
  salary: number;
  contract_status?: string;
}

export interface EmployeeUpdate {
  first_name?: string;
  last_name?: string;
  position?: string;
  department?: string;
  salary?: number;
  contract_status?: string;
}
