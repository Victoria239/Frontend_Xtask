# Product

## Register

brand

## Users

Directores de operaciones, RR.HH. y finanzas en empresas de 50 a 5.000 empleados en Andorra, España, Colombia y México. Llegan a la landing buscando alternativa a FactorialHR, Spiff o Conga, presionados por una junta que pide "usar IA" sin perder control. Visitan desde el escritorio en horas de oficina, comparan tres opciones en pestañas paralelas y deciden si pedir demo en menos de 90 segundos.

## Product Purpose

XTask es la plataforma empresarial que **responde con las políticas del cliente, no con conocimiento genérico de internet**. Integra HRM, compensación variable y gestión documental con un motor RAG nativo que cita la fuente exacta en cada respuesta. El éxito de la landing se mide en demos agendadas con cuentas que ya tienen un caso de compliance o auditoría que las obliga a la trazabilidad.

## Brand Personality

Tres palabras: **trazable, sobrio, multilingüe**. Voz profesional sin jerga tech-bro. La página suena como un despacho de abogados que entiende de tecnología, no como un dev tool de YC. Empieza con afirmaciones de hecho, no con eslóganes. El humor no aplica; la confianza sí.

## Anti-references

- **Vercel / Linear / Cursor / v0**: la familia AI-tool oscura con halo radial, mono UI affordances (⌘K), preview con burbujas de chat estilo Sonner. XTask no se vende como herramienta de developers.
- **FactorialHR landing**: SaaS genérico con ilustración isométrica y CTA "Comienza gratis".
- **Spiff**: dashboards-screenshot que se ven igual en 50 fintech.
- **Conga / DocuSign**: corporate stock photo de manos firmando papeles.
- **Editorial-magazine (Klim/Fraunces italic + drop caps + small mono labels + columnas con líneas)**: la trampa de un nivel más profundo. XTask no es una revista.
- **Cream / sand / parchment backgrounds**: el default cálido de IA 2026. Bloqueado.

## Design Principles

1. **Cita la fuente, no la inventes**. Cada afirmación de la landing (números, comparativas, promesas) debe poder enlazarse a una fuente verificable o quitarse. Igual que el producto.
2. **Una idea por viewport**. El hero hace una cosa. La sección de cómo funciona hace otra. Sin telescopios de información apilada.
3. **Lengua antes que jerga**. Si una frase técnica funciona igual en español llano, gana la llana.
4. **Trazabilidad como estética**. El producto destaca por mostrar de dónde viene cada respuesta. La landing lo materializa visualmente — no como ilustración decorativa, sino como elemento estructural.
5. **Restraint con personalidad, no restraint por miedo**. Sin halos, sin gradient text, sin counter-incremental 01/02/03. La voz se gana con tipografía firme y composición, no con efectos.

## Accessibility & Inclusion

- WCAG 2.1 AA contraste en cuerpo (≥4.5:1) y headings grandes (≥3:1).
- `prefers-reduced-motion` respetado en todas las transiciones; alternativa de crossfade o instantáneo.
- Hover effects siempre bajo `@media (hover: hover) and (pointer: fine)` — la mitad del público B2B accede desde portátiles con trackpad pero también desde tabletas durante reuniones.
- Sentence case en todo, incluido el código de los componentes de demo, para no fatigar lectura en español.
- Soporte futuro multi-idioma: español neutro → catalán → portugués → inglés. La arquitectura HTML debe permitir traducir sin re-maquetar.
