# @cavulsqa/m3e-vue

Material 3 Expressive components for Vue 3, on the tokens and geometry of
[`@cavulsqa/m3e`](../m3e). Built for Capacitor WebViews: one shared animation-frame loop, work that
stops off screen, compositor-only motion, and an overlay stack that Android back can close.

## Setup

```ts
import { applyColorScheme, applySystemTokens, createM3e } from "@cavulsqa/m3e-vue";
import "@cavulsqa/m3e-vue/style.css";

applySystemTokens();
applyColorScheme({ seed: "#6750a4", variant: "expressive" });

export const m3e = createM3e({ haptics: { tick, confirm } });
app.use(m3e);

// Android back: let the topmost sheet, dialog or menu close first.
App.addListener("backButton", () => {
  if (m3e.config.overlays.closeTop()) return;
  router.back();
});
```

Import the stylesheet inside a cascade layer below your utilities - `@import
"@cavulsqa/m3e-vue/style.css" layer(components);` - so a utility class on a component always wins.
Put that line in a CSS file of its own, imported after the one declaring the layer order, rather
than inside the file Tailwind compiles: Tailwind caches its compile and does not track this import.
Framework7's core stylesheet sizes every bare `button` to `width: 100%`; the components undo that
for their own buttons at zero specificity.
With `unplugin-vue-components`, `M3eResolver` from `@cavulsqa/m3e-vue/resolver` imports `M3*`
components where they are used.

Mount the hosts once near the root: `<M3SnackbarHost />`, `<M3DialogHost />`,
`<M3ActionSheetHost />`. Then `useSnackbar().show(...)`, `useDialog().confirm(...)` and
`useActionSheet().open(...)` resolve promises from anywhere.

## Components

| Family              | Components                                                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Actions             | `M3Button`, `M3IconButton`, `M3ButtonGroup` (standard, connected), `M3SplitButton`, `M3Fab`, `M3FabMenu`, `M3FabMenuItem`           |
| Navigation          | `M3NavigationBar`, `M3NavigationRail`, `M3NavigationItem`, `M3Tabs`, `M3Tab`, `M3TopAppBar`, `M3FloatingToolbar`, `M3DockedToolbar` |
| Containment         | `M3List`, `M3ListItem`, `M3Card`, `M3Divider`, `M3Badge`                                                                            |
| Overlays            | `M3BottomSheet`, `M3ActionSheetHost`, `M3Dialog`, `M3DialogHost`, `M3Menu`, `M3MenuGroup`, `M3MenuItem`, `M3SnackbarHost`           |
| Progress            | `M3LoadingIndicator`, `M3LinearProgress`, `M3CircularProgress`                                                                      |
| Selection and input | `M3Switch`, `M3Checkbox`, `M3Radio`, `M3Slider`, `M3Chip`, `M3TextField`, `M3SearchBar`                                             |
| Shape               | `M3Shape`, `M3ShapeMorph`                                                                                                           |

Each component's JSDoc links the m3.material.io spec it implements. The `m3e-app` template's Gallery
tab shows every one of them live.

## Decisions worth knowing

- **Sheets are spring-driven, not CSS transitions**, so a drag hands its release velocity to the
  settle and an interrupted open reverses without a jump.
- **Overlays register on one stack** (`useOverlay`); Escape and `closeTop()` close only the topmost,
  and a persistent one swallows back rather than closing.
- **Presses are a directive** (`v-ripple`): a ripple from the touch point and `data-pressed` while
  held, which the press shape morphs key on. `:active` is unreliable in Android WebViews.
- **A list row's own control goes in `#action`**, rendered beside the row's target - a button inside
  a button is invalid HTML.
- **Nothing reads the system's reduced-motion preference directly**: `useReducedMotion()` prefers the
  app's own setting (`createM3e({ reducedMotion })`) and falls back to the media query.
