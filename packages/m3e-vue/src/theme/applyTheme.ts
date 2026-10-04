import {
  colorStylesheet,
  systemStylesheet,
  type ColorStylesheetOptions,
  type SystemStylesheetOptions,
} from "@cavulsqa/m3e";

function upsertStyle(id: string, css: string, doc: Document): void {
  let style = doc.getElementById(id) as HTMLStyleElement | null;
  if (!style) {
    style = doc.createElement("style");
    style.id = id;
    doc.head.appendChild(style);
  }
  if (style.textContent !== css) style.textContent = css;
}

/** The static M3 tokens - shape, type, motion, elevation, state. Once at boot, before mount. */
export function applySystemTokens(
  options: SystemStylesheetOptions = {},
  doc: Document = document,
): void {
  upsertStyle("m3e-system", systemStylesheet(options), doc);
}

/**
 * Both colour modes from one seed into one `<style>`, appended last in `<head>` so it wins over any
 * stylesheet loaded before it at equal specificity. Switching dark mode afterwards is `setDarkMode`
 * alone - nothing is regenerated, nothing flashes.
 */
export function applyColorScheme(options: ColorStylesheetOptions, doc: Document = document): void {
  upsertStyle("m3e-color", colorStylesheet(options), doc);
}

export function setDarkMode(isDark: boolean, root: HTMLElement = document.documentElement): void {
  root.classList.toggle("dark", isDark);
}
