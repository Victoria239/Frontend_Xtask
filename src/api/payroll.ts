/* Servicio API para nóminas */

import apiClient from "./client";
import type { PaginatedResponse, Payroll, PayrollCreate, PayrollUpdate } from "../types";

/* Listar nóminas con paginación y filtros */
export const getPayrolls = (params?: Record<string, unknown>) =>
  apiClient.get<PaginatedResponse<Payroll>>("/nominas", { params }).then((r) => r.data);

/* Obtener métricas de nómina */
export const getPayrollMetrics = (period?: string) =>
  apiClient.get("/nominas/metricas", { params: period ? { period } : {} }).then((r) => r.data);

/* Obtener una nómina por ID */
export const getPayroll = (id: number) =>
  apiClient.get<Payroll>(`/nominas/${id}`).then((r) => r.data);

/* Crear nueva nómina */
export const createPayroll = (data: PayrollCreate) =>
  apiClient.post<Payroll>("/nominas", data).then((r) => r.data);

/* Actualizar nómina */
export const updatePayroll = (id: number, data: PayrollUpdate) =>
  apiClient.patch<Payroll>(`/nominas/${id}`, data).then((r) => r.data);

/* Cambiar estado de nómina */
export const changePayrollStatus = (id: number, status: string) =>
  apiClient.patch<Payroll>(`/nominas/${id}/estado`, { status }).then((r) => r.data);

/* Eliminar nómina */
export const deletePayroll = (id: number) =>
  apiClient.delete(`/nominas/${id}`).then((r) => r.data);
