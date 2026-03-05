/* Servicio API para dashboard (layouts y widgets) */

import apiClient from "./client";
import type { DashboardLayout, DashboardWidget } from "../types";

/* ── Layouts ─────────────────────────────────────── */

/* Listar layouts del usuario */
export const getLayouts = () =>
  apiClient.get<DashboardLayout[]>("/dashboard/layouts").then((r) => r.data);

/* Crear layout */
export const createLayout = (data: Partial<DashboardLayout>) =>
  apiClient.post<DashboardLayout>("/dashboard/layouts", data).then((r) => r.data);

/* Actualizar layout */
export const updateLayout = (id: number, data: Partial<DashboardLayout>) =>
  apiClient.patch<DashboardLayout>(`/dashboard/layouts/${id}`, data).then((r) => r.data);

/* Eliminar layout */
export const deleteLayout = (id: number) =>
  apiClient.delete(`/dashboard/layouts/${id}`).then((r) => r.data);

/* ── Widgets ─────────────────────────────────────── */

/* Listar widgets de un layout */
export const getWidgets = (layoutId: number) =>
  apiClient.get<DashboardWidget[]>(`/dashboard/layouts/${layoutId}/widgets`).then((r) => r.data);

/* Crear widget en un layout */
export const createWidget = (layoutId: number, data: Partial<DashboardWidget>) =>
  apiClient.post<DashboardWidget>(`/dashboard/layouts/${layoutId}/widgets`, data).then((r) => r.data);

/* Actualizar widget */
export const updateWidget = (layoutId: number, widgetId: number, data: Partial<DashboardWidget>) =>
  apiClient.patch<DashboardWidget>(`/dashboard/layouts/${layoutId}/widgets/${widgetId}`, data).then((r) => r.data);

/* Eliminar widget */
export const deleteWidget = (layoutId: number, widgetId: number) =>
  apiClient.delete(`/dashboard/layouts/${layoutId}/widgets/${widgetId}`).then((r) => r.data);
