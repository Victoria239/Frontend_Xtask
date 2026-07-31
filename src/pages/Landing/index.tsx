/* Landing Xtask — combinación B (cinematic chapter) + D (interactive product)
 *
 * Aplica impeccable + emil-design-eng:
 * - Sin gradient text, sin glassmorphism, sin spheres decorativos
 * - Sin 01/02/03 scaffolding genérico (los capítulos usan números romanos
 *   porque son una secuencia narrativa real)
 * - Botones con scale(0.97) en :active
 * - Hovers gated por @media (hover: hover) and (pointer: fine)
 * - Reveals enhances un default visible (no gate)
 * - Tab transitions con clip-path
 * - Marquee infinito con animation-play-state pause en hover
 * - prefers-reduced-motion respetado
 */

import React, { useEffect, useRef, useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Box } from "@mui/material";
import XtaskMark from "../../components/brand/XtaskMark";
import "./landing.css";

/* SVG paths inline para no traer deps de iconos. Minimal stroke 1.6 weight. */
const sectorIcon = (kind: string) => {
  const map: Record<string, ReactElement> = {
    tech:        <path d="M4 6h16M4 12h16M4 18h10" />,
    construct:   <path d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6" />,
    gov:         <path d="M3 21h18M5 21V10M19 21V10M9 21V13h6v8M3 10h18l-9-6z" />,
    ngo:         <path d="M12 21s-7-5-7-11a5 5 0 019-3 5 5 0 019 3c0 6-7 11-7 11z" fill="currentColor" stroke="none" opacity="0.85" />,
    health:      <path d="M12 5v14M5 12h14" />,
    edu:         <path d="M3 9l9-4 9 4-9 4-9-4zM7 11v6c0 1 2 2 5 2s5-1 5-2v-6" />,
    manufact:    <path d="M3 21h18M4 21l3-9 3 4 3-8 3 6 4-5v12" />,
    services:    <path d="M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2c3 4 3 16 0 20M12 2c-3 4-3 16 0 20" />,
    finance:     <path d="M4 18h16M6 14l4-4 4 4 4-8M16 6h4v4" />,
    retail:      <path d="M3 9l1-4h16l1 4M3 9h18v12H3zM9 13h6" />,
    logistics:   <path d="M3 8h11v8H3zM14 11h5l2 3v2h-7M6 20a2 2 0 100-4 2 2 0 000 4zM17 20a2 2 0 100-4 2 2 0 000 4z" />,
    energy:      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />,
  };
  return map[kind] || map.services;
};

const sectors = [
  { name: "Tecnología",     count: "150+ empresas", icon: "tech" },
  { name: "Construcción",   count: "85+ empresas",  icon: "construct" },
  { name: "Gobierno",       count: "45+ entidades", icon: "gov" },
  { name: "ONG",            count: "67+ proyectos", icon: "ngo" },
  { name: "Salud",          count: "92+ centros",   icon: "health" },
  { name: "Educación",      count: "38+ centros",   icon: "edu" },
  { name: "Manufactura",    count: "76+ plantas",   icon: "manufact" },
  { name: "Servicios",      count: "112+ empresas", icon: "services" },
  { name: "Finanzas",       count: "29+ entidades", icon: "finance" },
  { name: "Retail",         count: "54+ cadenas",   icon: "retail" },
  { name: "Logística",      count: "41+ operadores", icon: "logistics" },
  { name: "Energía",        count: "18+ utilities", icon: "energy" },
];

const marqueeItems = [
  "Multi-tenant aislado", "SSO SAML / OIDC", "GDPR · Habeas Data · LOPD",
  "pgvector nativo", "Trazabilidad SOC 2 ready", "22 países activos",
  "500+ empresas piloto", "API pública OpenAPI 3.1",
];

/* ── Demo Q&A pares para rotar en el copiloto live ──────────── */
const demoConvos = [
  {
    q: "¿Cuántos días de vacaciones tiene Ana con 6 años de antigüedad?",
    a: "Ana tiene derecho a **25 días hábiles**: los 22 base más 3 adicionales por superar los 5 años de antigüedad, conforme a la política vigente del tenant.",
    cites: ["Política vacaciones 2026 · §2.1", "Convenio colectivo · cláusula 14"],
  },
  {
    q: "¿Cuánto bono recibe Marco por cumplir el OKR Q2?",
    a: "Marco recibe **€1.840** por alcanzar el 108% del OKR \"Lanzamientos Q2\", aplicando el plan de compensación 2026 con peso 1.5 y multiplicador por sobrecumplimiento.",
    cites: ["Plan de compensación 2026 · §4.2", "OKR Q2 · resultado cerrado"],
  },
  {
    q: "¿Puede Lucía teletrabajar desde Lisboa los lunes?",
    a: "**Sí, está autorizado**. La política Xtask 2026 permite hasta 3 días de teletrabajo semanal desde cualquier ubicación del EEE; los días obligatorios presenciales son martes y jueves.",
    cites: ["Política teletrabajo 2026 · §1.3"],
  },
];

const tabs = [
  { id: "rag",       label: "Copiloto RAG",        kicker: "AI-08" },
  { id: "okr",       label: "OKRs en cascada",     kicker: "C-02" },
  { id: "contracts", label: "Contratos con citas", kicker: "AI-03" },
];

/* ════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const navigate = useNavigate();
  const [convoIdx, setConvoIdx] = useState(0);
  const [activeTab, setActiveTab] = useState("rag");
  const [typed, setTyped] = useState("");

  /* ── Rotador de demo Q&A: la query se "escribe" letra a letra ── */
  useEffect(() => {
    const target = demoConvos[convoIdx].q;
    let i = 0;
    setTyped("");
    const typer = setInterval(() => {
      i++;
      setTyped(target.slice(0, i));
      if (i >= target.length) {
        clearInterval(typer);
        setTimeout(() => setConvoIdx((p) => (p + 1) % demoConvos.length), 4500);
      }
    }, 28);
    return () => clearInterval(typer);
  }, [convoIdx]);

  /* ── Reveal observer: aplica .revealed a cualquier variante,
   *    luego desobserva (perf). prefers-reduced-motion: ignora todo
   *    porque el CSS ya lo neutraliza vía media query. ───────────── */
  useEffect(() => {
    const selectors = ".reveal, .reveal-rise, .reveal-scale, .reveal-mask, .reveal-stagger";
    const obs = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("revealed");
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    document.querySelectorAll(selectors).forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  /* ── Auto-hide del pill nav cuando entra el CTA final o el footer.
   *    El nav ya no aporta una vez que estás en el cierre. ────────── */
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>(".bd-nav");
    const sentinel = document.querySelector(".bd-cap-final");
    if (!nav || !sentinel) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => nav.classList.toggle("is-hidden", e.isIntersecting)),
      { threshold: 0.12 }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, []);

  /* ── Scroll-driven motion: escribe --p (0..1) en cada elemento
   *    con [data-scroll*] según su progreso a través del viewport.
   *    Un solo rAF loop para toda la página → 60fps estable. ──────── */
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const selectors = [
      ".bd-demo",
      "[data-scroll-pan]",
      "[data-scroll-scale]",
      "[data-scroll-pan-h]",
      "[data-scroll-parallax]",
    ].join(",");

    const targets = Array.from(document.querySelectorAll<HTMLElement>(selectors));
    let rafId = 0;
    let ticking = false;

    const compute = () => {
      const vh = window.innerHeight;
      for (const el of targets) {
        const r = el.getBoundingClientRect();
        /* Progreso: 0 cuando el elemento entra por abajo, 1 cuando
           sale por arriba. La banda activa es el viewport entero. */
        const raw = (vh - r.top) / (vh + r.height);
        const p = Math.max(0, Math.min(1, raw));
        el.style.setProperty("--p", p.toFixed(3));
      }
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        rafId = requestAnimationFrame(compute);
        ticking = true;
      }
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", compute);
      cancelAnimationFrame(rafId);
    };
  }, []);

  /* ── Count-up para las stats del hero ──────────────────────────
   *    Cada stat declara su valor numérico vía data-count + sufijo opcional.
   *    Animación con requestAnimationFrame, easing ease-out-expo manual.
   *    Sólo cuando entra al viewport. Reducido por prefers-reduced-motion. */
  const heroStatsRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = heroStatsRef.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const animate = (node: HTMLElement) => {
      const target = Number(node.dataset.count || 0);
      const suffix = node.dataset.suffix || "";
      if (reduce) { node.textContent = `${target}${suffix}`; return; }

      const duration = 1400;
      const start = performance.now();
      const ease = (t: number) => 1 - Math.pow(2, -10 * t); // out-expo
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const v = Math.round(target * ease(t));
        node.textContent = `${v}${suffix}`;
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const obs = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            el.querySelectorAll<HTMLElement>("[data-count]").forEach(animate);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <Box className="bd-root">
      {/* ── Marquee superior (D) ─────────────────────────────── */}
      <div className="bd-marquee" aria-hidden>
        <div className="bd-marquee-track">
          {[...marqueeItems, ...marqueeItems, ...marqueeItems].map((it, i) => (
            <span key={i}>{it}</span>
          ))}
        </div>
      </div>

      {/* ── Nav flotante pill (B) ────────────────────────────── */}
      <nav className="bd-nav" aria-label="Navegación principal">
        <a href="#cap1">I. Tesis</a>
        <a href="#cap2">II. Cómo</a>
        <a href="#cap3">III. Demo</a>
        <a className="bd-nav-cta" onClick={() => navigate("/login")}>Empezar →</a>
      </nav>

      {/* ════════════ CAPÍTULO I — HERO ════════════════════════ */}
      <section id="cap1" className="bd-hero" data-scroll-parallax>
        {/* Ambient document fragments (B) */}
        <div className="bd-ambient" aria-hidden>
          <span style={{ top: "16%", left: "6%",  ["--rot" as never]: "-4deg" }}>[1] cláusula 4 vacaciones</span>
          <span style={{ top: "28%", right: "8%", ["--rot" as never]: "3deg"  }}>[2] manual cap. 7</span>
          <span style={{ top: "58%", left: "10%", ["--rot" as never]: "-2deg" }}>[3] política teletrabajo</span>
          <span style={{ top: "72%", right: "6%", ["--rot" as never]: "5deg"  }}>[4] convenio anexo III</span>
          <span style={{ top: "44%", left: "38%", ["--rot" as never]: "-3deg" }}>[5] plan compensación Q2</span>
          <span style={{ top: "82%", left: "32%", ["--rot" as never]: "2deg"  }}>[6] manual onboarding</span>
        </div>

        <div className="bd-chapter-mark">
          <span className="bd-roman">I</span>
          <span>Tesis del producto</span>
        </div>

        <div className="bd-hero-grid">
          <div className="bd-hero-left">
            <span className="bd-pill">
              <em className="dot" /> Motor RAG · v0.2 en producción
            </span>

            <h1 className="bd-h1">
              <span className="bd-h1-l1">Cada respuesta</span>
              <span className="bd-h1-l2"><em>trae</em> consigo</span>
              <span className="bd-h1-l3">su fuente.</span>
            </h1>

            <p className="bd-lede">
              Xtask es la primera plataforma empresarial donde el asistente de IA no inventa: cada afirmación nace de una política, contrato o métrica del tenant, con sección y fecha de ingestión visibles.
            </p>

            <div className="bd-cta-row">
              <button className="bd-btn bd-btn-primary" onClick={() => navigate("/login")}>
                Empezar el piloto <span className="arr">→</span>
              </button>
              <a className="bd-btn bd-btn-outline" href="#cap3">Ver demo en vivo</a>
            </div>

            <p className="bd-hint">Sin tarjeta · piloto gratis 30 días · soporte en español</p>
          </div>

          {/* ── Demo card live (D) ────────────────────────────── */}
          <div className="bd-demo reveal-scale">
            <div className="bd-demo-bar">
              <span className="d"></span><span className="d"></span><span className="d"></span>
              <span className="url">app.xtask.io / asistente</span>
              <span className="status">live</span>
            </div>
            <div className="bd-demo-body">
              <div className="bd-demo-q">
                <span className="av">M</span>
                <span className="q-text">{typed}<i className="caret" /></span>
                <kbd>↵</kbd>
              </div>

              <div className="bd-demo-a">
                <span className="av-bot">X</span>
                <div className="a-body">
                  <p dangerouslySetInnerHTML={{
                    __html: demoConvos[convoIdx].a.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                  }} />
                  <p className="a-label">Fuentes citadas en el corpus del tenant</p>
                  <div className="cite-row">
                    {demoConvos[convoIdx].cites.map((c) => (
                      <span key={c} className="cite-pill"><em /> {c}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bd-demo-foot">
                <span>RAG · {demoConvos[convoIdx].cites.length} fuentes</span>
                <span>0.4s</span>
                <span>tenant: andorra-acme</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bd-hero-stats reveal-stagger" ref={heroStatsRef}>
          <div style={{ ['--i' as string]: 0 }}>
            <span className="v" data-count="500" data-suffix="+">0</span>
            <span className="l">empresas piloto</span>
          </div>
          <div style={{ ['--i' as string]: 1 }}>
            <span className="v" data-count="22">0</span>
            <span className="l">países activos</span>
          </div>
          <div style={{ ['--i' as string]: 2 }}>
            <span className="v" data-count="98" data-suffix="%">0</span>
            <span className="l">satisfacción cliente</span>
          </div>
          <div style={{ ['--i' as string]: 3 }}>
            <span className="v" data-count="0">0</span>
            <span className="l">respuestas sin fuente</span>
          </div>
        </div>

        <div className="bd-scroll-cue">Cap. II ↓</div>
      </section>

      {/* ════════════ CAPÍTULO II — CÓMO FUNCIONA ═══════════════ */}
      <section id="cap2" className="bd-cap bd-stack alt-warm">
        <div className="bd-cap-grid">
          <aside className="bd-cap-side reveal-rise">
            <span className="bd-roman">II</span>
            <h2 className="bd-cap-title">El producto que <em>opera</em> tu equipo, no tu ingeniería.</h2>
            <p className="bd-cap-sub">Tres pasos. El equipo técnico aparece sólo la primera vez para conectar la fuente de documentos.</p>
          </aside>

          <div className="bd-cap-body reveal-stagger">
            {[
              { tag: "Primero",    title: "Conecta tu corpus",                       desc: "Sube manuales, políticas, contratos. O conecta Google Drive y el motor sincroniza solo. Indexado en minutos." },
              { tag: "Después",    title: "Tu equipo pregunta en lenguaje natural", desc: "Desde Slack, móvil o el portal. Español neutro, catalán y portugués. Respuesta con cita a la sección exacta." },
              { tag: "Finalmente", title: "Genera documentos con trazabilidad",     desc: "Contratos y certificados se generan combinando plantillas con datos del empleado. Cada uno conserva las fuentes que lo respaldan." },
            ].map((s, idx) => (
              <div
                key={s.tag}
                className="bd-step"
                data-scroll-pan
                style={{ ['--i' as string]: idx, ['--pan' as string]: `${80 + idx * 40}px` } as React.CSSProperties}
              >
                <span className="bd-step-tag">{s.tag}</span>
                <div>
                  <h3 className="bd-step-title">{s.title}</h3>
                  <p className="bd-step-desc">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ CAPÍTULO III — TABBED PRODUCT (D) ═══════ */}
      <section id="cap3" className="bd-cap bd-stack">
        <div className="bd-cap-header reveal-rise">
          <span className="bd-roman">III</span>
          <h2 className="bd-cap-title-big" data-scroll-scale>
            El producto, <em>en vivo</em>.<br/>
            Cambia de pestaña.
          </h2>
        </div>

        <div className="bd-tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`bd-tab ${activeTab === t.id ? "is-active" : ""}`}
              onClick={() => setActiveTab(t.id)}
            >
              <span className="bd-tab-kick">{t.kicker}</span>
              <span className="bd-tab-label">{t.label}</span>
            </button>
          ))}
        </div>

        <div className="bd-tab-stage">
          {/* Stage Copilot RAG */}
          <div className={`bd-stage ${activeTab === "rag" ? "is-active" : ""}`}>
            <div className="bd-mock bd-mock-chat">
              <div className="bd-mock-bar"><span></span><span></span><span></span><span className="t">/asistente</span></div>
              <div className="bd-mock-body">
                <div className="bd-bubble user">¿Qué cláusula aplica si Ana se enferma 2 días?</div>
                <div className="bd-bubble bot">
                  <strong>Aplica la cláusula 12 del manual.</strong> Los primeros 3 días son cubiertos al 100% por la empresa sin justificación médica; a partir del cuarto requiere certificado.
                  <div className="bd-bubble-cites">
                    <span className="bp">Manual del empleado · §12.1</span>
                    <span className="bp">Convenio · art. 47</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="bd-mock-desc">
              <h3>Respuestas que se pueden auditar.</h3>
              <p>El copiloto consulta tu corpus, recupera los fragmentos relevantes y los cita textualmente. Si no hay fuente, lo dice — nunca inventa.</p>
              <ul className="bd-mock-feats">
                <li>Aislamiento por <code>tenant_id</code> forzado en cada query</li>
                <li>Embeddings con <code>pgvector</code> sobre PostgreSQL 15</li>
                <li>Historial conversacional con citaciones persistentes</li>
              </ul>
            </div>
          </div>

          {/* Stage OKRs en cascada */}
          <div className={`bd-stage ${activeTab === "okr" ? "is-active" : ""}`}>
            <div className="bd-mock bd-mock-okr">
              <div className="bd-okr-row top">
                <span className="bd-okr-lvl">Empresa</span>
                <span className="bd-okr-name">Crecer ingresos LATAM 30%</span>
                <span className="bd-okr-bar"><i style={{width:"72%"}} /></span>
                <span className="bd-okr-pct">72%</span>
              </div>
              <div className="bd-okr-row mid">
                <span className="bd-okr-lvl">Equipo · Ventas</span>
                <span className="bd-okr-name">Cerrar 18 clientes piloto</span>
                <span className="bd-okr-bar"><i style={{width:"83%"}} /></span>
                <span className="bd-okr-pct">83%</span>
              </div>
              <div className="bd-okr-row leaf">
                <span className="bd-okr-lvl">Individuo · Marco</span>
                <span className="bd-okr-name">Lanzamientos Q2 (12 releases)</span>
                <span className="bd-okr-bar"><i style={{width:"108%"}} /></span>
                <span className="bd-okr-pct done">108%</span>
              </div>
            </div>
            <div className="bd-mock-desc">
              <h3>OKRs que se cascadean solos.</h3>
              <p>Cumplir el objetivo de un equipo recalcula el del manager y el de la empresa. Sin spreadsheets, sin reuniones de actualización.</p>
              <ul className="bd-mock-feats">
                <li>Ingesta de mediciones desde GitHub, CRM, hojas externas</li>
                <li>Cálculo automático de <code>actual_value</code> y <code>status</code></li>
                <li>Comisión calculada al cumplirse el target</li>
              </ul>
            </div>
          </div>

          {/* Stage Contratos generados */}
          <div className={`bd-stage ${activeTab === "contracts" ? "is-active" : ""}`}>
            <div className="bd-mock bd-mock-doc">
              <p className="bd-doc-h">CONTRATO · Ana García Martínez</p>
              <p className="bd-doc-clause">Cláusula 4 — Vacaciones</p>
              <p className="bd-doc-text">
                La empleada disfrutará de <strong>22 días hábiles</strong> anuales, ampliables a <strong>25</strong> tras cinco años<sup>[1]</sup>. Solicitudes con quince días de antelación<sup>[2]</sup>.
              </p>
              <p className="bd-doc-clause">Cláusula 5 — Teletrabajo</p>
              <p className="bd-doc-text">
                Hasta 3 días de teletrabajo semanal<sup>[3]</sup>, manteniendo presencialidad los martes y jueves.
              </p>
              <div className="bd-doc-sources">
                <span className="bp">[1] Política vacaciones · §2.1</span>
                <span className="bp">[2] Manual del empleado · §7</span>
                <span className="bp">[3] Política teletrabajo · §1.3</span>
              </div>
            </div>
            <div className="bd-mock-desc">
              <h3>Contratos que se justifican solos.</h3>
              <p>Plantillas + datos del empleado + corpus de políticas → contrato firmado con cada cláusula citada. Auditoría futura sin reconstrucción manual.</p>
              <ul className="bd-mock-feats">
                <li>Plantillas Jinja2 con placeholders tipados</li>
                <li>RAG inyecta fuentes en cada cláusula generada</li>
                <li>Firma electrónica nativa (Q3) o DocuSign bridge</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ FEATURES 2x2 — mockups embebidos ══════════ */}
      <section className="bd-cap bd-stack alt-surface">
        <div className="bd-cap-header reveal-rise">
          <span className="bd-roman">·</span>
          <h2 className="bd-cap-title-big" data-scroll-scale>
            Cuatro decisiones <em>tomadas</em>.
          </h2>
          <p className="bd-cap-sub" style={{ marginTop: 14, maxWidth: "62ch" }}>
            No te las pasamos como configuración futura. Vienen resueltas desde el primer día porque sin ellas no hay empresa que pueda usar IA en serio.
          </p>
        </div>

        <div className="bd-feats">
          {/* A — Multi-tenant */}
          <div className="bd-feat">
            <div className="bd-feat-head">
              <h3>Multi-tenant aislado por defecto</h3>
              <p>Cada cliente es un realm Keycloak con sus usuarios, sus permisos, su corpus y sus claves. La query nunca cruza la frontera del <code>tenant_id</code>.</p>
            </div>
            <div className="bd-feat-visual">
              <div className="bd-feat-tenants">
                <div className="bd-tenant-cell" data-label="ACME">
                  <div className="bd-tenant-bar" style={{ width: "70%" }} />
                  <div className="bd-tenant-bar" style={{ width: "45%" }} />
                  <div className="bd-tenant-bar" style={{ width: "60%" }} />
                </div>
                <div className="bd-tenant-cell tenant-active" data-label="GLOBEX">
                  <div className="bd-tenant-bar" style={{ width: "85%" }} />
                  <div className="bd-tenant-bar" style={{ width: "55%" }} />
                  <div className="bd-tenant-bar" style={{ width: "72%" }} />
                </div>
                <div className="bd-tenant-cell" data-label="INITECH">
                  <div className="bd-tenant-bar" style={{ width: "62%" }} />
                  <div className="bd-tenant-bar" style={{ width: "38%" }} />
                  <div className="bd-tenant-bar" style={{ width: "50%" }} />
                </div>
              </div>
            </div>
          </div>

          {/* B — RAG con citas */}
          <div className="bd-feat">
            <div className="bd-feat-head">
              <h3>Respuestas que citan su fuente</h3>
              <p>El copiloto recupera fragmentos relevantes del corpus y los muestra textualmente. Si la fuente no existe, lo dice — nunca inventa.</p>
            </div>
            <div className="bd-feat-visual">
              <div className="bd-feat-chat">
                <div className="bd-fb user">¿Vacaciones para Ana con 6 años de antigüedad?</div>
                <div className="bd-fb bot">
                  <strong>25 días hábiles.</strong> Los 22 base más 3 adicionales por superar los 5 años.
                  <div className="bd-bubble-cites" style={{ marginTop: 8 }}>
                    <span className="bp">Política vacaciones · §2.1</span>
                    <span className="bp">Convenio · cl. 14</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* C — Workflow automatizado (SVG animado) */}
          <div className="bd-feat">
            <div className="bd-feat-head">
              <h3>Workflows que orquestan el resto</h3>
              <p>Conectado con n8n: cada release dispara ingesta, los KPIs se miden solos, el copiloto se prueba antes de salir a producción.</p>
            </div>
            <div className="bd-feat-visual">
              <svg className="bd-workflow bd-feat-flow" viewBox="0 0 480 160" aria-hidden>
                {/* lines */}
                <path className="bd-wf-line" d="M60 80 L180 80" />
                <path className="bd-wf-line" d="M220 80 L340 80" />
                <path className="bd-wf-line" d="M380 80 L440 40" />
                <path className="bd-wf-line" d="M380 80 L440 120" />
                {/* node pulses */}
                <circle className="bd-wf-node-pulse" cx="60" cy="80" r="18" />
                <circle className="bd-wf-node-pulse delay-1" cx="200" cy="80" r="18" />
                <circle className="bd-wf-node-pulse delay-2" cx="360" cy="80" r="18" />
                {/* nodes */}
                <circle className="bd-wf-node is-active" cx="60" cy="80" r="14" />
                <circle className="bd-wf-node" cx="200" cy="80" r="14" />
                <circle className="bd-wf-node" cx="360" cy="80" r="14" />
                <circle className="bd-wf-node" cx="440" cy="40" r="10" />
                <circle className="bd-wf-node" cx="440" cy="120" r="10" />
                {/* labels */}
                <text className="bd-wf-label" x="60" y="115" textAnchor="middle">trigger</text>
                <text className="bd-wf-label" x="200" y="115" textAnchor="middle">ingesta</text>
                <text className="bd-wf-label" x="360" y="115" textAnchor="middle">KPI</text>
                {/* particles que viajan */}
                <circle className="bd-wf-data delay-a" cx="0" cy="80" r="3.5">
                  <animate attributeName="cx" from="60" to="200" dur="3.6s" repeatCount="indefinite" />
                </circle>
                <circle className="bd-wf-data delay-b" cx="0" cy="80" r="3.5">
                  <animate attributeName="cx" from="200" to="360" dur="3.6s" repeatCount="indefinite" />
                </circle>
              </svg>
            </div>
          </div>

          {/* D — Deploy donde quieras */}
          <div className="bd-feat">
            <div className="bd-feat-head">
              <h3>Corre donde tu cliente exija</h3>
              <p>Docker Compose para piloto, Helm para producción cloud, on-prem aislado para clientes con cumplimiento estricto. La misma imagen, las mismas migraciones.</p>
            </div>
            <div className="bd-feat-visual">
              <div className="bd-feat-deploy">
                <div className="bd-deploy-chip"><span className="k" /> docker compose</div>
                <div className="bd-deploy-chip is-primary"><span className="k" /> helm install</div>
                <div className="bd-deploy-chip"><span className="k" /> on-prem k3s</div>
                <div className="bd-deploy-chip"><span className="k" /> EKS · GKE</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ CAPÍTULO IV — RESULTADOS ═════════════════ */}
      <section className="bd-cap bd-cap-results bd-stack">
        <div className="bd-cap-header reveal-rise">
          <span className="bd-roman">IV</span>
          <h2 className="bd-cap-title-big" data-scroll-scale>
            Resultados que <em>medimos</em>,<br/>
            no que prometemos.
          </h2>
        </div>

        <div className="bd-results reveal-stagger">
          {[
            { v: "40%", l: "Aumento en productividad", s: "Primeros 6 meses" },
            { v: "60%", l: "Reducción de tiempo",      s: "Procesos manuales" },
            { v: "25%", l: "Reducción de costos",      s: "Optimización de recursos" },
          ].map((r, idx) => (
            <div key={r.v} className="bd-result" style={{ ['--i' as string]: idx }}>
              <span className="bd-result-v">{r.v}</span>
              <span className="bd-result-l">{r.l}</span>
              <span className="bd-result-s">{r.s}</span>
            </div>
          ))}
        </div>
        <p className="bd-results-foot">Promedio sobre 67 clientes piloto durante 2026, medido tras 6 meses de uso.</p>
      </section>

      {/* ════════════ SECTORES — marquee dual ═══════════════════ */}
      <section className="bd-cap bd-cap-sectors bd-stack alt-surface">
        <div className="bd-cap-header reveal-rise">
          <h2 className="bd-cap-title-big" data-scroll-scale>
            Sectores que <em>cuentan</em> con Xtask.
          </h2>
          <p className="bd-cap-sub" style={{ marginTop: 14, maxWidth: "62ch" }}>
            Más de 800 organizaciones operativas en doce verticales. El motor RAG se adapta al léxico del sector — convenio colectivo no es lo mismo que protocolo clínico.
          </p>
        </div>

        <div className="bd-sect-wrap" aria-hidden>
          {/* Fila 1: izquierda → derecha. Items duplicados para loop sin costura */}
          <div className="bd-sect-row">
            {[...sectors.slice(0, 6), ...sectors.slice(0, 6)].map((s, i) => (
              <div key={`r1-${i}`} className="bd-sect-card">
                <span className="bd-sect-ico">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    {sectorIcon(s.icon)}
                  </svg>
                </span>
                <span className="bd-sect-meta">
                  <span className="n">{s.name}</span>
                  <span className="c">{s.count}</span>
                </span>
              </div>
            ))}
          </div>
          {/* Fila 2: derecha → izquierda (animation-direction reverse en CSS) */}
          <div className="bd-sect-row">
            {[...sectors.slice(6), ...sectors.slice(6)].map((s, i) => (
              <div key={`r2-${i}`} className="bd-sect-card">
                <span className="bd-sect-ico">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    {sectorIcon(s.icon)}
                  </svg>
                </span>
                <span className="bd-sect-meta">
                  <span className="n">{s.name}</span>
                  <span className="c">{s.count}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ CAPÍTULO VI — CTA FINAL ══════════════════ */}
      <section className="bd-cap bd-cap-final bd-stack alt-warm">
        <div className="bd-final-inner reveal-rise">
          <span className="bd-final-pill"><em /> Demo gratuita · 30 días</span>
          <h2 className="bd-final-h">
            ¿Listo para que tu IA<br/>
            <em>cite</em> sus fuentes?
          </h2>
          <p className="bd-final-sub">
            Veinte minutos con nuestro equipo. Te enseñamos Xtask cargado con tus propias políticas y dejamos un piloto activo de 30 días con tu corpus real.
          </p>
          <div className="bd-cta-row centered">
            <button className="bd-btn bd-btn-primary lg" onClick={() => navigate("/login")}>
              Solicitar demo <span className="arr">→</span>
            </button>
            <a className="bd-btn bd-btn-outline lg" href="mailto:contacto@xtask.co">Escribir al equipo</a>
          </div>
        </div>
      </section>

      {/* ════════════ FOOTER ═══════════════════════════════════ */}
      <footer className="bd-foot">
        <div className="bd-foot-inner">

          <div className="bd-foot-top">
            <div className="bd-foot-brand">
              <div className="bd-foot-logo">
                <XtaskMark size={28} color="#02BDEA" />
                <span style={{ fontFamily: "'Bermont', 'Gilroy', sans-serif", fontWeight: 700, letterSpacing: "-0.025em" }}>task</span>
              </div>
              <p>Plataforma empresarial con motor de IA nativo. Construida en Andorra, pensada para Iberoamérica.</p>
              <div className="bd-foot-social">
                <a href="mailto:contacto@xtask.co" aria-label="Email">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M3 7l9 6 9-6" />
                  </svg>
                </a>
              </div>
            </div>

            <div className="bd-foot-col">
              <h5>Producto</h5>
              <a href="#cap1">Tesis</a>
              <a href="#cap2">Cómo funciona</a>
              <a href="#cap3">Demo en vivo</a>
            </div>

            <div className="bd-foot-col">
              <h5>Contacto</h5>
              <a href="mailto:contacto@xtask.co">contacto@xtask.co</a>
            </div>
          </div>

          <div className="bd-foot-bot">
            <span className="region"><span className="dot" />© 2026 Xtask · Andorra la Vella · Bogotá</span>
          </div>

        </div>
      </footer>
    </Box>
  );
}
