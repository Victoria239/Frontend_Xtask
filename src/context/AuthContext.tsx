/* Contexto global de autenticación */

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { User, LoginRequest, RegisterRequest } from "../types";
import { authApi } from "../api";

/* Forma del contexto */
interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isManager: boolean;
  loading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* Provider que envuelve la app */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /* Al montar, restaurar sesión desde localStorage */
  useEffect(() => {
    const savedToken = localStorage.getItem("auth_token");
    const savedUser = localStorage.getItem("auth_user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  /* Guardar sesión en localStorage */
  const saveSession = (authToken: string, authUser: User) => {
    localStorage.setItem("auth_token", authToken);
    localStorage.setItem("auth_user", JSON.stringify(authUser));
    setToken(authToken);
    setUser(authUser);
  };

  /* Iniciar sesión */
  const login = async (data: LoginRequest) => {
    const response = await authApi.login(data);
    saveSession(response.token, response.user);
  };

  /* Registrar usuario */
  const register = async (data: RegisterRequest) => {
    const response = await authApi.register(data);
    saveSession(response.token, response.user);
  };

  /* Cerrar sesión */
  const logout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setToken(null);
    setUser(null);
  };

  /* Propiedades derivadas del rol */
  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "admin" || user?.role === "manager";

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated, isAdmin, isManager, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* Hook para consumir el contexto */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return context;
}
