# Capacitor and native behaviour

Every native call is guarded with `Capacitor.isNativePlatform()` or
`Capacitor.getPlatform() === "web"`. `vp dev` in a browser must keep working — it is how the app is
inspected — so a handler that assumes a device breaks the fastest feedback loop you have.

Native wiring that needs the Framework7 instance runs inside `f7ready`, not at module load.
`src/plugins/capacitor/index.ts` is the single entry point.

## What is already handled, and why it is not simple

- **Back button** (`useAndroidBackButton`) first asks the M3 overlay stack to close its topmost
  overlay (sheet, dialog, menu, FAB menu) - a persistent one swallows back instead. Then the current
  tab's history, then from another tab's root the start destination, then it minimises rather than
  exits. Overlays register themselves through `useOverlay`; a hand-built modal is invisible to back.
- **Keyboard** (`useKeyboard`) scrolls the focused input into view on _every_ phase of the
  transition, not once — the layout is still settling at `keyboardWillShow` and only
  `keyboardDidShow` sees the final height. It also hides the navigation bar, which otherwise steals a
  row from the field being typed into.
- **Status bar** overlays the web view (edge to edge); the top app bar pads itself with the inset,
  and the icon colour follows the theme's dark mode.
- **Splash** stays up until `hideSplashScreen()`, called on a frame boundary so there is no flash of
  an unpainted shell.

Do not simplify these into a single listener. Each branch is there because of a specific device
behaviour, and the comments say which.

## The bootstrap must never fail silently

`main.ts` opens the database before mounting, inside a `try`, and renders the failure on the page if
it throws. An earlier version awaited it at module top level: a rejection produced an empty `#app`
and a completely silent console, which is the worst possible failure for whoever generates from this
template. The timeout exists so a hang cannot masquerade as a blank screen either.

Anything else added to the bootstrap follows the same shape: guarded, and loud when it fails.

## Fixed elements and the shell

The compact navigation bar floats over the bottom of the views; the shell publishes its height as
`--app-nav-offset` and `--app-bottom-inset` (offset plus the gesture area). So:

- Anything floating above content offsets by `--app-bottom-inset` - `AppPage`'s `#fab` slot, the
  snackbar host and the floating toolbar already do. Never measure the bar.
- Page content is already padded by the same variable; do not add your own bottom spacer for it.
- The FAB menu opens upward, away from the bar.

## Proof obligations

Say which platform you tested on. "Type-checks" is not a claim about a device, and neither is a
browser. If you have not run it on Android, say so.
