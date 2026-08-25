/// <reference types="vite/client" />

/**
 * For the checkers that do not parse single-file components. `vue-tsc` resolves the real SFC and
 * ignores this; it exists so `vp check`'s type-aware pass can follow a `.vue` import instead of
 * reporting every one as a missing module.
 *
 * Safe here because every `.vue` import in this template is a lazily loaded route component, whose
 * props are never checked at the import site.
 */
declare module "*.vue" {
  import type { DefineComponent } from "vue";

  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>;
  export default component;
}

/** Icon font, imported for its side effect only. */
declare module "framework7-icons";
