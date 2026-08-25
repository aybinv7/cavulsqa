import type { Router } from "framework7/types";

const settingsRoutes: Router.RouteParameters[] = [
  {
    name: "settings",
    path: "/settings/",
    // `async` is Framework7's route hook, not an async function - resolve from the promise.
    async({ resolve }) {
      void import("@/modules/settings/views/SettingsView.vue").then((view) => {
        resolve({ component: view.default });
      });
    },
  },
];

export default settingsRoutes;
