/* Servicio API para empleados */

import apiClient from "./client";
import type { PaginatedResponse, Employee, EmployeeCreate, EmployeeUpdate } from "../types";

/* Listar empleados con paginación y filtros */
export const getEmployees = (params?: Record<string, unknown>) =>
  apiClient.get<PaginatedResponse<Employee>>("/empleados", { params }).then((r) => r.data);

/* Obtener un empleado por ID */
export const getEmployee = (id: number) =>
  apiClient.get<Employee>(`/empleados/${id}`).then((r) => r.data);

/* Crear nuevo empleado */
export const createEmployee = (data: EmployeeCreate) =>
  apiClient.post<Employee>("/empleados", data).then((r) => r.data);

/* Obtener usuarios del sistema (para vincular empleados) */
export const getUsers = () =>
  apiClient.get("/auth/me").then((r) => r.data);

/* Actualizar empleado */
export const updateEmployee = (id: number, data: EmployeeUpdate) =>
  apiClient.patch<Employee>(`/empleados/${id}`, data).then((r) => r.data);

/* Eliminar empleado */
export const deleteEmployee = (id: number) =>
  apiClient.delete(`/empleados/${id}`).then((r) => r.data);

/* Asignar proyectos a un empleado */
export const assignProjects = (id: number, projectIds: number[]) =>
  apiClient.put(`/empleados/${id}/proyectos`, { project_ids: projectIds }).then((r) => r.data);
