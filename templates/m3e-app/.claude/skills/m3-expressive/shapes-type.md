# Shape and type

## Corner scale

| Tailwind               | Token                 | dp   | Typical use                                       |
| ---------------------- | --------------------- | ---- | ------------------------------------------------- |
| `rounded-xs`           | extra-small           | 4    | inner corners of segmented lists, menus, snackbar |
| `rounded-sm`           | small                 | 8    | chips, small thumbnails                           |
| `rounded-md`           | medium                | 12   | cards, inner panels                               |
| `rounded-lg`           | large                 | 16   | outer corners of segments, grouped blocks         |
| `rounded-lg-increased` | large-increased       | 20   | medium FAB                                        |
| `rounded-xl`           | extra-large           | 28   | sheets, dialogs, hero blocks                      |
| `rounded-xl-increased` | extra-large-increased | 32   | large hero surfaces                               |
| `rounded-2xl`          | extra-extra-large     | 48   | full-bleed media corners                          |
| `rounded-full`         | full                  | pill | buttons, chips at rest, indicators                |

Nested corners stay concentric: inner radius = outer radius − padding.

## The shape library

35 shapes (`MATERIAL_SHAPES`): circle, square, slanted, arch, fan, arrow, semiCircle, oval, pill,
triangle, diamond, clamShell, pentagon, gem, sunny, verySunny, cookie4Sided, cookie6Sided,
cookie7Sided, cookie9Sided, cookie12Sided, ghostish, clover4Leaf, clover8Leaf, burst, softBurst,
boom, softBoom, flower, puffy, puffyDiamond, pixelCircle, pixelTriangle, bun, heart. All visible in
Gallery → Shapes.

- **Use shapes for identity and emphasis, not for controls**: avatars and leading icons in lists
  (`M3Shape` 40dp with `TONE_CLASSES`), hero art, empty states, status marks, selected swatches.
- **Morph to mark a change of state**: `M3ShapeMorph` springs between two shapes - selection, a step
  completing, a status advancing.
- **Rounded shapes for calm, spiky (burst, boom) for celebration or alerts** - sparingly.
- A shape needs a square box; a photo cut to a shape uses `M3Shape` around the `<img>`.

## Type

Google Sans Flex (self-hosted, `rond.css` - weight + roundness axes) for every style. Utilities:
`type-<style>` and `type-<style>-emphasized`, styles display/headline/title/body/label ×
large/medium/small. Sizes are in rem, so the user's font scale applies.

- Titles of screens: the app bar owns them. In content, `type-title-medium` for card titles,
  `type-title-small-emphasized` (primary) for section labels, `type-body-large` for list headlines,
  `type-body-medium` for supporting text, `type-label-large` for button-like labels.
- **Emphasized** styles are for the one thing on a surface that should land first: a total, a hero
  headline, a selected value - not for every heading.
- `font-rounded` (ROND 100) belongs to display and headline moments in heroes and totals, never body.
- Numbers that change in place get `tabular-nums`.

See [sources.md](sources.md) → Shape, Typography.
