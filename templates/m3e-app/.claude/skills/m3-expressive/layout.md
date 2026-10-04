# Layout

## The shell

- Window classes from `useWindowClass()`: compact < 600dp, medium < 840, expanded < 1200, large.
  Key layout on these, never on device type - a phone in landscape is medium.
- Compact: `M3NavigationBar` floats at the bottom; the shell writes `--app-nav-offset` (64px while
  visible) and `--app-bottom-inset` (offset + gesture area). Anything floating above content uses
  them; nothing measures the bar.
- Medium and up: `M3NavigationRail` beside the views, expandable from its menu button.
- Pushed pages hide the bar (`AppPage back`), the rail stays.

## Page anatomy (`AppPage`)

```vue
<AppPage :title="t('feature.title')" name="feature">            <!-- large flexible bar -->
  <template #actions><M3IconButton :label="…"><i-ms-search-rounded /></M3IconButton></template>
  <SectionHeader :title="t('feature.section')" />
  <M3List variant="segmented" inset>…</M3List>
  <template #fab><M3Fab :label="…"><i-ms-add-rounded /></M3Fab></template>
  <template #fixed><MyFeatureSheet v-model:open="open" /></template>
</AppPage>
```

A pushed page: `<AppPage :title back>` (small bar, back button, bar hidden); `variant="medium"` for a
long title. Sheets and toolbars that must not scroll go in `#fixed`.

## Spacing and rhythm

- Content gutters 16dp (`px-4`, `mx-4`, `inset` on lists); section labels 24dp (`px-6`).
- Between blocks 12-24dp; inside a block 8-16dp. Segments 2dp apart.
- Touch targets ≥ 48dp - the components extend small visuals with an invisible target.
- At most ~840dp of reading width on large windows: wrap long content in `max-w-[52rem] mx-auto`.

## Placement

- One FAB, bottom-end, in `#fab`. With a floating toolbar, the FAB goes in the toolbar's `#fab`.
- Destructive actions go behind a menu or the end of an action sheet, never next to the main action.
- A detail screen's state changes go in `M3DockedToolbar` (connected button group).
- Forms of more than two fields open in an `M3BottomSheet` with the submit button in `#footer`.

See [sources.md](sources.md) → Layout.
