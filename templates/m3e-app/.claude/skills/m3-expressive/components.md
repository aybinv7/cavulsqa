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

**`M3FabMorph`** - Framework7's FAB morph as a container transform: the FAB grows into a floating
toolbar of icon buttons (`variant="toolbar"`) or a panel (`panel`, with a scrim) and shrinks back.
`v-model:open`, `label`, `#icon`, default slot with `{ close }`. Use it when the FAB opens a set of
peer actions on one screen; variants of one action are a FAB menu.

## Navigation

**`M3Breadcrumbs`** - `items` (`{ label, href? }`), `@select`, `max` (the middle collapses into a
menu past it), `label`. The last item is the current page. Fades the edge it overflows past.

**`M3NavigationBar` / `M3NavigationRail` + `M3NavigationItem`** - the shell already renders these from
`src/app/tabs.ts`; add a destination there. Items take `#icon="{ selected }"` (outlined → filled),
`badge` (number or `true`). `@reselect` fires on tapping the current destination.
→ navigation-bar/specs, navigation-rail/specs

**`M3Tabs` + `M3Tab`** - `variant` primary (content-width indicator, optional `#icon`) for peer views
of one subject; secondary for subdivisions inside a primary tab. `scrollable` beyond ~4 tabs.
Arrow keys move. Swipeable pages: put the tabs in `AppPage`'s `#bottom` slot (pinned under the
bar), the pages in `M3TabPanels` + `M3TabPanel value`, bind one `v-model` to both and pass both
the same `createTabPager()` so the indicator follows the swipe. Give `M3TabPanels` a height; each
page scrolls on its own. A carousel or swipe row inside a page keeps its own sideways drag.
→ tabs/specs

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
the open side. One row open at a time; a tap outside closes it. Expandable items: put the hidden
content in `#details` (`v-model:expanded`); `M3List accordion` keeps one open, as Framework7's
accordion list does - FAQs, settings groups, order lines. `M3List sortable` is Framework7's
sortable list: a drag handle on every item plus long-press-and-drag on the row; handle
`@sort="(from, to) => (rows = moveItem(rows, from, to))"` and persist the order yourself. Not for
`M3VirtualList`. → lists/specs

**`M3Carousel`** - Compose's carousel, keyline for keyline: `items`, `label`, `variant`
multi-browse (default; browsing many items - photos, products) | hero (one featured item at a time;
a fling moves one) | uncontained (fixed `item-width`, coasts without snapping), `item-width`
(preferred large width, 186), `item-spacing` 8, `content-padding` 16, `height`, `v-model:item`.
Items are laid out full size and masked, so put a full-bleed picture in the slot and let it
parallax; fade labels with `--m3-carousel-item-progress` and slide them with
`--m3-carousel-mask-start`. The slot's `scrollTo` brings a tapped item forward. → carousel/specs

**`M3Tree`** - Framework7's treeview from data: `items` (`{ id, label, supporting?, children?,
lazy? }`), `label`, `mode` select (`v-model:selected`) | check (`v-model:checked` leaf ids,
tri-state branches), `v-model:expanded`, `load` for lazy children, `#icon="{ node, expanded }"`,
`#trailing`. Categories, charts of accounts, permission sets.

**`M3DataTable`** - Framework7's data table: `rows`, `columns` (`{ key, label, value?, format?,
numeric?, sortable?, width? }`), `row-key`, `label`, `v-model:sort` (sorts locally unless
`:sort-locally="false"` - then sort in SQL from the model), `selectable` + `v-model:selected`,
`max-height` + `sticky-first-column` for wide tables, `dense`, `#cell`, `#footer` (totals), `#empty`.
For phones prefer a list with the key fields; use the table where rows are compared across columns.

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

**`M3FullScreenDialog`** - Framework7's popup, M3's full-screen dialog: `v-model:open`, `title`,
`confirm-label` (+ `confirm-disabled`), `#actions`, `@confirm`, `@close`. For a task that needs the
whole phone screen - a new order, an intake form; from 600dp it becomes a basic dialog. While the
form is dirty pass `:dismissible="false"` and ask in `@close` before discarding (`useDialog`
confirmations draw above it).

**`M3Menu` + `M3MenuItem` + `M3MenuGroup`** - anchored to an element ref (`:anchor`), `variant`
standard | vibrant; groups give the expressive segmented look. `checkable` for single/multi select.
A `#submenu` slot of items makes a cascading item (trailing arrow; opens beside it on tap, hover or
the arrow key); choosing inside closes the whole chain, Back closes the submenu alone. Keep it one
level deep on phones. → menus/specs

**Snackbar** - `await useSnackbar().show({ message, action, duration })` resolves `action` |
`dismissed` | `timeout`. One action max, never for errors that need a decision. Undo is the classic.
→ snackbar/specs

**In-app notification** - `await useNotification().show({ title, text, source, meta, icon, duration })`
resolves `opened` | `dismissed` | `timeout` | `replaced`. Framework7's notification: a banner from the
top for something that happened elsewhere (a new order, a finished sync) that the person may want
to open; a snackbar is for feedback on what they just did. One at a time - a new one replaces it.

**`M3SideSheet`** - `v-model:open`, `side` start | end, `title`; filters and secondary detail beside
the content. **`M3ModalNavigationRail`** - the expressive replacement for the navigation drawer;
closes itself once a destination is chosen. → side-sheets/specs, navigation-rail/specs

**`M3Popover`** - Framework7's popover: any content anchored to an element. `anchor` (element),
`v-model:open`, `label`, `side` bottom | top, `align` start | center | end, `modal` (scrim + focus
trap); default slot gets `{ close }`. Flips and stays on screen, grows out of the anchor, closes on a
tap outside, Escape or back, and focus returns to the anchor. For a few controls or an explanation
tied to one element; a list of actions is `M3Menu`.

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

## Photos

**`M3PhotoBrowser`** - Framework7's photo browser: `photos` (`{ src, alt, caption?, width?, height? }`),
`v-model:open`, `v-model:index`, `label`, `#actions` for the bar (share, delete). Swipe between,
pinch or double-tap to zoom, pan when zoomed, swipe up or down to close; only neighbours load. Give
`width`/`height` when known. It is drawn on black - call `useDarkStatusBar(() => open.value)` so the
status bar icons turn light while it shows.

**`M3Image`** - lazy image: `src`, `alt` (`""` when decorative), `width` + `height` or `ratio` to
reserve its space, `placeholder` (a colour or a tiny image, drawn blurred), `fit`, `eager` for the
first screen, `#error`. Fades in once decoded; cached pictures appear at once.

**`M3Pager`** + **`M3PagerPage`** - Framework7's swiper as a pager on native scroll-snap: one page per
swipe, `v-model:page`, `label`; dots underneath, or `#footer` with `{ page, count, progress, go,
next, previous }` for Skip / Next. **`M3PageIndicator`** (`count`, `progress`, `@select`) is the
dots alone; its pill follows the finger. Onboarding, a product's photos, a feature tour.

## Lists at scale

**`M3ListGroup` + `M3ListIndex`** - Framework7's contacts list and list index: groups whose titles
stick under the app bar (`title`, `indexKey`; `groupKey(label)` folds accents and buckets digits
under `#`), and an A–Z rail (`keys`, `label`) in `AppPage`'s `#fixed` slot that jumps as the finger
drags. Pad the content ~24px at the end edge so rows clear the rail.

**`M3InfiniteScroll`** - after a list: `:load` returns a promise and resolves `false` when there is
no more; failures wait for the user's retry; `endText` closes the list; expose `reset()` after a new
filter. Feed it from a repository with `LIMIT/OFFSET` (or a keyset) - never load everything to
slice it in memory. **`M3Timeline` + `M3TimelineItem`** - an order's journey, a patient's visits:
`title`, `time`, `supporting`, `state` done | current | upcoming, `#icon` for the current step,
`stateLabel` so the state is read out.

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
`endLabel` (each handle is its own slider), `minDistance` keeps them apart. **`M3Stepper`** - Framework7's stepper for small counts (cart quantity, guests, a dose):
`v-model`, `label`, `min`/`max`/`step` (decimals stay clean), `variant` outlined | tonal, `size` s | m,
`editable` (type the value; a decimal comma is read), `format` for units. Holding a button repeats
and speeds up across wide ranges. Use a slider when the exact value matters less than its position.
**`M3Chip`** - `kind` assist | filter (`v-model:selected`) | input
(`removable`) | suggestion. **`M3TextField`** - `variant` filled (default) | outlined, `supporting`,
`error`, `maxlength` counter, `prefix`/`suffix`, `multiline`, `#leading`/`#trailing`; native
attributes pass through. **`M3ExposedDropdown`** - Compose's exposed dropdown menu: `options`
(`{ value, label, supporting?, disabled? }`), `v-model`, `label`; read-only it is a select (arrow
keys, type-ahead), `editable` makes it Framework7's autocomplete (accent- and case-insensitive
filter, bolded match, `limit`). For a remote source, `:filter="false"` + `v-model:query` +
`loading`. Use it over radios past ~5 options, and over an action sheet when the field sits in a
form. **`M3SmartSelect`** - Framework7's smart select, a list row that opens a sheet of options:
`options`, `v-model` (an array with `multiple`), `label`, `placeholder`; search appears past
`searchFrom` (10). Prefer it to the exposed dropdown for multi-choice and inside settings lists.
**`M3SearchBar`** - `v-model`, `@search`, `#leading`/`#trailing`, for
filtering what is already on screen. **`M3SearchView`** - the bar that opens into a full-screen
view (`v-model`, `v-model:expanded`, `placeholder`; results in the default slot with `{ query }`,
recent searches when the query is empty); use it for searching a whole data set.
→ switch, checkbox, radio-button, sliders, chips, text-fields, search /specs

## Charts

`M3LineChart` (`area` for filled), `M3BarChart` (`stacked`) and `M3DonutChart` - plain SVG, no
library: `labels` + `series` (`{ label, values, color? }`, `null` breaks a line) or `segments`
(`{ label, value }`), `label` (the accessible name), `format` for numbers (use
`Intl.NumberFormat` compact). Colours come from the theme's roles; touching reads values;
screen readers get a hidden table. Lines for change over time, bars to compare categories, a
donut for parts of one whole (at most ~6 segments). Feed them aggregates from SQL, never raw rows.

## Forms

**`M3TextEditor`** - Framework7's text editor: `v-model` HTML, `label`, `placeholder`, `toolbar`
(commands and `"|"`), `labels` for i18n. Bold, italic, underline, strikethrough, lists, links
(through a popover), clear formatting. Its HTML is sanitised in and out (`sanitizeHtml` is exported

- run it again wherever stored HTML is rendered with `v-html`). Use a plain multiline `M3TextField`
  unless formatting is the point.

**`M3SignaturePad`** - proof of delivery: `v-model:strokes` (fractions of the pad, so a draft or a
rotation redraws it sharp), `height`, `label`, `placeholder`; ref methods `undo()`, `clear()`,
`toDataURL(type, background)` for the upload, `toSvg()`. Always pair it with a typed name - signing
has no keyboard path.

**`M3ColorPicker`** - `v-model` `#rrggbb`, hue / chroma / tone sliders in HCT with previewing tracks,
a hex field, optional `swatches`. Put it in a sheet with a draft and apply on confirm when the
colour drives something expensive, such as the app theme.

**`useFormDraft(key, state, options)`** - keeps what is typed into a form as a draft (debounced,
written at once when the app goes to the background) and restores it when the form opens again.
Returns `{ restored, savedAt, error, clear, flush }`; call `clear()` on submit or discard. `storage`
takes any async store (default `localStorage`), `version` drops drafts from an older form, `maxAge`
expires them. Never draft passwords or card numbers - give it only the fields worth keeping.

## Messages

**`M3Messages`** - a conversation: `messages` (`{ id, sent, at, text?, author?, avatar?, status?,
image? }`, oldest first), `label`, `locale`, `authors` for a group (names and avatars), `typing`
(`true` or `{ author }`), label props for i18n. It scrolls with the page: opens at the newest,
follows new ones while the reader is there, keeps their place otherwise and counts what arrived.
Older history goes in `#before` as `<M3InfiniteScroll edge="start">` - page it, never pass
thousands. `@hold` (long-press) for a message menu via `useActionSheet`, `@press` for an image,
`@retry` for a failed send. Give images `width`/`height` so nothing jumps as they load.
**`M3MessageBar`** - the composer, in `AppPage`'s `#fixed`: `v-model`, `label`, `@send` (trimmed
text; it clears itself), `#leading` (attach), `#trailing` (emoji), `#idle` (stands in for send
while empty), `enterSends` for hardware keyboards. It publishes its height for `M3Messages`; zero
the page's own bottom padding (`.page-content { padding-bottom: 0 }`) on a chat page.

## Shape and decoration

**`M3Shape`** - masks its content to one of the 35 shapes (square box). **`M3ShapeMorph`** - an SVG
shape that springs into the next when `shape` changes; fills with `currentColor`. **`M3Badge`** -
dot or count on its slot. Details: [shapes-type.md](shapes-type.md).
