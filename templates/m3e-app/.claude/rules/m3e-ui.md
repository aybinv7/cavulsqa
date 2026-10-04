# UI: Material 3 Expressive on a Framework7 engine

The full workflow is the `m3-expressive` skill. These are the guardrails it rests on, each one a way
the screen breaks silently.

## Framework7 is the engine, not the look

Only five Framework7 components resolve: `F7App`, `F7Views`, `F7View`, `F7Page`, `F7PageContent`
(the allowlist in `src/shared/utils/resolvers/resolvers.ts`). Routing, per-tab history and page
events come from them; everything visible is an `M3*` component. A visual `f7-*` component brings
Framework7's styling and modal stack back and fights the M3 overlay stack for Android back.

`f7`, `f7ready` are auto-imported; `f7route` / `f7router` arrive as props of a route component:
`defineProps<{ f7route: Router.Route; f7router: Router.Router }>()`. Inside shared components, reach
the router with `useViewRouter(el)`.

## CSS is layered

`assets/css/app.css` declares `@layer framework7, theme, base, components, utilities`. Framework7's
CSS is the lowest layer and the M3 components sit below Tailwind's utilities, so a utility on a
component always wins and `!important` is never needed. New global CSS goes in a layer; component
CSS goes in the component's `<style scoped>`.

Layers only settle conflicts: a Framework7 rule nothing else contradicts still applies. Its core
sizes every bare `button` to `width: 100%` - the M3 components undo it for their own buttons, so a
hand-made `<button>` must set its width or use an `M3*` button.

In `<style scoped>`, wrap the whole selector: `:global(.parent .child)`. Vue compiles
`:global(.parent) .child` to `.parent` alone, silently styling the wrong element.

## Tokens only

Tailwind's default palette, radii, shadows and easings are cleared in
`assets/css/theme/tailwind.css` and refilled from `--md-sys-*`. A class like `bg-red-500` does not
exist. Colours: roles. Corners: the shape scale. Type: `type-*`. Hex values live in
`src/app/theme.config.ts` only.

## Icons are SVG components, checked at build time

`<i-ms-<name>-rounded />` from Material Symbols (outlined: `-outline-rounded`, filled: `-rounded`).
`autoInstall` is off, so a wrong name fails the build instead of rendering nothing. In TS:
`import Icon from "~icons/material-symbols/<name>"` and `markRaw` it before putting it in reactive
state.

## Proof obligations

`vp check`, `pnpm type-check` and `vp test` pass. Say what you saw run - light and dark, compact width,
reduced motion - and say plainly when you have not seen it on a device.
