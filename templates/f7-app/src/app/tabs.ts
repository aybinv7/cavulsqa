export interface TabDefinition {
  /** Also the tab's DOM id and the first segment of its route. */
  id: string;
  /** i18n key, resolved in the shell so the label follows the active locale. */
  labelKey: string;
  icon: string;
}

/**
 * The tab bar is data: add an entry, add a route file in the matching module, and the shell, the
 * bar and the navigation all follow. Every tab is a Framework7 view with its own history, so
 * switching away and back returns to the same screen.
 */
export const tabs: TabDefinition[] = [
  { id: "home", labelKey: "tabs.home", icon: "house_fill" },
  { id: "demo", labelKey: "tabs.demo", icon: "bolt_fill" },
  { id: "settings", labelKey: "tabs.settings", icon: "gear_alt_fill" },
];
