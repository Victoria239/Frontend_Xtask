/* Servicio API para habilidades */

import apiClient from "./client";
import type { PaginatedResponse, Skill, SkillCreate, SkillUpdate } from "../types";

/* Listar habilidades con paginación y filtros */
export const getSkills = (params?: Record<string, unknown>) =>
  apiClient.get<PaginatedResponse<Skill>>("/habilidades", { params }).then((r) => r.data);

/* Obtener una habilidad por ID */
export const getSkill = (id: number) =>
  apiClient.get<Skill>(`/habilidades/${id}`).then((r) => r.data);

/* Crear nueva habilidad */
export const createSkill = (data: SkillCreate) =>
  apiClient.post<Skill>("/habilidades", data).then((r) => r.data);

/* Actualizar habilidad */
export const updateSkill = (id: number, data: SkillUpdate) =>
  apiClient.patch<Skill>(`/habilidades/${id}`, data).then((r) => r.data);

/* Eliminar habilidad */
export const deleteSkill = (id: number) =>
  apiClient.delete(`/habilidades/${id}`).then((r) => r.data);
