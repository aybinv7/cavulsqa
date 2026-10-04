import Framework7 from "framework7/lite";
import Tabs from "framework7/components/tabs";
import Framework7Vue from "framework7-vue";

import "@fontsource-variable/google-sans-flex/rond.css";
import "./assets/css/app.css";
import "./assets/css/m3e.css";

import App from "./App.vue";
import { i18n } from "./plugins/i18n.plugin";
import { m3e } from "./plugins/m3e.plugin";
import { renderBootstrapError } from "./plugins/bootstrapError";
import { seedPlugin } from "./plugins/seed.plugin";
import { sqlitePlugin } from "./plugins/sqlite.plugin";
import { startTheme } from "./shared/composables/theme/useThemeSettings";

Framework7.use([Tabs]);
Framework7.use(Framework7Vue);

/**
 * The theme starts first, so even the bootstrap error screen is drawn in the user's colours and
 * mode. The database opens before mount so the first screen never renders against a missing
 * schema; if it fails, `renderBootstrapError` takes the screen instead of leaving an empty `#app`.
 */
async function bootstrap(): Promise<void> {
  startTheme();
  try {
    await sqlitePlugin();
    await seedPlugin();
  } catch (error) {
    renderBootstrapError(error);
    return;
  }

  const app = createApp(App);
  app.use(i18n);
  app.use(m3e);
  app.mount("#app");
}

void bootstrap();
