import type { Router } from "framework7/types";
import { lazyRoute } from "@/shared/utils/lazyRoute";

const settingsRoutes: Router.RouteParameters[] = [
  {
    name: "settings",
    path: "/settings/",
    async: lazyRoute(() => import("@/modules/settings/views/SettingsView.vue")),
  },
];

export default settingsRoutes;
