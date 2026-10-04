import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { M3eResolver } from "@cavulsqa/m3e-vue/resolver";
import VueI18nPlugin from "@intlify/unplugin-vue-i18n/vite";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import Icons from "unplugin-icons/vite";
import IconsResolver from "unplugin-icons/resolver";
import Components from "unplugin-vue-components/vite";
import { defineConfig, loadEnv } from "vite-plus";
import { linkedPackages, linkedRebuilds } from "./tooling/linkedPackages.js";
import {
  Framework7VueResolver,
  getFramework7AutoImports,
} from "./src/shared/utils/resolvers/resolvers.js";

const SRC = fileURLToPath(new URL("./src", import.meta.url));

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL("./package.json", import.meta.url)), "utf-8"),
) as { name: string; version: string };

/**
 * One port for the dev server and the live-reload URL `capacitor.config.ts` builds, both read from
 * `VITE_LIVE_RELOAD_PORT` - change it when another dev server already holds 5173.
 */
function devPort(mode: string): number {
  const port = Number(loadEnv(mode, ROOT, "VITE_").VITE_LIVE_RELOAD_PORT);
  return Number.isInteger(port) && port > 0 ? port : 5173;
}

const ROOT = fileURLToPath(new URL(".", import.meta.url));
/**
 * Linked workspace packages skip pre-bundling: Vite keeps a pre-bundle until the lockfile changes,
 * so a package rebuilt by its watcher would keep serving its old JavaScript.
 */
const LINKED = linkedPackages(ROOT, ["@cavulsqa/m3e", "@cavulsqa/m3e-vue"]);

export default defineConfig(({ mode }) => ({
  define: {
    __APP_NAME__: JSON.stringify("App"),
    __APP_VERSION__: JSON.stringify(pkg.version),
  },

  plugins: [
    linkedRebuilds(ROOT, LINKED),
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag === "jeep-sqlite",
        },
      },
    }),

    tailwindcss(),

    /**
     * Material Symbols as tree-shaken SVG components from the installed collection, never a font
     * and never fetched: `autoInstall` off means a misspelt name fails the build instead of
     * downloading something at dev time or rendering an empty box on a device.
     */
    Icons({ autoInstall: false, compiler: "vue3", scale: 1 }),

    VueI18nPlugin({
      include: [fileURLToPath(new URL("./src/locales/**", import.meta.url))],
    }),

    AutoImport({
      include: [/\.[tj]sx?$/, /\.vue$/, /\.vue\?vue/],
      imports: [
        "vue",
        "vue-i18n",
        "@vueuse/core",
        getFramework7AutoImports(),
        {
          "@cavulsqa/m3e-vue": [
            "useSnackbar",
            "useNotification",
            "useDialog",
            "useActionSheet",
            "useHaptics",
            "useReducedMotion",
          ],
        },
      ],
      dirs: [
        "src/shared/composables/**",
        "src/shared/utils/**",
        "src/plugins/**",
        "src/modules/**/composables/**",
      ],
      dts: "auto-imports.d.ts",
      vueTemplate: true,
      viteOptimizeDeps: true,
      injectAtEnd: true,
      dirsScanOptions: { types: true },
    }),

    /**
     * Three resolvers, one per source: `M3*` from @cavulsqa/m3e-vue (everything visible), the five
     * Framework7 engine components (app, views, view, page, page content - nothing visual), and
     * `i-ms-*` icons from Material Symbols. No screen imports any of them by hand.
     */
    Components({
      dts: "components.d.ts",
      dirs: ["src/shared/components/**", "src/modules/**/views/**", "src/modules/**/components/**"],
      extensions: ["vue"],
      deep: true,
      resolvers: [
        M3eResolver(),
        Framework7VueResolver(),
        IconsResolver({
          prefix: "i",
          alias: { ms: "material-symbols" },
          enabledCollections: ["material-symbols"],
        }),
      ],
    }),
  ],

  resolve: { alias: { "@": SRC } },
  server: { port: devPort(mode), strictPort: true },
  optimizeDeps: {
    exclude: LINKED,
    include: LINKED.includes("@cavulsqa/m3e")
      ? ["@cavulsqa/m3e > @material/material-color-utilities"]
      : [],
  },
  build: { target: "esnext" },
  test: {
    server: {
      deps: {
        /** material-color-utilities 0.4.0 has an extensionless import Node's ESM loader rejects. */
        inline: ["@material/material-color-utilities"],
      },
    },
  },
  lint: { options: { typeAware: false } },
  fmt: {
    ignorePatterns: ["**/auto-imports.d.ts", "**/components.d.ts"],
  },
}));
