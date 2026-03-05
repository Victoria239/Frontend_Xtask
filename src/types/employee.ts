/* Tipos para el módulo de empleados */

export interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  position: string | null;
  department: string | null;
  hire_date: string | null;
  salary: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeCreate {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  position?: string;
  department?: string;
  hire_date?: string;
  salary?: number;
  status?: string;
}

export interface EmployeeUpdate {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  hire_date?: string;
  salary?: number;
  status?: string;
}
