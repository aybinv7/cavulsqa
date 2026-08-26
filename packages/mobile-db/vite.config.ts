import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: {
      index: "src/index.ts",
      testing: "src/testing/sqlJsDialect.ts",
      opfs: "src/opfs/index.ts",
      core: "src/core.ts",
      wa: "src/wa/index.ts",
    },
    dts: {
      /**
       * Classic tsc, not tsgo. tsgo is TypeScript 7, and this workspace is pinned to TypeScript 5
       * because vue-tsc needs `typescript/lib/tsc`, which 7 does not export. Running both meant pnpm
       * built a second copy of vite-plus-core for the differing peer set, the unplugins bound to it,
       * and the app's vite.config.ts failed with "excessive stack depth" comparing two identical
       * `Plugin` declarations. One TypeScript, one Vite, no error.
       */
      tsgo: false,
    },
    exports: true,
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
