/** The shape of an `unplugin-vue-components` resolver, without depending on the plugin. */
export interface ComponentResolverResult {
  name: string;
  from: string;
}

const COMPONENT = /^M3[A-Z]\w*$/;

/**
 * Lets `unplugin-vue-components` import `M3*` components where they are used, from the package
 * entry - the same module every other import resolves to, so the stylesheet is loaded once.
 *
 * It matches the `M3` prefix rather than a list: a dev server loads its resolver once, so a list
 * would hide every component added to the package until the server restarted. A misspelt name still
 * fails loudly, as an import the package does not export.
 */
export function M3eResolver() {
  return {
    type: "component" as const,
    resolve(name: string): ComponentResolverResult | undefined {
      return COMPONENT.test(name) ? { name, from: "@cavulsqa/m3e-vue" } : undefined;
    },
  };
}
