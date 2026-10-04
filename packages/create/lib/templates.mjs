import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The templates this build offers, in the manifest's order, with the manifest's descriptions.
 *
 * The manifest is what `vp create` reads; the directory is what actually shipped. A template is
 * offered only when both agree, and a shipped directory the manifest forgot still appears - last,
 * without a description - rather than silently vanishing.
 */
export function listTemplates(packageDir) {
  const manifest = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));
  const declared = manifest.createConfig?.templates ?? [];
  const bundled = join(packageDir, "templates");
  if (!existsSync(bundled)) return declared.map(toEntry);

  const shipped = new Set(
    readdirSync(bundled, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name),
  );
  const listed = declared.filter((entry) => shipped.has(entry.name)).map(toEntry);
  const unlisted = [...shipped]
    .filter((name) => !declared.some((entry) => entry.name === name))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => toEntry({ name }));
  return [...listed, ...unlisted];
}

function toEntry(entry) {
  return {
    name: entry.name,
    description: entry.description ?? "",
    isDefault: entry.default === true,
  };
}

/** The one marked `default` in the manifest, else the first - never whatever readdir returns first. */
export function defaultTemplate(templates) {
  return templates.find((entry) => entry.isDefault) ?? templates[0];
}

/** A typed answer as a template: its number in the list, or its name. Null when it is neither. */
export function resolveTemplateChoice(answer, templates) {
  const value = String(answer).trim();
  if (/^\d+$/.test(value)) return templates[Number(value) - 1]?.name ?? null;
  return templates.some((entry) => entry.name === value) ? value : null;
}

/** The numbered menu the interactive prompt prints. */
export function templateMenu(templates) {
  const width = Math.max(...templates.map((entry) => entry.name.length));
  return templates
    .map((entry, index) => `  ${index + 1}) ${entry.name.padEnd(width)}  ${entry.description}`)
    .join("\n");
}
