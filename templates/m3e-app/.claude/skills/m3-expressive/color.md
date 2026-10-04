# Colour

One seed (`BRAND_SEED` in `src/app/theme.config.ts`) generates every role in both modes through
material-color-utilities' 2025 (Expressive) spec. The user can change seed, variant and contrast in
the colour studio; `useThemeSettings()` persists it and repaints in one frame. Dark mode is a `.dark`
class on `<html>` - both modes are always in the stylesheet, so switching regenerates nothing.

## Roles to reach for

| Purpose                                                     | Role                                                                 |
| ----------------------------------------------------------- | -------------------------------------------------------------------- |
| Page background                                             | `surface`                                                            |
| Grouped content, list segments, cards on a page             | `surface-container-low`                                              |
| Raised panels, the nav bar, bars over scrolled content      | `surface-container` / `-high`                                        |
| Text fields, inactive tracks                                | `surface-container-highest`                                          |
| Main emphasis (FAB, hero, selected nav)                     | `primary-container` + `on-primary-container`                         |
| Strong action fill                                          | `primary` + `on-primary`                                             |
| Selected or active but quiet (chips, list rows, indicators) | `secondary-container`                                                |
| Contrasting accent, decorative variety                      | `tertiary-container`                                                 |
| Snackbar, tooltips                                          | `inverse-surface` + `inverse-on-surface`, action `inverse-primary`   |
| Errors and destructive                                      | `error`, `error-container`                                           |
| Success, warning                                            | custom groups `success-*`, `warning-*` (theme.config `EXTRA_COLORS`) |
| Hairlines                                                   | `outline-variant`; field borders `outline`                           |
| Secondary text, icons                                       | `on-surface-variant`                                                 |

Disabled content is `on-surface` at 38%, disabled containers `on-surface` at 10-12% - the components
already do this.

## Variants and the spec trap

Material applies the 2025 rules only to **tonalSpot, expressive, vibrant, neutral**. `brand`
(seed exact as `primary-container`, Theme Builder's "Match colour"), fidelity, content, monochrome,
rainbow and fruitSalad silently use 2021 rules - `effectiveSpec(variant)` says which. The studio shows
it to the user.

## Rules

- A new semantic colour is a custom group in `EXTRA_COLORS` (harmonised to the seed), then a role
  name in `assets/css/theme/tailwind.css` - never a hex in a component.
- Contrast is a user setting (standard / medium / high): never compensate a weak pair by hand-picking
  a darker colour; fix the role choice.
- Status needs more than colour: pair it with a shape or glyph (see `STATUS_LOOK` in the demo module).

See [sources.md](sources.md) → Colour.
