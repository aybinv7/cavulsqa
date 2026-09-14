import type { Router } from "framework7/types";
import { lazyRoute } from "@/shared/utils/lazyRoute";

/**
 * The detail route is a child of the tab's own view, which is what keeps the tab bar in place and
 * the back gesture scoped to this tab's history.
 */
const homeRoutes: Router.RouteParameters[] = [
  {
    name: "home",
    path: "/home/",
    async: lazyRoute(() => import("@/modules/home/views/HomeView.vue")),
  },
  {
    name: "home-feature",
    path: "/home/feature/:id/",
    async: lazyRoute(() => import("@/modules/home/views/FeatureDetailView.vue")),
  },
];

export default homeRoutes;
