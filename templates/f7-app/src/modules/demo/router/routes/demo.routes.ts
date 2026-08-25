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
];

export default demoRoutes;
