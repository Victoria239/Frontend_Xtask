/* Servicio API para proyectos */

import apiClient from "./client";
import type { PaginatedResponse, Project, ProjectCreate, ProjectUpdate } from "../types";

/* Listar proyectos con paginación y filtros */
export const getProjects = (params?: Record<string, unknown>) =>
  apiClient.get<PaginatedResponse<Project>>("/proyectos", { params }).then((r) => r.data);

/* Obtener indicadores de proyectos */
export const getProjectIndicators = () =>
  apiClient.get("/proyectos/indicadores").then((r) => r.data);

/* Obtener un proyecto por ID */
export const getProject = (id: number) =>
  apiClient.get<Project>(`/proyectos/${id}`).then((r) => r.data);

/* Crear nuevo proyecto */
export const createProject = (data: ProjectCreate) =>
  apiClient.post<Project>("/proyectos", data).then((r) => r.data);

/* Actualizar proyecto */
export const updateProject = (id: number, data: ProjectUpdate) =>
  apiClient.patch<Project>(`/proyectos/${id}`, data).then((r) => r.data);

/* Cambiar estado del proyecto */
export const changeProjectStatus = (id: number, estado: string) =>
  apiClient.patch<Project>(`/proyectos/${id}/estado`, { estado }).then((r) => r.data);

/* Eliminar proyecto */
export const deleteProject = (id: number) =>
  apiClient.delete(`/proyectos/${id}`).then((r) => r.data);
