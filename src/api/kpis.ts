/* Servicio API para KPIs (C-01) */

import apiClient from "./client";
import type { PaginatedResponse, Kpi, KpiCreate, KpiUpdate, KpiMeasurement } from "../types";

/* Listar KPIs con paginación y filtros (employee_id, period, status) */
export const getKpis = (params?: Record<string, unknown>) =>
  apiClient.get<PaginatedResponse<Kpi>>("/kpis", { params }).then((r) => r.data);

/* Obtener un KPI por ID */
export const getKpi = (id: number) =>
  apiClient.get<Kpi>(`/kpis/${id}`).then((r) => r.data);

/* Crear nuevo KPI (manager+) */
export const createKpi = (data: KpiCreate) =>
  apiClient.post<Kpi>("/kpis", data).then((r) => r.data);

/* Actualizar KPI (manager+) */
export const updateKpi = (id: number, data: KpiUpdate) =>
  apiClient.patch<Kpi>(`/kpis/${id}`, data).then((r) => r.data);

/* Evaluar KPI: actualiza actual_value (cualquier user autenticado) */
export const evaluateKpi = (id: number, actualValue: number) =>
  apiClient.patch<Kpi>(`/kpis/${id}/resultado`, { actual_value: actualValue }).then((r) => r.data);

/* Validar/desvalidar KPI (admin) */
export const validateKpi = (id: number, validated = true) =>
  apiClient.patch<Kpi>(`/kpis/${id}/validar`, { validated }).then((r) => r.data);

/* Eliminar KPI (admin) */
export const deleteKpi = (id: number) =>
  apiClient.delete(`/kpis/${id}`).then((r) => r.data);

/* Lista de mediciones de un KPI (histórico) */
export const getMeasurements = (kpiId: number) =>
  apiClient.get<KpiMeasurement[]>(`/kpis/${kpiId}/measurements`).then((r) => r.data);

/* Ingresar mediciones en batch (manager+) */
export interface MeasurementIn {
  kpi_id: number;
  value: number;
  recorded_at?: string;
  source?: string;
  notes?: string;
}
export const ingestMeasurements = (measurements: MeasurementIn[]) =>
  apiClient
    .post<{ inserted: number; updated_kpis: number[] }>(
      "/kpis/measurements",
      { measurements }
    )
    .then((r) => r.data);
