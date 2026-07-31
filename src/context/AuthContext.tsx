/* Contexto global de autenticación — Keycloak-backed.
 *
 * El backend hace el password-grant contra Keycloak y devuelve access + refresh.
 * Aquí solo almacenamos ambos y los exponemos al cliente HTTP.
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { User, LoginRequest } from "../types";
import { authApi } from "../api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isManager: boolean;
  loading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    /* Si el token JWT está vencido (exp pasado) → limpiar y forzar re-login.
     * Decoda el payload sin verificar firma (solo para chequear exp). */
    const isJwtExpired = (jwt: string): boolean => {
      try {
        const payload = JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        if (!payload.exp) return false;
        return payload.exp * 1000 < Date.now();
      } catch { return true; }
    };

    const savedToken = localStorage.getItem("auth_token");
    const savedRefresh = localStorage.getItem("auth_refresh");
    const savedUser = localStorage.getItem("auth_user");

    if (savedToken && savedUser && !isJwtExpired(savedToken)) {
      setToken(savedToken);
      setRefreshToken(savedRefresh);
      setUser(JSON.parse(savedUser));
    } else if (savedToken) {
      /* Token vencido o ilegible → limpieza completa */
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_refresh");
      localStorage.removeItem("auth_user");
    }
    setLoading(false);
  }, []);

  const saveSession = (accessToken: string, refresh: string | undefined, authUser: User) => {
    localStorage.setItem("auth_token", accessToken);
    if (refresh) localStorage.setItem("auth_refresh", refresh);
    localStorage.setItem("auth_user", JSON.stringify(authUser));
    setToken(accessToken);
    setRefreshToken(refresh ?? null);
    setUser(authUser);
  };

  const login = async (data: LoginRequest) => {
    const response = await authApi.login(data);
    saveSession(response.token, response.refresh_token, response.user);
  };

  const logout = async () => {
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        /* best-effort */
      }
    }
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_refresh");
    localStorage.removeItem("auth_user");
    setToken(null);
    setRefreshToken(null);
    setUser(null);
  };

  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "admin" || user?.role === "manager";

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated, isAdmin, isManager, loading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return context;
}
