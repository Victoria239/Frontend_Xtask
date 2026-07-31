/* Login Xtask — propuesta D: command palette minimal
 *
 * Preserva 100% del flujo original:
 * - useAuth().login con identifier + password
 * - Redirect a / si ya está autenticado
 * - Manejo de error y loading
 *
 * Aplica skills:
 * - SSO primero (acción de mayor frecuencia para usuarios B2B con Google Workspace)
 * - Email-password secundario
 * - Sin animación al pulsar Enter (login es high-frequency, emil-design-eng)
 * - Botón con scale(0.98) en :active
 * - Hovers gated por @media (hover: hover) and (pointer: fine)
 * - prefers-reduced-motion respetado
 */

import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { notify } from "../../hooks/useToast";
import "./login.css";

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!identifier.trim() || !password.trim()) {
      setError("Por favor completa todos los campos.");
      return;
    }
    setLoading(true);
    try {
      await login({ identifier: identifier.trim(), password });
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } } };
      setError(axiosError.response?.data?.error || "Error al iniciar sesión. Verifica tus credenciales.");
    } finally {
      setLoading(false);
    }
  };

  /* PKCE helpers: code_verifier + code_challenge (S256). */
  const b64url = (bytes: Uint8Array) =>
    btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const generatePkce = async () => {
    const verifierBytes = crypto.getRandomValues(new Uint8Array(32));
    const verifier = b64url(verifierBytes);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
    const challenge = b64url(new Uint8Array(digest));
    return { verifier, challenge };
  };

  /* Redirige al flujo OIDC de Keycloak con hint del IdP externo. */
  const handleSso = async (idpAlias: string) => {
    const kcUrl = import.meta.env.VITE_KEYCLOAK_URL || "http://localhost:8088";
    const realm = import.meta.env.VITE_KEYCLOAK_REALM || "xtask-default";
    const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || "xtask-frontend";
    const redirect = encodeURIComponent(`${window.location.origin}/auth/callback`);
    const state = crypto.randomUUID();
    const { verifier, challenge } = await generatePkce();
    sessionStorage.setItem("kc_state", state);
    sessionStorage.setItem("kc_verifier", verifier);
    const url =
      `${kcUrl}/realms/${realm}/protocol/openid-connect/auth` +
      `?client_id=${clientId}` +
      `&redirect_uri=${redirect}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent("openid email profile")}` +
      `&kc_idp_hint=${idpAlias}` +
      `&state=${state}` +
      `&code_challenge=${challenge}` +
      `&code_challenge_method=S256`;
    window.location.href = url;
  };

  return (
    <div className="login-d">
      {/* ── Top bar ──────────────────────────────────────── */}
      <header className="top">
        <Link to="/landing" className="brand-link" aria-label="Volver al landing de Xtask">
          <span className="brand">
            <span className="logo-mark">X</span>
            <span>Xtask</span>
          </span>
        </Link>
        <div className="top-right">
          <span className="pill">app.xtask.io · operativo</span>
          <button type="button" className="back-link" onClick={() => navigate("/landing")} aria-label="Volver al landing">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Volver al sitio
          </button>
          <a href="mailto:contacto@xtask.co">¿Sin cuenta?</a>
        </div>
      </header>

      {/* ── Center stage ─────────────────────────────────── */}
      <main className="stage">
        <div className="card">
          <p className="cli">
            <span className="prompt">~/xtask</span>
            <span>auth login —tenant andorra-acme</span>
            <span className="cursor" />
          </p>

          <h1>Iniciar sesión</h1>
          <p className="sub">
            Continúa con tu identidad corporativa, o usa email y contraseña abajo.
          </p>

          {error && <div className="alert" role="alert">{error}</div>}

          {/* SSO — Google Workspace via Keycloak IdP */}
          <div className="sso-stack">
            <button
              className="sso-btn"
              type="button"
              onClick={() => handleSso("google")}
            >
              <svg className="ic" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continuar con Google Workspace
              <span className="kbd">G</span>
            </button>
          </div>

          <div className="divider">o con email</div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <input
                type="text"
                placeholder="Email o usuario"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={loading}
                aria-label="Email o usuario"
              />
            </div>

            <div className="field field-pass">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Contraseña"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                aria-label="Contraseña"
              />
              <button
                className="reveal-btn"
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                disabled={loading}
              >
                {showPassword ? "ocultar" : "ver"}
              </button>
            </div>

            <button className="btn-submit" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" aria-hidden="true" /> Validando…
                </>
              ) : (
                <>
                  Iniciar sesión <span className="kbd-enter">↵</span>
                </>
              )}
            </button>
          </form>

          <div className="links-row">
            <a href="#">¿Olvidaste tu contraseña?</a>
            <a href="#">Política de privacidad</a>
          </div>
        </div>
      </main>

      {/* ── Bottom bar ──────────────────────────────────── */}
      <footer className="bottom">
        <span>© 2026 Xtask · Andorra la Vella</span>
        <div className="bottom-keys">
          <span><kbd>Tab</kbd> navegar</span>
          <span><kbd>↵</kbd> enviar</span>
          <span><kbd>Esc</kbd> limpiar</span>
        </div>
      </footer>

      {/* Los toasts ahora se renderizan globalmente vía sileo en App.tsx */}
    </div>
  );
}
