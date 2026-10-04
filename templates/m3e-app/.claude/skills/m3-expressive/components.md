# Component catalogue

Every component is auto-imported by `M3eResolver`; write the tag, never an import. Composables
(`useSnackbar`, `useDialog`, `useActionSheet`, `useHaptics`, `useReducedMotion`) are auto-imported
too. Each section names the spec page to read when a detail is not covered here.

## Actions

**`M3Button`** - `variant` filled | tonal | outlined | elevated | text, `size` xs | s | m | l | xl,
`shape` round | square, `toggle` + `v-model:selected`, slots `#icon` (receives `selected`), `#trailing`.
Hierarchy: one filled action per screen region; tonal for secondary; outlined/text below that. Size
`s` is the default for in-content actions, `m` for a screen's primary action and sheet footers, `l`/`xl`
for hero moments only. → buttons/specs

**`M3IconButton`** - `label` required, `variant` standard | filled | tonal | outlined, `width` narrow |
default | wide, `size`, `shape`, `toggle`. App-bar actions are `standard`; a toolbar's emphasised
action is `filled`. → icon-buttons/specs

**`M3ButtonGroup`** - `variant` standard (pressed button widens 15%, neighbours give way) or
connected (2dp gaps, replaces segmented buttons; use toggle buttons inside for single select), `size`.
→ button-groups/specs

**`M3SplitButton`** - primary action + `#menu`; pair with `M3Menu` anchored inside the menu slot.
→ split-button/specs

**`M3Fab`** - `label` required, `size` small | default | medium | large, `color` *-container (default)
or solid, `extended` (undefined = plain; true/false = extended FAB shown/collapsed - collapse on scroll
down). One FAB per screen, for its single most important constructive action, in `AppPage`'s `#fab`.
→ floating-action-button/specs, extended-fab/specs

**`M3FabMenu` + `M3FabMenuItem`** - when the main action has 2-6 variants. Items take `index`
(0 nearest the FAB). → fab-menu/specs

## Navigation

**`M3NavigationBar` / `M3NavigationRail` + `M3NavigationItem`** - the shell already renders these from
`src/app/tabs.ts`; add a destination there. Items take `#icon="{ selected }"` (outlined → filled),
`badge` (number or `true`). `@reselect` fires on tapping the current destination.
→ navigation-bar/specs, navigation-rail/specs

**`M3Tabs` + `M3Tab`** - `variant` primary (content-width indicator, optional `#icon`) for peer views
of one subject; secondary for subdivisions inside a primary tab. `scrollable` beyond ~4 tabs.
Arrow keys move. → tabs/specs

**`M3TopAppBar`** - rendered by `AppPage`. `small` for pushed pages, `medium`/`large` flexible for
roots and long titles. Tapping the bar outside its buttons scrolls the page to the top (Android's
status bar keeps taps for its shade); nav-bar reselect does the same. → app-bars/specs

**`M3FloatingToolbar`** - page actions over content: `variant` standard | vibrant, `#fab`,
`hideOnScroll`. Compose gives it no shadow (1dp with a FAB) - do not add one. **`M3DockedToolbar`** - a detail screen's persistent actions at the bottom edge.
→ toolbars/specs

## Containment

**`M3List` + `M3ListItem`** - `variant` segmented (default; each row its own surface, 2dp apart) or
standard. Items: `headline`, `supporting`, `overline`, `trailingText`, `multiline`, `clickable` or
`href`, `selected`, `tone="destructive"`; slots `#leading` (icon, `M3Shape` avatar 40dp), `#trailing`
(decoration), `#action` (a control with its own target). Swipe actions: `M3SwipeAction` buttons
(`label`, `tone`, `@click`) in `#swipe-start` / `#swipe-end`; `swipe-full="end"` arms the outermost
action past half the row (deletes, archives - pair with an undo snackbar), `v-model:swiped` reads
the open side. One row open at a time; a tap outside closes it. → lists/specs

**`M3Carousel`** - Compose's carousel, keyline for keyline: `items`, `label`, `variant`
multi-browse (default; browsing many items - photos, products) | hero (one featured item at a time;
a fling moves one) | uncontained (fixed `item-width`, coasts without snapping), `item-width`
(preferred large width, 186), `item-spacing` 8, `content-padding` 16, `height`, `v-model:item`.
Items are laid out full size and masked, so put a full-bleed picture in the slot and let it
parallax; fade labels with `--m3-carousel-item-progress` and slide them with
`--m3-carousel-mask-start`. The slot's `scrollTo` brings a tapped item forward. → carousel/specs

**`M3Card`** - `variant` elevated | filled | outlined; `clickable` makes the whole card one target -
then put no other buttons inside. → cards/specs

**`M3Divider`** - only where whitespace and surfaces do not already separate. → divider/specs

## Overlays

**`M3BottomSheet`** - `v-model:open`, `title`, `dismissible`, slots `#header`, default (scrolls),
`#footer` (fixed actions). Spring-driven; drag from handle or top-scrolled content. Prefer it to a
dialog for anything with more than one choice or any form. → bottom-sheets/specs

**`M3StandardBottomSheet`** - the non-modal sheet beside the content (a map, a route, a player):
`v-model:detent` peek | half | expanded (| hidden with `hideable`), `label`, `title`, `peekHeight`
(56 by default - raise it to show the title), `half`. Drags anywhere until expanded, then the content
scrolls; pulling down from the content's top brings it back. Fixed to the window: set
`--m3-standard-sheet-inset-bottom` above a navigation bar and pad the page by the peek.

**Action sheet** - `await useActionSheet().open({ title, supporting, quickActions, groups })` resolves
the chosen id or null. Options with icons in segmented groups; `selected` shows a check, `tone:
"destructive"` paints error. Icons are components wrapped in `markRaw`.

**`M3Dialog` / `useDialog().confirm({...})`** - only for a decision that must interrupt: destructive
confirmations, required choices. `destructive` paints the confirm action; `icon` centres the headline.
→ dialogs/specs

**`M3Menu` + `M3MenuItem` + `M3MenuGroup`** - anchored to an element ref (`:anchor`), `variant`
standard | vibrant; groups give the expressive segmented look. `checkable` for single/multi select.
A `#submenu` slot of items makes a cascading item (trailing arrow; opens beside it on tap, hover or
the arrow key); choosing inside closes the whole chain, Back closes the submenu alone. Keep it one
level deep on phones. → menus/specs

**Snackbar** - `await useSnackbar().show({ message, action, duration })` resolves `action` |
`dismissed` | `timeout`. One action max, never for errors that need a decision. Undo is the classic.
→ snackbar/specs

**`M3SideSheet`** - `v-model:open`, `side` start | end, `title`; filters and secondary detail beside
the content. **`M3ModalNavigationRail`** - the expressive replacement for the navigation drawer;
closes itself once a destination is chosen. → side-sheets/specs, navigation-rail/specs

**`M3Tooltip`** - plain (long-press, hover, focus; labels an icon button) or rich (`title`, text,
actions; explains, never holds the only path to a task). Placed so it never leaves the screen.
→ tooltips/specs

## Date and time

Values are strings end to end - `IsoDate` (`YYYY-MM-DD`) and `IsoTime` (`HH:mm`, 24-hour) - so no
timezone or DST shift can move a picked day. Utilities (`formatIso`, `parseLocalDate`,
`formatIsoTime`, `uses12Hour`...) are exported beside the components.

**`M3DatePicker`** - `v-model`, `v-model:open`, `presentation` dialog (Material's modal, default) |
sheet (Framework7's, one-handed). `modes` defaults to calendar + typed input in a dialog, calendar +
wheel in a sheet. Edits a draft; only OK commits. `min`, `max`, `isDisabled`, `locale`, every label
a prop. **`M3Calendar`** - the grid alone, inline or docked in a card: `v-model:value`, or
`mode="range"` with `v-model:start` / `v-model:end`. → date-pickers/specs

**`M3TimePicker`** - `v-model` `HH:mm`, `presentation` dialog | sheet, `modes` dial + keyboard
(dialog) or dial + wheel (sheet), `hour12` (else the locale decides), `minuteStep`. The dial is
**`M3ClockDial`**: 24-hour faces put 00 and 13-23 on the inner ring. → time-pickers/specs

**`M3WheelPicker`** - Framework7's picker: drums over one band, `columns` of `{ key, label,
options, flex, align, loop }`, `v-model` keyed by column; `loop` rolls a drum over at its ends. Built like Framework7's: native scroll-snap, flat rows, gradient fades in `--m3-wheel-surface`
(the colour behind it) - no per-row 3D or masks, which made it lag on phones - and a
tick per detent. **`M3DateWheel`** / **`M3TimeWheel`** are the ready date and time drums; put them in
an `M3BottomSheet` with a draft when the choice needs confirming. No M3 spec - it is the F7 parity
piece.

## Lists at scale

**`M3VirtualList`** - thousands of rows against the page's own scroller (the app bar still
collapses): `items`, `itemSize` (number or function: 56 / 72 / 88 + 2 for the segment gap),
`itemKey`, `inset`. Rows are recycled - row components must render from props alone; `recycle=false`
keys by `itemKey` for rows with local state. **`M3PullToRefresh`** - `:refresh` returns a promise;
the loading indicator fills with the pull and loops until it settles.

## Progress

**`M3Skeleton` + `M3SkeletonBlock` + `M3SkeletonText`** - Framework7's skeleton: placeholders in
the shape of the content on its way, for loads you expect to take more than a moment (a list from
the database, a detail screen). Mirror the real layout exactly - same rows, same type scales via
`M3SkeletonText typescale` - so nothing jumps when it lands. `effect` wave (default) | pulse | none;
set `--m3-skeleton-surface` to the colour behind the group. Use `M3LoadingIndicator` instead when
there is no layout to predict.

**`M3LoadingIndicator`** - waits up to a few seconds, or `progress` 0-1 for determinate. `contained`
over content. Replaces every spinner. → loading-indicator/specs

**`M3LinearProgress` / `M3CircularProgress`** - `value` 0-1 or omitted (indeterminate), `wavy` (default
on), `thickness`; circular takes `gauge` and a centred slot. Linear sits 4dp in from the edges.
→ progress-indicators/specs

## Selection and input

**`M3Switch`** (`icons`, `bothIcons`) for an instant on/off; **`M3Checkbox`** for items in a list
or a form submitted later; **`M3Radio`** (`v-model` + `value`) for one of few visible options - more
than ~5, use an action sheet. **`M3Slider`** - `size` xs..xl, `step`, `ticks`, `#icon` from m, `format`
for the value bubble. **`M3RangeSlider`** - `v-model:start` / `v-model:end`, `startLabel` /
`endLabel` (each handle is its own slider), `minDistance` keeps them apart. **`M3Chip`** - `kind` assist | filter (`v-model:selected`) | input
(`removable`) | suggestion. **`M3TextField`** - `variant` filled (default) | outlined, `supporting`,
`error`, `maxlength` counter, `prefix`/`suffix`, `multiline`, `#leading`/`#trailing`; native
attributes pass through. **`M3SearchBar`** - `v-model`, `@search`, `#leading`/`#trailing`, for
filtering what is already on screen. **`M3SearchView`** - the bar that opens into a full-screen
view (`v-model`, `v-model:expanded`, `placeholder`; results in the default slot with `{ query }`,
recent searches when the query is empty); use it for searching a whole data set.
→ switch, checkbox, radio-button, sliders, chips, text-fields, search /specs

## Shape and decoration

**`M3Shape`** - masks its content to one of the 35 shapes (square box). **`M3ShapeMorph`** - an SVG
shape that springs into the next when `shape` changes; fills with `currentColor`. **`M3Badge`** -
dot or count on its slot. Details: [shapes-type.md](shapes-type.md).
