---
name: m3-expressive
description: Material 3 Expressive UI in this app. Use for any screen, component, layout, animation, transition, sheet, dialog, menu, list, button, progress or loading state, colour or theme change, icon, or app-bar work - before writing markup.
---

# Material 3 Expressive

This app is Material 3 Expressive end to end. Framework7 is only the navigation engine (router, tab
views, page lifecycle); everything visible is an `M3*` component from `@cavulsqa/m3e-vue`, styled by
`--md-sys-*` tokens from `@cavulsqa/m3e`. Expressive is not decoration: shape, spring and tonal
colour say _what is happening_ - a selection rounds off, a sheet springs, progress waves while work
moves. Every number comes from Google's Compose tokens; [sources.md](sources.md) links each spec.

## Building a screen

1. **Name the job in one sentence** and the nearest Google app that does it (Messages, Photos,
   Settings, Files, Wallet). Open its pattern on m3.material.io from [sources.md](sources.md).
2. **Pick the component** from [components.md](components.md). Every visible element is an `M3*`
   component or Tailwind layout around one. Missing a component? It belongs in
   `packages/m3e-vue`, built from its spec page - not a one-off in a module.
3. **Wrap the route in `AppPage`** (`shared/components/page`): tab roots get the large flexible app
   bar, pushed pages pass `back`. Layout rules: [layout.md](layout.md).
4. **Choose shape, colour role and motion** - [shapes-type.md](shapes-type.md),
   [color.md](color.md), [motion.md](motion.md). Each decision names its token.
5. **Strings in both locales**, icons from Material Symbols (`<i-ms-name-rounded />`), filled
   variant for a selected state.
6. **Done means**: `vp check`, `pnpm type-check` and `vp test` pass; you checked light, dark, a 360dp
   width, reduced motion, and RTL by reasoning or on screen; and you said plainly whether you saw it
   run. Type-checking proves nothing about how a screen looks.

## The rules every screen keeps

- **Tokens only.** Colour is a role (`bg-surface-container-low`, `text-on-primary-container`),
  corners are the shape scale (`rounded-lg`, `rounded-xl`), type is a style (`type-title-medium`),
  shadows are levels (`shadow-1`..`shadow-5`). Tailwind's own palette is deleted from the theme, so
  only roles resolve; a hex value belongs in `src/app/theme.config.ts` and nowhere else.
- **Pairs travel together.** A container role always carries its `on-` role:
  `bg-tertiary-container text-on-tertiary-container`. Text on a surface is `text-on-surface` or
  `text-on-surface-variant`.
- **Surfaces stack by container tone**, not by shadow: page `surface`, grouped content
  `surface-container-low`, raised panels `surface-container`/`-high`. Shadows only on what floats.
- **Overlays come from the services**: `useSnackbar`, `useDialog`, `useActionSheet` (auto-imported),
  or `M3BottomSheet`/`M3Menu` with `v-model:open`. They register on the overlay stack, so Android
  back and Escape close the top one. Never hand-build a modal.
- **One tap target per row.** A list row's own button lives in `M3ListItem`'s `#action` slot, never
  inside a clickable row.
- **Motion is spatial or effects.** Position, size and shape use the spatial springs; colour and
  opacity the effects springs. Never animate `width`/`top` of a large surface - `transform` and
  `opacity`.
- **Reduced motion keeps meaning, drops travel**: morphs and fades stay, rotation, bounce and slide
  go. The tokens collapse spatial durations to 1 ms for you; JS-driven motion reads
  `useReducedMotion()`.
- **Every control is labelled**: icon buttons, FABs and switches take `label`; it becomes the
  accessible name and tooltip.
- **Empty is a state, not a blank.** `EmptyState` (shape, one sentence, the one action that fills it).
  Waits under ~5 s show `M3LoadingIndicator`; known progress shows the wavy indicators.

## Where things live

| Need                          | Use                                                              |
| ----------------------------- | ---------------------------------------------------------------- |
| A screen                      | `AppPage` + modules/`<feature>`/views                            |
| Section label                 | `SectionHeader`                                                  |
| Theme state                   | `useThemeSettings()` - seed, variant, contrast, mode, motion     |
| Shell navigation              | `useActiveTab()` (`show`, `open(tab, path)`), `useWindowClass()` |
| Hide the bar on a pushed page | `AppPage back` does it; elsewhere `useHiddenNavigation()`        |
| Decorative tone for a shape   | `TONE_CLASSES` from `shared/utils/tone`                          |
| Live component examples       | the Gallery tab - `modules/gallery/components/sections`          |
