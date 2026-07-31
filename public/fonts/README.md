# Fuentes Xtask

El brandbook especifica dos familias:

- **Gilroy** — UI, body, headings
- **Bermont Regular** — display, titulares cortos

Estas fuentes son comerciales y no pueden distribuirse vía npm.
Hay que descargar los archivos a mano y colocarlos en este directorio.

## Cómo agregar las fuentes

### 1. Descargar

URLs que el brandbook indica:

- https://www.dafontfree.io/download/gilroytypefamily/
- https://www.dafontfree.io/download/bermont/

> ⚠ Estos sitios distribuyen versiones comunitarias. Para producción real
> conviene comprar la licencia oficial (Gilroy via Radomir Tinkov / Font Spring,
> Bermont en su foundry original).

### 2. Convertir a `.woff2`

Si los archivos vienen en `.ttf` u `.otf`, convertirlos a `woff2`
(mucho menor, formato moderno):

```bash
brew install woff2
cd ~/Downloads
woff2_compress Gilroy-Light.ttf
woff2_compress Gilroy-Regular.ttf
woff2_compress Gilroy-Medium.ttf
woff2_compress Gilroy-SemiBold.ttf
woff2_compress Gilroy-Bold.ttf
woff2_compress Bermont-Regular.ttf
```

### 3. Mover acá

```bash
mv Gilroy-*.woff2 Bermont-*.woff2 \
  "Aplicativos Xkape para Andorra/Xtask/Frontend_Xtask/public/fonts/"
```

Estructura esperada:

```
public/fonts/
├── README.md
├── Gilroy-Light.woff2        (300)
├── Gilroy-Regular.woff2      (400)
├── Gilroy-Medium.woff2       (500)
├── Gilroy-SemiBold.woff2     (600)
├── Gilroy-Bold.woff2         (700)
└── Bermont-Regular.woff2     (400)
```

### 4. Listo

Las declaraciones `@font-face` ya están en `src/styles/brand-fonts.css`.
Cargan los archivos con `font-display: swap` — si no están presentes el
navegador cae al stack `'Inter', system-ui, sans-serif` y la app sigue
funcionando.

## Mientras no estén los archivos

La app usa `Inter` (de Google Fonts) como fallback. Visualmente queda muy
cerca de Gilroy — geométrica, abierta, parecida proporción. No es idéntico
pero es la sustitución libre más fiel.
