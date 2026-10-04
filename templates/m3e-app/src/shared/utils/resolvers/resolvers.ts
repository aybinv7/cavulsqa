import type { ComponentResolver } from "unplugin-vue-components/types";

/**
 * Framework7 is this template's navigation engine and nothing else: the app root, the tab views,
 * each view's router and the page lifecycle the reactive queries pause on. Everything you see is a
 * Material 3 Expressive component from @cavulsqa/m3e-vue. The allowlist is the boundary - adding a
 * visual `f7-*` component here brings Framework7's styling back, which is what this flavour exists
 * to avoid.
 */
const ENGINE_COMPONENTS = new Set(["f7-app", "f7-views", "f7-view", "f7-page", "f7-page-content"]);

const toCamelCase = (value: string) =>
  value.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());

function kebabOf(name: string): string | null {
  if (/^F7[A-Z]/.test(name))
    return name
      .replace(/^F7/, "f7-")
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .toLowerCase();
  if (name.startsWith("f7-")) return name;
  return null;
}

export function Framework7VueResolver(): ComponentResolver {
  return {
    type: "component",
    resolve: (name: string) => {
      const kebab = kebabOf(name);
      if (kebab && ENGINE_COMPONENTS.has(kebab))
        return { name: toCamelCase(kebab), from: "framework7-vue" };
      return undefined;
    },
  };
}

export function getFramework7AutoImports() {
  return {
    "framework7/lite": ["utils", "getDevice", "Dom7"],
    "framework7-vue": ["f7ready", "f7"],
  };
}
