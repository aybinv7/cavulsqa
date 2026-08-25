import { readFileSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { expect, test } from "vite-plus/test";

/**
 * framework7-icons is a ligature font: an unknown name renders nothing at all - no warning, no
 * fallback, just empty space where an icon should be. This template shipped seven wrong names
 * before anyone noticed, and then a "fix" derived from the package's React component filenames
 * broke four that had been correct, because those files are SVG wrappers and say nothing about the
 * font's ligatures.
 *
 * So the font itself is the authority. Ligature names appear as plain ASCII in the ttf, which is
 * enough to tell a real name from an invented one.
 */
const require = createRequire(import.meta.url);

function iconFontText(): string {
  const cssPath = require.resolve("framework7-icons/css/framework7-icons.css");
  const ttf = join(dirname(dirname(cssPath)), "fonts", "Framework7Icons-Regular.ttf");
  return readFileSync(ttf, "latin1");
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.(vue|ts)$/.test(entry)) out.push(full);
  }
  return out;
}

/** Matches `f7="name"`, `icon-f7="name"` and the `f7:name` form used for per-theme icons. */
function usedIconNames(): string[] {
  const names = new Set<string>();
  for (const file of sourceFiles(join(import.meta.dirname, "..", "src"))) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/(?:icon-)?f7="([a-z][a-z0-9_]*)"/g)) names.add(match[1]!);
    for (const match of source.matchAll(/f7:([a-z][a-z0-9_]*)/g)) names.add(match[1]!);
  }
  return [...names].sort();
}

test("every Framework7 icon name used in the app exists in the font", () => {
  const font = iconFontText();
  const used = usedIconNames();

  // A guard that never looks at anything is worse than no guard.
  expect(used.length).toBeGreaterThan(10);

  const missing = used.filter((name) => !font.includes(name));
  expect(missing, `not ligatures in Framework7Icons-Regular.ttf: ${missing.join(", ")}`).toEqual(
    [],
  );
});

test("the names this template previously got wrong stay caught", () => {
  const font = iconFontText();

  // Underscores before digits are part of the name; dropping them was the regression.
  for (const wrong of [
    "arrow2_circlepath",
    "square_grid2x2_fill",
    "square_stack3d_down_right_fill",
    "rectangle3_offgrid_fill",
    // An SF Symbols name this font does not carry - the search icon was invisible because of it.
    "magnifyingglass",
  ]) {
    expect(font.includes(wrong), `${wrong} should not resolve`).toBe(false);
  }

  for (const right of [
    "arrow_2_circlepath",
    "square_grid_2x2_fill",
    "square_stack_3d_down_right_fill",
    "rectangle_3_offgrid_fill",
    "search",
  ]) {
    expect(font.includes(right), `${right} should resolve`).toBe(true);
  }
});
