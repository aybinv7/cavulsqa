import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Every `M3*.vue` under src/components is public: this writes its export line into src/index.ts
 * and its name into src/componentNames.ts, which the resolver reads. Run after adding a component;
 * `tests/components.test.ts` fails when the two drift from the folder.
 */
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, "src");

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const components = walk(join(src, "components"))
  .filter((file) => /[\\/]M3[A-Z]\w*\.vue$/.test(file))
  .map((file) => ({
    name: file.match(/(M3\w+)\.vue$/)[1],
    path: `./${relative(src, file).replaceAll("\\", "/")}`,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const exportsBlock = components
  .map((c) => `export { default as ${c.name} } from "${c.path}";`)
  .join("\n");
const index = readFileSync(join(src, "index.ts"), "utf8");
const start = index.indexOf("export { default as ");
const end = index.indexOf("\n\n", index.lastIndexOf("export { default as "));
if (start < 0 || end < 0) throw new Error("src/index.ts has no component export block to replace");
writeFileSync(join(src, "index.ts"), `${index.slice(0, start)}${exportsBlock}${index.slice(end)}`);

writeFileSync(
  join(src, "componentNames.ts"),
  `export const COMPONENT_NAMES = [\n${components.map((c) => `  "${c.name}",`).join("\n")}\n] as const;\n\nexport type ComponentName = (typeof COMPONENT_NAMES)[number];\n`,
);

console.log(`${components.length} components`);
