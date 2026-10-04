import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    dts: {
      /**
       * Classic tsc, not tsgo: the workspace is pinned to TypeScript 5 for vue-tsc, and a second
       * TypeScript makes pnpm build a second vite-plus-core. See packages/reactive-db.
       */
      tsgo: false,
    },
    exports: true,
  },
  test: {
    server: {
      deps: {
        /**
         * material-color-utilities 0.4.0 ships `color_spec_2025.js` with an extensionless import,
         * which Node's ESM loader rejects; bundlers resolve it. Inlining lets Vite resolve it here.
         */
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
