export interface TabDefinition {
  /** Also the tab's DOM id and the first segment of its route. */
  id: string;
  /** i18n key, resolved in the shell so the label follows the active locale. */
  labelKey: string;
  /** Framework7 icon name, used when the iOS theme is active. */
  iconIos: string;
  /** Material icon name, used when the Material theme is active. */
  iconMd: string;
}

/** Add an entry plus a route file in the matching module; the shell and the bar follow. */
export const tabs: TabDefinition[] = [
  { id: "home", labelKey: "tabs.home", iconIos: "house_fill", iconMd: "home" },
  { id: "demo", labelKey: "tabs.demo", iconIos: "bolt_fill", iconMd: "bolt" },
  { id: "settings", labelKey: "tabs.settings", iconIos: "gear_alt_fill", iconMd: "settings" },
];
