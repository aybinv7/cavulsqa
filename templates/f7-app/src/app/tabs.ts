import type { Component } from "vue";

export interface TabDefinition {
  /** Also the tab's DOM id and its route path segment. */
  id: string;
  /** i18n key, resolved in the shell so the label follows the active locale. */
  labelKey: string;
  icon: string;
  component: () => Promise<Component>;
}

/**
 * The tab bar is data, not markup: adding a section means adding an entry here, and the shell,
 * the routes and the bar all follow. Every tab is a Framework7 view with its own history, so
 * switching tabs keeps each one where the user left it.
 */
export const tabs: TabDefinition[] = [
  {
    id: "home",
    labelKey: "tabs.home",
    icon: "house",
    component: () => import("@/modules/home/HomePage.vue").then((m) => m.default),
  },
  {
    id: "settings",
    labelKey: "tabs.settings",
    icon: "gear",
    component: () => import("@/modules/settings/SettingsPage.vue").then((m) => m.default),
  },
];
