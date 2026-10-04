import Vue from "unplugin-vue/rolldown";
import VueVite from "unplugin-vue/vite";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [VueVite()],
  pack: {
    entry: {
      index: "src/index.ts",
      resolver: "src/resolver.ts",
    },
    platform: "neutral",
    plugins: [Vue({ isProduction: true })],
    dts: {
      vue: true,
      /** Classic tsc, not tsgo: see packages/reactive-db. */
      tsgo: false,
    },
    exports: true,
  },
  test: {
    environment: "happy-dom",
    server: {
      deps: {
        /** material-color-utilities 0.4.0 has an extensionless import Node's ESM loader rejects. */
        inline: ["@material/material-color-utilities"],
      },
    },
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
