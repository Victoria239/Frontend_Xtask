/* Tipos para el módulo de autenticación */

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
  role?: "admin" | "manager" | "user";
}

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: "admin" | "manager" | "user";
}

export interface LoginResponse {
  token: string;
  user: User;
}
