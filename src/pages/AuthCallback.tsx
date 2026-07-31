/* /auth/callback — recibe el code de Keycloak tras login OIDC externo (Google).
 *
 * Flujo:
 *   1. Keycloak redirige a esta página con ?code=...&state=...
 *   2. Validamos state contra sessionStorage (anti CSRF)
 *   3. POSTeamos al backend que hace el code-exchange y JIT-provisiona el user
 *   4. Guardamos tokens en localStorage y redirigimos al dashboard
 */

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import apiClient from "../api/client";
import type { LoginResponse, User } from "../types";

export default function AuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");
    const oauthError = params.get("error");

    if (oauthError) {
      setError(params.get("error_description") || oauthError);
      return;
    }
    if (!code) {
      setError("No se recibió el código de autorización.");
      return;
    }

    const savedState = sessionStorage.getItem("kc_state");
    if (savedState && state !== savedState) {
      setError("State inválido (posible CSRF). Reintentá el login.");
      return;
    }
    sessionStorage.removeItem("kc_state");

    const verifier = sessionStorage.getItem("kc_verifier");
    sessionStorage.removeItem("kc_verifier");

    const redirectUri = `${window.location.origin}/auth/callback`;

    apiClient
      .post<LoginResponse>("/auth/keycloak-callback", {
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      })
      .then(({ data }) => {
        localStorage.setItem("auth_token", data.token);
        if (data.refresh_token) localStorage.setItem("auth_refresh", data.refresh_token);
        localStorage.setItem("auth_user", JSON.stringify(data.user as User));
        // Hard reload para que AuthProvider re-lea localStorage.
        window.location.assign("/");
      })
      .catch((e) => {
        const detail =
          e?.response?.data?.error ||
          e?.response?.data?.detail ||
          "No pudimos completar el inicio de sesión.";
        setError(detail);
      });
  }, [params, navigate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
        color: "#e8e8e8",
        fontFamily: "var(--font-sans, system-ui)",
      }}
    >
      <div style={{ maxWidth: 480, padding: "2rem", textAlign: "center" }}>
        {error ? (
          <>
            <h1 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>No pudimos completar el login</h1>
            <p style={{ opacity: 0.7, marginBottom: "1.5rem" }}>{error}</p>
            <button
              onClick={() => navigate("/login")}
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: 8,
                border: "1px solid #333",
                background: "#1a1a1a",
                color: "#e8e8e8",
                cursor: "pointer",
              }}
            >
              Volver al login
            </button>
          </>
        ) : (
          <>
            <div
              style={{
                width: 32,
                height: 32,
                border: "2px solid #333",
                borderTopColor: "#FF5A2C",
                borderRadius: "50%",
                margin: "0 auto 1rem",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <p style={{ opacity: 0.7 }}>Validando con Keycloak…</p>
            <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
          </>
        )}
      </div>
    </div>
  );
}
