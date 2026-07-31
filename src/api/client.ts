/* Cliente HTTP centralizado con Axios */

import axios from "axios";

/* Base URL: relativa para que el proxy de Vite la gestione en desarrollo */
const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

/* Instancia Axios configurada */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

/* Interceptor: agrega token JWT a cada request */
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* Interceptor: maneja errores 401 (token expirado) */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default apiClient;
