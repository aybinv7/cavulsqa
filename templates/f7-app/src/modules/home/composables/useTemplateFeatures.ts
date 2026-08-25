export interface TemplateFeature {
  icon: string;
  title: string;
  description: string;
  /** Where to read the code, so the list doubles as a map of the template. */
  source: string;
}

/**
 * What this template gives you. Kept as data rather than markup so deleting a layer means deleting
 * an entry, and so the list cannot silently claim something the generator left out.
 */
export const templateFeatures: TemplateFeature[] = [
  {
    icon: "square_stack_3d_up_fill",
    title: "Tabbed shell, tabs as data",
    description:
      "Each tab is its own Framework7 view with its own history, lazily loaded so a tab nobody opens never loads. Add a section by adding one entry.",
    source: "src/app/tabs.ts",
  },
  {
    icon: "arrow_uturn_left",
    title: "Android back button that behaves",
    description:
      "Closes the topmost layer first — actions, dialog, sheet, popover, popup, panel — walks a popup's own history before closing it, then minimises instead of exiting.",
    source: "src/plugins/capacitor/useAndroidBackButton.ts",
  },
  {
    icon: "keyboard",
    title: "Keyboard that does not cover the field",
    description:
      "Scrolls the focused input into view on every phase of the transition, not just once, and moves the tab bar out of the way while typing.",
    source: "src/plugins/capacitor/useKeyboard.ts",
  },
  {
    icon: "rectangle_on_rectangle",
    title: "Status bar overlaying the web view",
    description:
      "The page owns the inset via env(safe-area-inset-top), and the bar style follows the colour scheme so text never renders invisible.",
    source: "src/plugins/capacitor/useStatusBar.ts",
  },
  {
    icon: "cylinder_split_1x2",
    title: "SQLite that is the source of truth",
    description:
      "Kysely over @capacitor-community/sqlite. Writes and transactions take turns on the one native connection; reads run in parallel because the bridge pipelines them.",
    source: "src/shared/database/database.ts",
  },
  {
    icon: "arrow_2_circlepath",
    title: "Queries that refetch themselves",
    description:
      "A write announces the tables it touched and every query watching one of them refetches, debounced. No manual invalidation, no stale screen.",
    source: "src/shared/database/queries.ts",
  },
  {
    icon: "chart_bar_alt_fill",
    title: "Query metrics built in",
    description:
      "Durations, cache hits, refetches per table and active listeners, recorded by the same instance the screens use. Exposed on window in dev.",
    source: "src/modules/settings/views/SettingsView.vue",
  },
  {
    icon: "globe",
    title: "i18n and module boundaries",
    description:
      "vue-i18n with per-locale JSON, and a domains / modules / shared layout where each module owns its own routes, views and composables.",
    source: "src/router/index.ts",
  },
];
