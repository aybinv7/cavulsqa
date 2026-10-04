# Motion

M3 Expressive motion is physics: springs with a damping ratio and a stiffness. **Spatial** springs
move position, size, rotation and shape and may overshoot; **effects** springs change colour and
opacity and never do. Speed follows the size of what moves: **fast** for small components, **default**
for partial-screen surfaces (sheets, menus), **slow** for full-screen moves.

## The tokens

| Token                         | Expressive ζ / k            | CSS easing var                        | Duration var                    |
| ----------------------------- | --------------------------- | ------------------------------------- | ------------------------------- |
| fast spatial                  | 0.6 / 800 (≈9.5% overshoot) | `--md-sys-motion-spring-fast-spatial` | `…-fast-spatial-duration` 350ms |
| default spatial               | 0.8 / 380                   | `…-default-spatial`                   | 500ms                           |
| slow spatial                  | 0.8 / 200                   | `…-slow-spatial`                      | 650ms                           |
| fast / default / slow effects | 1.0 / 3800, 1600, 800       | `…-fast-effects` etc.                 | 150 / 200 / 300ms               |

Spatial easings are generated `linear()` curves that keep the overshoot; effects are the official
beziers. Tailwind: `ease-fast-spatial`, `ease-default-effects`… with `duration-spring-fast`,
`duration-spring-default`, `duration-spring-slow`. Legacy tokens (`--md-sys-motion-easing-emphasized-
decelerate`, `--md-sys-motion-duration-medium2`…) remain for transitions that are not physical moves:
dialogs entering, fades.

## Choosing the mechanism

- **CSS transition on a token** - state changes nobody interrupts: a toggle, a selected tab indicator,
  a chip check, a list row rounding off.
- **`animateSpring`** (`@cavulsqa/m3e`) - anything a gesture drives or that can reverse mid-flight:
  sheets, drags, interrupted opens. It carries velocity into the new target; a CSS transition restarts
  from zero and stutters.
- **`useFrame`** (`@cavulsqa/m3e-vue`) - continuous drawing (progress, loaders). One shared rAF loop;
  pause when off screen with `useInView`.
- **Vue `<Transition>` / `<TransitionGroup>`** - enter/leave of elements, with the tokens above.

## Patterns already in the app

- Page change: `m3e-axis` shared-axis X (`assets/css/layout/transitions.css`) - slide 64px on slow
  spatial, fade-through. Do not set per-route transitions.
- Press: shapes tighten on default effects (no bounce); selection reshapes on spatial.
- Enter from a FAB or anchor: scale/translate from that corner, stagger 15-30ms per item.
- Exit is always shorter than enter and accelerates.

## Rules

- Animate `transform` and `opacity`. A layout property may animate only on a small element (a button's
  padding in a group); never on a page-sized surface.
- Under reduced motion spatial durations are 1 ms (not 0 - `transitionend` must still fire); keep
  fades and morphs, drop rotation, bounce and travel. JS motion passes `instant: reduced.value`.
- Haptics accompany a confirmed state change (`useHaptics().tick()` on a toggle, `confirm()` on a
  completed action), never scrolling or hovering.

See [sources.md](sources.md) → Motion.
