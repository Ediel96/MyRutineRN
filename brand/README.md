# Marca MyRoutine — iconos

Identidad derivada de los tokens ya existentes en `src/theme/AppTheme.ts`.
No se introdujo ningún color nuevo.

## Concepto

Anillo de progreso al 270° con una estrella de cuatro puntas en el centro.

- El **anillo** retoma el `ProgressRing.tsx` del Pomodoro: el motivo visual que
  la app ya usa para representar una rutina en curso.
- La **estrella** es el glifo convencional de IA, y aquí es literal: el parser
  de `src/services/aiParser.ts` es lo que genera las rutinas que el anillo mide.
- El anillo abierto (no cerrado) mantiene la lectura de "en progreso" y además
  da asimetría, que es lo que hace el icono reconocible de un vistazo.

## Colores (todos son tokens existentes)

| Elemento | Token | Valor |
|---|---|---|
| Anillo (degradado) | `gradients.ai` → `brand.gradientEnd` | `#5B7FFF` → `#8B5CB8` |
| Estrella | `brand.accentWarm` | `#FCE08A` |
| Tile (degradado) | `darkColors.surfaceAlt` → `backgroundAlt` | `#2A2440` → `#1A1729` |
| Borde | `darkColors.border` | `#3A3450` |
| Radio del tile | `borderRadius.xxl` (28/64) | `rx = 112/512` |

El tile usa `surfaceAlt` en vez de `background` (`#14121F`) a propósito: el
fondo puro se fundía con la barra de pestañas oscura del navegador. El borde
`#3A3450` refuerza esa separación en los tamaños grandes.

## Archivos fuente

| Archivo | Uso |
|---|---|
| `logo.svg` | **Fuente de verdad.** Tile redondeado con borde. Web, favicon, Android legacy. |
| `logo-square.svg` | Full bleed, sin esquinas. iOS y Android aplican su propia máscara. |
| `logo-small.svg` | Variante para 16/32px (ver más abajo). |
| `logo-mark.svg` | Solo el arte, sin tile. Para uso dentro de la app o sobre otros fondos. |
| `logo-maskable.svg` | PWA `purpose: maskable`, arte al 62% central. |
| `android-{foreground,background,monochrome}.svg` | Capas del adaptive icon. |

### Por qué existe `logo-small.svg`

Por debajo de 32px el arte principal no aguanta. La variante pequeña cambia
tres cosas:

1. **Color plano** en el anillo (`#6E7DE2`) — el degradado se enturbia.
2. **Sin borde** — a 16px es subpixel y solo ensucia. La separación respecto a
   pestañas oscuras se consigue con un tile más claro (`#332B52` → `#241F3A`).
3. **Estrella más pequeña que el hueco del anillo** (144 vs 224 unidades), para
   que quede aire entre ambos en lugar de empastarse en una mancha.

## Regenerar

`build.py` (adjunto en la entrega) reconstruye todo desde los SVG. Requiere
`cairosvg` y `Pillow`. Los SVG son la fuente; los PNG no se editan a mano.

## Qué se instaló

- `ios/MyRoutineRN/Images.xcassets/AppIcon.appiconset/` — 9 PNG sin canal alfa
  (requisito de App Store) + `Contents.json` actualizado con los nombres.
- `android/app/src/main/res/mipmap-*/` — `ic_launcher` y `ic_launcher_round`
  en 5 densidades, más las capas `ic_launcher_{foreground,background,monochrome}`
  y los XML de `mipmap-anydpi-v26/`. `AndroidManifest.xml` no necesita cambios:
  ya apunta a `@mipmap/ic_launcher` / `@mipmap/ic_launcher_round`.
- `brand/web/` — favicon, apple-touch-icon, iconos PWA, `manifest.json` y
  `head-snippet.html`. **No están cableados a nada**: este es un proyecto React
  Native, no hay `index.html`. Quedan listos para una landing o un futuro PWA.

El `monochrome` habilita los themed icons de Android 13+, que adoptan el color
del wallpaper del usuario.
