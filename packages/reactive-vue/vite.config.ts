import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: {
      index: "src/index.ts",
      framework7: "src/framework7.ts",
    },
    dts: {
      tsgo: true,
    },
    exports: true,
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
