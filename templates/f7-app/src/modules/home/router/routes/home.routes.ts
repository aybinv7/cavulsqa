import type { Router } from "framework7/types";

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
];

export default homeRoutes;
