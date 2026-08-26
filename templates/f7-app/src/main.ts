import Framework7 from "framework7/lite-bundle";
import Framework7Vue from "framework7-vue";

import "framework7/css/bundle";
import "framework7-icons";
import "./assets/css/icons.css";
import "./assets/css/app.css";

import App from "./App.vue";
import { i18n } from "./plugins/i18n.plugin";
import { renderBootstrapError } from "./plugins/bootstrapError";
import { seedPlugin } from "./plugins/seed.plugin";
import { sqlitePlugin } from "./plugins/sqlite.plugin";

Framework7.use(Framework7Vue);

/**
 * The database opens before mount so the first screen never renders against a missing schema.
 *
 * If it fails, `renderBootstrapError` takes the screen: a sentence, what to do about it, a retry
 * button and the WebView version behind a details toggle. Awaiting this at the top level of the
 * module and letting it reject renders an empty `#app` with an unhandled rejection nobody reads -
 * which is exactly what this template did the first time it was opened in a browser.
 */
async function bootstrap(): Promise<void> {
  try {
    await sqlitePlugin();
    await seedPlugin();
  } catch (error) {
    renderBootstrapError(error);
    return;
  }

  // Components arrive through Framework7VueResolver, so nothing is registered by hand.
  const app = createApp(App);
  app.use(i18n);
  app.mount("#app");
}

void bootstrap();
