import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    // `templates/` is a bundled copy of a whole app, tests included. Without this, `vp test` here
    // runs the template's suite against dependencies that were never installed in this package.
    include: ["tests/**/*.test.mjs"],
  },
  lint: { options: { typeAware: false } },
  fmt: {},
});
