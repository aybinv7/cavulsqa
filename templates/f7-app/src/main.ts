import { createApp } from "vue";
import Framework7 from "framework7/lite-bundle";
import Framework7Vue from "framework7-vue";

import "framework7/css/bundle";
import "framework7-icons";
import "./assets/css/app.css";

import App from "./App.vue";
import { i18n } from "./plugins/i18n.plugin";
import { sqlitePlugin } from "./plugins/sqlite.plugin";

Framework7.use(Framework7Vue);

// The database opens before mount so the first screen never renders against a missing schema.
await sqlitePlugin();

const app = createApp(App);
app.use(Framework7Vue);
app.use(i18n);
app.mount("#app");
