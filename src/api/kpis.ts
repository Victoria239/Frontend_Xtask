/* Servicio API para KPIs */

import apiClient from "./client";
import type { PaginatedResponse, Kpi, KpiCreate, KpiUpdate } from "../types";

/* Listar KPIs con paginación y filtros */
export const getKpis = (params?: Record<string, unknown>) =>
  apiClient.get<PaginatedResponse<Kpi>>("/kpis", { params }).then((r) => r.data);

/* Obtener un KPI por ID */
export const getKpi = (id: number) =>
  apiClient.get<Kpi>(`/kpis/${id}`).then((r) => r.data);

/* Crear nuevo KPI */
export const createKpi = (data: KpiCreate) =>
  apiClient.post<Kpi>("/kpis", data).then((r) => r.data);

/* Actualizar KPI */
export const updateKpi = (id: number, data: KpiUpdate) =>
  apiClient.patch<Kpi>(`/kpis/${id}`, data).then((r) => r.data);

/* Evaluar KPI */
export const evaluateKpi = (id: number, currentValue: number) =>
  apiClient.post<Kpi>(`/kpis/${id}/evaluar`, { current_value: currentValue }).then((r) => r.data);

/* Validar KPI (solo admin) */
export const validateKpi = (id: number) =>
  apiClient.post<Kpi>(`/kpis/${id}/validar`).then((r) => r.data);

/* Eliminar KPI */
export const deleteKpi = (id: number) =>
  apiClient.delete(`/kpis/${id}`).then((r) => r.data);
