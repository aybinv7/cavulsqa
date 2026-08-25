import type { Router } from "framework7/types";
import { tabs } from "./tabs";

/**
 * One route per tab, plus a catch-all. Tab content is lazy: a tab the user never opens never loads
 * its module, which matters because Framework7 mounts every tab view at startup.
 */
export const routes: Router.RouteParameters[] = [
  ...tabs.map<Router.RouteParameters>((tab) => ({
    path: `/${tab.id}/`,
    asyncComponent: tab.component,
  })),
  {
    path: "(.*)",
    asyncComponent: () => import("@/modules/home/HomePage.vue").then((m) => m.default),
  },
];
