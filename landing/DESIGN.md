# Design

## Theme

Dark base committed. La página vive en negro casi puro porque el producto es trazabilidad documental y el contraste extremo amplifica la legibilidad de las "citas" en los componentes. No es el negro "AI-tool" — no hay halos radiales, no hay gradients indigo, no hay ⌘K. El negro aquí es el papel.

## Color

Estrategia: **Committed** — un acento saturado (warm sienna, refinado) carga el 30-50% de la atención visual, contra el negro de fondo. Anti-default a propósito: ni el indigo Linear, ni el violeta Vercel, ni el verde terminal.

```css
--bg:        #0A0A0A;     /* near-black, no warm tint */
--surface:   #131313;     /* one step lighter */
--rule:      #1F1F1F;     /* hairlines */
--ink:       #F4F2EE;     /* off-white, slight warmth */
--text-2:    #A8A29B;     /* muted body */
--text-3:    #6B645C;     /* meta */
--accent:    #C76A3F;     /* warm sienna, the "ink stamp" of citations */
--accent-d:  #5C2E18;     /* deep accent for backgrounds */
```

Contraste verificado: `--text-2` (#A8A29B) sobre `--bg` (#0A0A0A) = 8.4:1 (cumple ≥4.5:1 para body).

## Typography

Estrategia: **una sola familia con contrastes de peso fuertes**. Geist Sans queda — es la workhorse, no es la reflex-reject `Inter`/`DM Sans`. Geist Mono solo en versión y URL real.

- H1: clamp(48px, 7vw, 88px), weight 500, letter-spacing -0.025em, line-height 1.02, text-wrap balance
- H2: clamp(32px, 4vw, 48px), weight 500, letter-spacing -0.02em, line-height 1.08
- H3: 18px, weight 500, letter-spacing -0.01em
- Body: 16px, weight 400, line-height 1.55, color text-2
- Meta: 13px, weight 400, color text-3
- Mono: solo `v0.2`, URL real del producto, números de versión

Escala modular 1.333 ratio. Sin small-caps. Sin uppercase decorativo.

## Components

### Buttons
- Primary: ink background + bg color. Active scale 0.97. Transition 160ms ease-out.
- Outline: 1px ink/30, hover bumps to ink/60.
- Ghost: solo color, hover sutil.
- Todos: padding 11/22 (sm), 14/26 (lg). Border-radius 8px.

### Cards
- Border-radius 12px (no 16-32px overround).
- Border 1px `--rule`. Sin shadows decorativos.
- Padding 28/32px en interno.

### Pricing tiers
- Tres tiers. El featured tiene border-color accent (no fill, no glow halos).
- "Recomendado" como pequeño texto con punto sienna, no badge floatante.

### Numbered steps
- En línea con el heading ("Primero, segundo, tercero" en palabras, no 01/02/03).
- Si se usa cifra, queda en `font-variant-numeric: tabular-nums` dentro del propio párrafo.

## Layout

- Container: max-width 1140px, padding-x clamp(24px, 4vw, 56px).
- Hero: padding-top clamp(80px, 12vw, 160px). Single-purpose: solo headline + lede + CTA. El preview baja a su propia sección.
- Sections: padding-y clamp(80px, 10vw, 140px). Rhythm asimétrico (cómo funciona más compacto, pricing más amplio).
- Grid de features: asimétrico. Una destacada + dos menores. No 3-up identical.

## Motion

- `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` — strong, para entradas
- `--ease-press: cubic-bezier(0.32, 0.72, 0, 1)` — Emil's drawer, para press feedback
- `--ease-move: cubic-bezier(0.77, 0, 0.175, 1)` — strong in-out, para hover bumps
- Buttons: 160ms ease-press, scale 0.97 on active
- Cards hover: 200ms ease-out, border-color shift solo
- Stagger en features y pricing: 60ms entre items, max 4 items
- `@starting-style` para entradas, no class-toggled gates
- `prefers-reduced-motion`: crossfade instant, sin transforms

## Imagery

Pendiente Q2: foto editorial de un despacho con archivo físico, o una composición tipográfica con extractos de contrato real. Por ahora, el preview muestra un **contrato generado con citas marginales** (CSS-rendered, sin imagen externa). No bullet points decorativos.

## What this is not

- No halos radiales en el hero (era reflex AI-tool)
- No grid background (era reflex AI-tool)
- No mono font como decoración (era reflex AI-tool)
- No ⌘K affordance (era reflex Linear)
- No chat con burbujas estilo Sonner (era reflex AI-tool)
- No gradient text (impeccable ban)
- No eyebrows en cada sección (impeccable ban)
- No 01/02/03 al estilo de docs site (impeccable ban)
- No ghost-card pattern (impeccable codex defect)
