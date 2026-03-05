/* Tipos para el módulo de nóminas */

export interface Payroll {
  id: number;
  employee_id: number;
  period: string;
  base_salary: number;
  bonuses: number;
  deductions: number;
  net_salary: number;
  status: string;
  payment_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayrollCreate {
  employee_id: number;
  period: string;
  base_salary: number;
  bonuses?: number;
  deductions?: number;
}

export interface PayrollUpdate {
  base_salary?: number;
  bonuses?: number;
  deductions?: number;
  payment_date?: string;
}

export interface PayrollStatusUpdate {
  status: string;
}
