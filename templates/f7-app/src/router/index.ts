import type { Router } from "framework7/types";
import homeRoutes from "@/modules/home/router/routes/home.routes";
import demoRoutes from "@/modules/demo/router/routes/demo.routes";
import settingsRoutes from "@/modules/settings/router/routes/settings.routes";
import globalRoutes from "./global/global.routes";

/**
 * Each module owns its routes; this only orders them. The catch-all is last because Framework7
 * takes the first match.
 */
const routes: Router.RouteParameters[] = [
  ...homeRoutes,
  ...demoRoutes,
  ...settingsRoutes,
  ...globalRoutes,
];

export default routes;
