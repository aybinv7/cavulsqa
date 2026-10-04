# Official sources

m3.material.io renders in the browser only (fetching returns an empty shell): open it in a browser
tool. When the spec page and androidx source disagree, the androidx token files win - they are
generated from the same design-token database and are newer.

## Foundations

- Overview and blog: https://m3.material.io/blog/building-with-m3-expressive
- Motion theming: https://m3.material.io/blog/m3-expressive-motion-theming
- State layers: https://m3.material.io/foundations/interaction/states/state-layers
- Accessibility: https://m3.material.io/foundations/accessible-design/overview
- Layout and window size classes: https://m3.material.io/foundations/layout/applying-layout ·
  https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes

## Styles

- Motion: https://m3.material.io/styles/motion/overview/how-it-works ·
  specs and web curves: https://m3.material.io/styles/motion/overview/specs ·
  transitions: https://m3.material.io/styles/motion/transitions/transition-patterns
- Colour: https://m3.material.io/styles/color/roles ·
  https://m3.material.io/styles/color/choosing-a-scheme ·
  https://m3.material.io/styles/color/dynamic-color/overview ·
  custom colours: https://m3.material.io/styles/color/advanced/define-new-colors
- Shape: https://m3.material.io/styles/shape/corner-radius-scale ·
  https://m3.material.io/styles/shape/shape-morph
- Typography: https://m3.material.io/styles/typography/type-scale-tokens ·
  https://m3.material.io/styles/typography/fonts
- Elevation: https://m3.material.io/styles/elevation/tokens

## Components (append `/specs` or `/guidelines`)

`https://m3.material.io/components/<name>/specs` for: buttons, icon-buttons, button-groups,
split-button, floating-action-button, extended-fab, fab-menu, loading-indicator,
progress-indicators, toolbars, navigation-bar, navigation-rail, app-bars, search, bottom-sheets,
side-sheets, dialogs, menus, lists, carousel, chips, sliders, switch, tabs, snackbar, cards,
text-fields, checkbox, radio-button, badges, divider, tooltips, date-pickers, time-pickers.

## Source of the numbers

- Compose token files:
  https://github.com/androidx/androidx/tree/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens
- Shapes: …/material3/MaterialShapes.kt · loader: …/LoadingIndicator.kt · wavy: …/WavyProgressIndicator.kt
  (same folder as above, without `/tokens`)
- Colour library: https://github.com/material-foundation/material-color-utilities/tree/main/typescript
- MDC-Android component docs (before/after numbers):
  https://github.com/material-components/material-components-android/tree/master/docs/components

## Where a spec lands in this repo

`packages/m3e` holds the tokens and geometry (each file's JSDoc links its source);
`packages/m3e-vue` the components (each SFC's JSDoc links its spec page). Extend those, then use the
result here.
