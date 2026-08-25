import Framework7 from "framework7/lite-bundle";
import Framework7Vue from "framework7-vue";

import "framework7/css/bundle";
import "framework7-icons";
import "./assets/css/app.css";

import App from "./App.vue";
import { i18n } from "./plugins/i18n.plugin";
import { sqlitePlugin } from "./plugins/sqlite.plugin";

Framework7.use(Framework7Vue);

function reportFatal(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[bootstrap] the app could not start:", error);

  const root = document.getElementById("app");
  if (!root) return;
  const box = document.createElement("div");
  box.setAttribute("style", "font:14px/1.5 system-ui;padding:24px;color:#b00020");
  box.textContent = `The app could not start: ${message}`;
  root.replaceChildren(box);
}

/**
 * The database opens before mount so the first screen never renders against a missing schema.
 *
 * If it fails, the failure is shown. Awaiting this at the top level of the module and letting it
 * reject renders an empty `#app` with an unhandled rejection nobody reads - which is exactly what
 * this template did the first time it was opened in a browser.
 */
async function bootstrap(): Promise<void> {
  try {
    await sqlitePlugin();
  } catch (error) {
    reportFatal(error);
    return;
  }

  // Components arrive through Framework7VueResolver, so nothing is registered by hand.
  const app = createApp(App);
  app.use(i18n);
  app.mount("#app");
}

void bootstrap();
