/* Tipos para el módulo de finanzas (presupuestos y facturas) */

export interface Budget {
  id: number;
  name: string;
  description: string | null;
  total_amount: number;
  spent_amount: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetCreate {
  name: string;
  description?: string;
  total_amount: number;
  start_date?: string;
  end_date?: string;
}

export interface BudgetUpdate {
  name?: string;
  description?: string;
  total_amount?: number;
  start_date?: string;
  end_date?: string;
}

export interface ExpenseRegister {
  amount: number;
}

export interface BudgetExecution {
  budget_id: number;
  total_amount: number;
  spent_amount: number;
  remaining_amount: number;
  execution_percentage: number;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  vendor: string;
  amount: number;
  status: string;
  issue_date: string | null;
  due_date: string | null;
  budget_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceCreate {
  invoice_number: string;
  vendor: string;
  amount: number;
  issue_date?: string;
  due_date?: string;
  budget_id?: number;
}

export interface InvoiceUpdate {
  vendor?: string;
  amount?: number;
  issue_date?: string;
  due_date?: string;
  budget_id?: number;
}

export interface InvoiceStatusUpdate {
  status: string;
}
