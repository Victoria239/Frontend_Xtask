/* Actividades API — Tablero (backlog + Kanban tipo Jira/Azure DevOps) */

import apiClient from "./client";

export type ActivityStatus = "pendiente" | "en_curso" | "finalizada";
export type ActivityPriority = "baja" | "media" | "alta";

export interface Activity {
  id: number;
  title: string;
  description: string | null;
  status: ActivityStatus;
  priority: ActivityPriority;
  assignee_employee_id: number | null;
  position: number;
  start_at: string | null;
  due_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityIn {
  title: string;
  description?: string | null;
  status?: ActivityStatus;
  priority?: ActivityPriority;
  assignee_employee_id?: number | null;
  start_at?: string | null;
  due_at?: string | null;
}

export interface BoardColumn {
  status: ActivityStatus;
  label: string;
  cards: Activity[];
}

export interface BoardView {
  columns: BoardColumn[];
}

export interface BoardMetrics {
  total: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  overdue: number;
}

/* Board */
export const getBoard = () =>
  apiClient.get<BoardView>("/actividades/board").then((r) => r.data);

export const getMetrics = () =>
  apiClient.get<BoardMetrics>("/actividades/metricas").then((r) => r.data);

/* Backlog / CRUD */
export const list = (params?: { status?: ActivityStatus; assignee_employee_id?: number }) =>
  apiClient.get<Activity[]>("/actividades", { params }).then((r) => r.data);

export const get = (id: number) =>
  apiClient.get<Activity>(`/actividades/${id}`).then((r) => r.data);

export const create = (data: ActivityIn) =>
  apiClient.post<Activity>("/actividades", data).then((r) => r.data);

export const update = (id: number, data: Partial<ActivityIn>) =>
  apiClient.patch<Activity>(`/actividades/${id}`, data).then((r) => r.data);

export const move = (id: number, toStatus: ActivityStatus, position?: number) =>
  apiClient
    .post<Activity>(`/actividades/${id}/mover`, { to_status: toStatus, position })
    .then((r) => r.data);

export const remove = (id: number) => apiClient.delete(`/actividades/${id}`);
