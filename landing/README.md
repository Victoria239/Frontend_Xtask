# Landing page de XTask

Página de marketing standalone que se sirve en el dominio raíz (`xtask.io` o `xtask.app`). Es independiente del SPA de la aplicación (`app.xtask.io`), construido en React/Vite.

## Estilos aplicados

- **Emil Kowalski (design engineering)** — pure black, Geist Sans, kerning negativo (-0.045em en H1), halo radial sutil en hero, transiciones con `cubic-bezier(0.32, 0.72, 0, 1)`, 1px borders, single accent indigo `#7B7DFB`, italic en palabras clave del titular.
- **Impeccable** — grid de 8pt, escala tipográfica geométrica (12 → 14 → 16 → 20 → 24 → 32 → 48 → 80), sentence case en todo, jerarquía visual estricta, alineación pixel-perfect, espaciado generoso (140px de padding vertical por sección).

## Estructura

```
landing/
├── index.html       Página completa con CSS embebido (zero deps)
└── README.md        Este archivo
```

Sin frameworks, sin bundler, sin dependencias externas más allá de Google Fonts (Geist + Geist Mono + Inter como fallback). Pesa ~32 KB.

## Despliegue en Netlify

### Opción A — Sitio Netlify dedicado para el dominio raíz (recomendado)

1. Crear un sitio nuevo en Netlify apuntando a este directorio (`Frontend_Xtask/landing/`).
2. **Build settings**:
   - Base directory: `Frontend_Xtask/landing`
   - Build command: *(vacío — es HTML estático)*
   - Publish directory: `Frontend_Xtask/landing`
3. **Custom domain**: `xtask.io` (o el que se decida) en este sitio.
4. El SPA del producto sigue desplegándose en otro sitio Netlify bajo `app.xtask.io` con su propio `netlify.toml`.

### Opción B — Compartir Netlify con el SPA

Si se prefiere un único sitio Netlify:

1. Modificar el build del SPA para que copie `landing/index.html` a `dist/index.html` antes del bundle (renombrar el `index.html` original del SPA a `app.html` o mover el SPA a `/app/*`).
2. Ajustar el `netlify.toml` del frontend con redirects que apunten `/app/*` al SPA y todo lo demás al `landing/index.html`.

> **Recomendación**: Opción A. Mantiene clara la separación entre marketing y producto, permite que el SPA tenga su propia política de cache agresiva sin afectar SEO de la landing, y permite que un equipo de marketing edite la landing sin tocar el repo del producto.

## Variables de entorno

Ninguna. Es HTML estático.

Si en algún momento se añade analítica (Plausible, Pirsch, Posthog), inyectar el script vía Netlify Snippet Injection — no hardcodearlo en el HTML.

## Performance

- Lighthouse Performance: ≥ 98 (sin JS pesado, sin imágenes grandes, fonts con `display=swap`).
- Lighthouse Accessibility: ≥ 95 (estructura semántica, `sr-only` para el resumen, `aria-label` en navegación, contraste WCAG AA en todo).
- Tamaño total: ~32 KB HTML + ~80 KB de fuentes (Geist Sans + Mono) en primera carga.

## Edición rápida

Los textos están en español neutro. Cambios típicos:

| Cambio | Dónde |
|---|---|
| Titular del hero | `<h1>` dentro de `.hero-inner` |
| Lede (subtítulo) | `<p class="lede">` |
| Pill de versión | `<a class="pill">` → contenido del span |
| Precios | `<div class="pricing">` → cada `.tier` |
| Países del trust strip | `<div class="trust-row">` → `.trust-item` |
| Email de contacto | `<a href="mailto:hola@xtask.io">` |
| URL del SPA en login | `<a href="https://app.xtask.io">` |

## SEO

Open Graph y Twitter Card no están añadidos todavía. Antes de ir a producción:

1. Crear una imagen OG de 1200×630 px (`og.png`) y subirla al directorio.
2. Añadir en `<head>`:

```html
<meta property="og:title" content="XTask — Plataforma empresarial con IA nativa">
<meta property="og:description" content="HRM, compensación y ERP con IA que responde con citas de tus propias políticas.">
<meta property="og:image" content="https://xtask.io/og.png">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
```

3. Añadir `sitemap.xml` y `robots.txt` antes del go-live.

## Roadmap de la landing

- [ ] Versión inglés (`/en/`) para el mercado UE no hispanohablante
- [ ] Página `/changelog` con los releases
- [ ] Página `/docs` con la documentación de la API
- [ ] Página `/security` con la postura de seguridad (GDPR, Habeas Data, próximo SOC 2)
- [ ] Página `/precios` standalone con calculadora interactiva
- [ ] Integración con CRM (HubSpot / Pipedrive) en el formulario de demo
