import type { Component } from "vue";
import HomeOutline from "~icons/material-symbols/home-outline-rounded";
import HomeFilled from "~icons/material-symbols/home-rounded";
import OrdersOutline from "~icons/material-symbols/receipt-long-outline-rounded";
import OrdersFilled from "~icons/material-symbols/receipt-long-rounded";
import GalleryOutline from "~icons/material-symbols/widgets-outline-rounded";
import GalleryFilled from "~icons/material-symbols/widgets-rounded";
import SettingsOutline from "~icons/material-symbols/settings-outline-rounded";
import SettingsFilled from "~icons/material-symbols/settings-rounded";

export interface TabDefinition {
  /** Also the tab's DOM id (`view-<id>`) and the first segment of its route. */
  id: string;
  labelKey: string;
  /** M3 marks the selected destination with a filled glyph as well as the indicator. */
  icon: Component;
  iconSelected: Component;
}

/** Add an entry plus a route file in the matching module; the bar and the rail follow. */
export const tabs: readonly TabDefinition[] = [
  { id: "home", labelKey: "tabs.home", icon: HomeOutline, iconSelected: HomeFilled },
  { id: "demo", labelKey: "tabs.demo", icon: OrdersOutline, iconSelected: OrdersFilled },
  { id: "gallery", labelKey: "tabs.gallery", icon: GalleryOutline, iconSelected: GalleryFilled },
  {
    id: "settings",
    labelKey: "tabs.settings",
    icon: SettingsOutline,
    iconSelected: SettingsFilled,
  },
];

export const START_TAB = tabs[0]!.id;
