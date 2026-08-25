import type { Router } from "framework7/types";

/**
 * The detail route is a child of the tab's own view, which is what keeps the tab bar in place and
 * the back gesture scoped to this tab's history.
 */
const homeRoutes: Router.RouteParameters[] = [
  {
    name: "home",
    path: "/home/",
    // `async` is Framework7's route hook, not an async function - resolve from the promise.
    async({ resolve }) {
      void import("@/modules/home/views/HomeView.vue").then((view) => {
        resolve({ component: view.default });
      });
    },
  },
  {
    name: "home-feature",
    path: "/home/feature/:id/",
    async({ resolve }) {
      void import("@/modules/home/views/FeatureDetailView.vue").then((view) => {
        resolve({ component: view.default });
      });
    },
  },
];

export default homeRoutes;
