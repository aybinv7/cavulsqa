import type { Router } from "framework7/types";
import { lazyRoute } from "@/shared/utils/lazyRoute";

const demoRoutes: Router.RouteParameters[] = [
  {
    name: "demo",
    path: "/demo/",
    async: lazyRoute(() => import("@/modules/demo/views/DemoView.vue")),
  },
  {
    name: "demo-search",
    path: "/demo/search/",
    async: lazyRoute(() => import("@/modules/demo/views/OrderSearchView.vue")),
  },
  {
    name: "demo-order",
    path: "/demo/order/:id/",
    async: lazyRoute(() => import("@/modules/demo/views/OrderDetailView.vue")),
  },
];

export default demoRoutes;
