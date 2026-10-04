import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
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
    /**
     * Bundled, not imported: rrweb 2.0.0-alpha.4 is `"type": "module"` but its `main` is a UMD file,
     * so anything resolving it the Node way - a consumer's Vitest run, which loads dependencies
     * through Node - gets no named exports and fails on import. Bundlers read its `module` entry,
     * which is why the app never noticed. It is a devDependency for that reason.
     */
    noExternal: [/^rrweb/, /^@rrweb\//],
    /** The recorder runs in a WebView: resolve the browser entries, rrweb's ES build among them. */
    platform: "browser",
  },
  test: {
    environment: "happy-dom",
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
