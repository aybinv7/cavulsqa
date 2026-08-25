import { fileURLToPath, URL } from "node:url";
import VueI18nPlugin from "@intlify/unplugin-vue-i18n/vite";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import Icons from "unplugin-icons/vite";
import IconsResolver from "unplugin-icons/resolver";
import Components from "unplugin-vue-components/vite";
import { defineConfig } from "vite-plus";
import {
  Framework7VueResolver,
  getFramework7AutoImports,
} from "./src/shared/utils/resolvers/resolvers.js";

const SRC = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // jeep-sqlite is a custom element, not a Vue component.
          isCustomElement: (tag) => tag === "jeep-sqlite" || tag.startsWith("swiper-"),
        },
      },
    }),

    tailwindcss(),

    Icons({ autoInstall: true, compiler: "vue3" }),

    VueI18nPlugin({ include: [fileURLToPath(new URL("./src/locales/**", import.meta.url))] }),

    /**
     * Composition API, i18n, vueuse and the Framework7 helpers are available without an import
     * line. `auto-imports.d.ts` and `components.d.ts` are generated on first run and are what makes
     * the editor, `vue-tsc` and the build agree - they are artifacts, not files to hand-edit.
     */
    AutoImport({
      include: [/\.[tj]sx?$/, /\.vue$/, /\.vue\?vue/],
      imports: ["vue", "vue-i18n", "@vueuse/core", getFramework7AutoImports()],
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
     * `Framework7VueResolver` is why no screen imports an `f7-*` component and why the app never
     * calls `registerComponents`: each component is pulled from `framework7-vue` exactly where it
     * is used. Icons resolve through the same pass, so `<i-f7-house-fill />` needs no import.
     */
    Components({
      dts: "components.d.ts",
      dirs: ["src/shared/components/**", "src/modules/**/views/**", "src/modules/**/components/**"],
      extensions: ["vue", "ts"],
      deep: true,
      resolvers: [
        Framework7VueResolver(),
        IconsResolver({
          prefix: "i",
          alias: { f7: "framework7", mt: "material-symbols" },
          enabledCollections: ["framework7", "material-symbols", "lucide"],
        }),
      ],
    }),
  ],

  resolve: { alias: { "@": SRC } },
  server: { port: 5173 },
  build: { target: "esnext" },
  lint: { options: { typeAware: false } },
  fmt: {},
});
