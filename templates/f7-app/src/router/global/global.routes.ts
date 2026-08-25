import type { Router } from "framework7/types";

const globalRoutes: Router.RouteParameters[] = [
  {
    name: "not-found",
    path: "(.*)",
    // `async` is Framework7's route hook, not an async function - resolve from the promise.
    async({ resolve }) {
      void import("@/shared/components/error/404.vue").then((view) => {
        resolve({ component: view.default });
      });
    },
  },
];

export default globalRoutes;
