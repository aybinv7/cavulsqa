import type { Router } from "framework7/types";

const demoRoutes: Router.RouteParameters[] = [
  {
    name: "demo",
    path: "/demo/",
    // `async` is Framework7's route hook, not an async function - resolve from the promise.
    async({ resolve }) {
      void import("@/modules/demo/views/DemoView.vue").then((view) => {
        resolve({ component: view.default });
      });
    },
  },
  {
    name: "demo-search",
    path: "/demo/search/",
    async({ resolve }) {
      void import("@/modules/demo/views/OrderSearchView.vue").then((view) => {
        resolve({ component: view.default });
      });
    },
  },
  {
    name: "demo-order",
    path: "/demo/order/:id/",
    async({ resolve }) {
      void import("@/modules/demo/views/OrderDetailView.vue").then((view) => {
        resolve({ component: view.default });
      });
    },
  },
];

export default demoRoutes;
