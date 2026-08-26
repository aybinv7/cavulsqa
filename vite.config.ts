import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  /**
   * The unplugin declaration files are committed - vue-tsc has no idea what `ref` or an F7
   * component is without them - but they are rewritten by every build, and what the generator
   * emits is not what oxfmt would emit. Formatting them means CI fails on a file no human wrote
   * and no human can keep formatted.
   */
  fmt: {
    ignorePatterns: ["**/auto-imports.d.ts", "**/components.d.ts"],
  },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  run: {
    cache: true,
  },
});
