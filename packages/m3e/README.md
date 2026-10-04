# @cavulsqa/m3e

The Material 3 Expressive core, without a framework: the 2025-spec colour scheme, all 35 shapes
of the shape library with morphing, the spring motion system, the wavy progress geometry, the
loading indicator, and every system token as CSS custom properties.

Numbers come from Google's own sources (androidx Compose token files, `MaterialShapes.kt`,
`LoadingIndicator.kt`, `WavyProgressIndicator.kt`) and the rendered spec pages, not from memory.
Vue components built on it live in [`@cavulsqa/m3e-vue`](../m3e-vue).

## Tokens

Two stylesheets, each one string you put in one `<style>` element before the app mounts:

```ts
import { colorStylesheet, systemStylesheet } from "@cavulsqa/m3e";

style.textContent =
  systemStylesheet() +
  colorStylesheet({ seed: "#6750a4", variant: "expressive", extras: { success: "#1c7a4a" } });
```

| Prefix                      | What                                                                                   |
| --------------------------- | -------------------------------------------------------------------------------------- |
| `--md-sys-color-*`          | Every M3 role, light under `:root` and dark under `:root.dark`; dark mode is one class |
| `--md-sys-shape-corner-*`   | `none` … `extra-extra-large`, `full`, including the expressive `*-increased` steps     |
| `--md-sys-typescale-*`      | Baseline and `emphasized-*` styles, in `rem` so they follow the user's text size       |
| `--md-sys-motion-spring-*`  | Spatial springs as `linear()` curves that keep their overshoot; effects as beziers     |
| `--md-sys-motion-easing-*`  | The legacy easing and duration tokens, still used for transitions                      |
| `--md-sys-elevation-level*` | Shadows for levels 0-5                                                                 |
| `--md-sys-state-*-opacity`  | State-layer opacities                                                                  |

Under `prefers-reduced-motion`, spatial springs collapse to 1 ms (not 0, which suppresses
`transitionend`) and effects keep their timing.

## Colour

`createScheme` and `resolveRoles` wrap `@material/material-color-utilities`. Two traps it makes
explicit:

- The 2025 (Expressive) rules apply only to `tonalSpot`, `neutral`, `vibrant` and `expressive`.
  Every other variant falls back to 2021 silently; `effectiveSpec(variant)` says which you got.
- `brand` keeps the seed exact as `primaryContainer` (Theme Builder's "Match color"), and is
  therefore on the 2021 rules.

Custom colours (`extras`) are harmonised toward the seed and generated under the 2025 rules, each
publishing `X`, `on-X`, `X-container`, `on-X-container`.

## Shapes and morphing

```ts
import { materialShapeMask, createShapeMorph } from "@cavulsqa/m3e";

el.style.maskImage = materialShapeMask("cookie9Sided");
const morph = createShapeMorph("pill", "sunny");
path.setAttribute("d", morph.at(springValue, true));
```

Shapes are built with a port of androidx graphics-shapes' `RoundedPolygon`. Morphing samples both
outlines evenly by length from the same start angle and interpolates point to point; Compose's
`Morph` pairs corner features first. On the rounded shapes the two are visually the same.

## Motion

`MOTION_SCHEMES.expressive` holds the six spring tokens (damping, stiffness, the official web
duration and bezier). `springState` is the closed form with velocity, `animateSpring` drives one on
animation frames and can be retargeted mid-flight without a jump - use it for anything a gesture
starts or that can be interrupted.

## Node

`@material/material-color-utilities@0.4.0` ships one file with an extensionless import, so its
colour code loads in bundlers but not in Node's ESM loader. Tests inline it
(`test.server.deps.inline`); an app bundled by Vite needs nothing.
