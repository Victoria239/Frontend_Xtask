/* Servicio API para autenticación */

import apiClient from "./client";
import type { LoginRequest, RegisterRequest, LoginResponse, User } from "../types";

/* Iniciar sesión */
export const login = (data: LoginRequest) =>
  apiClient.post<LoginResponse>("/auth/login", data).then((r) => r.data);

/* Registrar nuevo usuario */
export const register = (data: RegisterRequest) =>
  apiClient.post<LoginResponse>("/auth/register", data).then((r) => r.data);

/* Obtener usuario autenticado */
export const getMe = () =>
  apiClient.get<User>("/auth/me").then((r) => r.data);

/* Cerrar sesión */
export const logout = () =>
  apiClient.post("/auth/logout").then((r) => r.data);
