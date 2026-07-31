/* Servicio API para finanzas (presupuestos y facturas) */

import apiClient from "./client";
import type {
  PaginatedResponse,
  Budget, BudgetCreate, BudgetUpdate, BudgetExecution, ExpenseRegister,
  Invoice, InvoiceCreate, InvoiceUpdate,
} from "../types";

/* ── Presupuestos ────────────────────────────────── */

/* Listar presupuestos con paginación */
export const getBudgets = (params?: Record<string, unknown>) =>
  apiClient.get<PaginatedResponse<Budget>>("/finanzas/presupuestos", { params }).then((r) => r.data);

/* Obtener un presupuesto por ID */
export const getBudget = (id: number) =>
  apiClient.get<Budget>(`/finanzas/presupuestos/${id}`).then((r) => r.data);

/* Crear presupuesto */
export const createBudget = (data: BudgetCreate) =>
  apiClient.post<Budget>("/finanzas/presupuestos", data).then((r) => r.data);

/* Actualizar presupuesto */
export const updateBudget = (id: number, data: BudgetUpdate) =>
  apiClient.patch<Budget>(`/finanzas/presupuestos/${id}`, data).then((r) => r.data);

/* Eliminar presupuesto */
export const deleteBudget = (id: number) =>
  apiClient.delete(`/finanzas/presupuestos/${id}`).then((r) => r.data);

/* Registrar gasto en presupuesto */
export const registerExpense = (id: number, data: ExpenseRegister) =>
  apiClient.post<Budget>(`/finanzas/presupuestos/${id}/gastos`, data).then((r) => r.data);

/* Obtener ejecución de presupuesto */
export const getBudgetExecution = (id: number) =>
  apiClient.get<BudgetExecution>(`/finanzas/presupuestos/${id}/ejecucion`).then((r) => r.data);

/* ── Facturas ────────────────────────────────────── */

/* Listar facturas con paginación */
export const getInvoices = (params?: Record<string, unknown>) =>
  apiClient.get<PaginatedResponse<Invoice>>("/finanzas/facturas", { params }).then((r) => r.data);

/* Obtener una factura por ID */
export const getInvoice = (id: number) =>
  apiClient.get<Invoice>(`/finanzas/facturas/${id}`).then((r) => r.data);

/* Crear factura */
export const createInvoice = (data: InvoiceCreate) =>
  apiClient.post<Invoice>("/finanzas/facturas", data).then((r) => r.data);

/* Actualizar factura */
export const updateInvoice = (id: number, data: InvoiceUpdate) =>
  apiClient.patch<Invoice>(`/finanzas/facturas/${id}`, data).then((r) => r.data);

/* Cambiar estado de factura */
export const changeInvoiceStatus = (id: number, status: string) =>
  apiClient.patch<Invoice>(`/finanzas/facturas/${id}/estado`, { status }).then((r) => r.data);

/* Eliminar factura */
export const deleteInvoice = (id: number) =>
  apiClient.delete(`/finanzas/facturas/${id}`).then((r) => r.data);
