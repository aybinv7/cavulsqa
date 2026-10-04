import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vite-plus/test";
import {
  defaultTemplate,
  listTemplates,
  resolveTemplateChoice,
  templateMenu,
} from "../lib/templates.mjs";

const PACKAGE = dirname(dirname(fileURLToPath(import.meta.url)));
const REPO_TEMPLATES = join(dirname(dirname(PACKAGE)), "templates");
const manifest = JSON.parse(readFileSync(join(PACKAGE, "package.json"), "utf8"));

test("every template in the repository is declared, with a description", () => {
  const onDisk = readdirSync(REPO_TEMPLATES, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const declared = manifest.createConfig.templates;
  expect(declared.map((entry) => entry.name).sort()).toEqual(onDisk);
  for (const entry of declared) expect(entry.description.length, entry.name).toBeGreaterThan(20);
});

test("exactly one template is the default, so --yes never depends on directory order", () => {
  expect(manifest.createConfig.templates.filter((entry) => entry.default)).toHaveLength(1);
  expect(defaultTemplate(listTemplates(PACKAGE)).name).toBe("f7-app");
});

test("templates are offered in the manifest's order", () => {
  expect(listTemplates(PACKAGE).map((entry) => entry.name)).toEqual(
    manifest.createConfig.templates.map((entry) => entry.name),
  );
});

test("a choice is a number from the menu or a name", () => {
  const templates = listTemplates(PACKAGE);
  expect(resolveTemplateChoice("2", templates)).toBe(templates[1].name);
  expect(resolveTemplateChoice(" m3e-app ", templates)).toBe("m3e-app");
  expect(resolveTemplateChoice("9", templates)).toBeNull();
  expect(resolveTemplateChoice("vuetify", templates)).toBeNull();
});

test("the menu numbers every template with its description", () => {
  const menu = templateMenu(listTemplates(PACKAGE));
  expect(menu).toMatch(/^ {2}1\) f7-app {3}Vue 3/m);
  expect(menu).toMatch(/^ {2}2\) m3e-app {2}Material 3 Expressive/m);
});
