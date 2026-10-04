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
    /**
     * Bundled, not imported: material-color-utilities 0.4.0 ships `color_spec_2025.js` with an
     * extensionless import that Node's ESM loader rejects, so a consumer's test or SSR run would
     * crash on import unless it inlined the package itself. Its declarations are inlined with it, and
     * its Apache-2.0 notices are kept, so it is a devDependency: nothing of it installs separately.
     */
    noExternal: ["@material/material-color-utilities"],
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
