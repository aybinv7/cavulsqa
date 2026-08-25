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

/**
 * The tab bar is data: add an entry, add a route file in the matching module, and the shell, the bar
 * and the navigation all follow. Each tab is a Framework7 view with its own history, so switching
 * away and back returns to the same screen.
 *
 * Icons are given per theme rather than once. Framework7 picks `icon-ios` or `icon-md` from the
 * active theme, which is what makes the bar look native on both platforms instead of iOS glyphs on
 * Android.
 */
export const tabs: TabDefinition[] = [
  { id: "home", labelKey: "tabs.home", iconIos: "house_fill", iconMd: "home" },
  { id: "demo", labelKey: "tabs.demo", iconIos: "bolt_fill", iconMd: "bolt" },
  { id: "settings", labelKey: "tabs.settings", iconIos: "gear_alt_fill", iconMd: "settings" },
];
