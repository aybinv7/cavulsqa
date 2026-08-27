import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Removes every storage engine the generated app did not ask for.
 *
 * Without this the choice is cosmetic: one template means one `package.json`, so picking OPFS still
 * installed `@capacitor-community/sqlite` and put the native plugin in the APK for code that never
 * runs - which is the whole reason the engine sits behind its own entry point in `mobile-db`.
 *
 * The template describes its own engines in `cavulsqa.engineModules`, so nothing here has a list of
 * engine names in it. Each module is one candidate file, and every place that references it does so
 * on a line of its own - a `STORAGE_IDS` entry, an `export` in the candidates barrel, an import
 * specifier and an entry in `DEFAULT_ORDER`. Dropping whole lines is why this stays a few rules
 * rather than a parser.
 */
export function pruneEngines(out, manifest, engine) {
  const modules = manifest?.cavulsqa?.engineModules;
  if (!modules || !engine) return { kept: null, dropped: [] };

  const kept = Object.entries(modules).find(([, module]) => module.engines.includes(engine));
  if (!kept) return { kept: null, dropped: [] };

  const dropped = Object.entries(modules).filter(([name]) => name !== kept[0]);
  if (dropped.length === 0) return { kept: kept[0], dropped: [] };

  // A dependency two engines share is not removable, and neither is an engine id that survives.
  const keptDeps = new Set(kept[1].dependencies ?? []);
  const deadDeps = new Set();
  const deadEngines = new Set();
  const deadExports = new Set();
  for (const [, module] of dropped) {
    for (const dep of module.dependencies ?? []) if (!keptDeps.has(dep)) deadDeps.add(dep);
    for (const id of module.engines) deadEngines.add(id);
    for (const symbol of module.exports ?? []) deadExports.add(symbol);
    const file = join(out, module.file);
    if (existsSync(file)) rmSync(file);
  }

  dropLines(join(out, "src/shared/database/candidates/types.ts"), (line) =>
    [...deadEngines].some((id) => line.trim() === `"${id}",`),
  );
  dropLines(join(out, "src/shared/database/candidates/index.ts"), (line) =>
    dropped.some(([, module]) => line.includes(`"./${basenameOf(module.file)}"`)),
  );
  dropLines(join(out, "src/app/storage.config.ts"), (line) =>
    [...deadExports].some((symbol) => line.trim() === `${symbol},`),
  );

  // `.env.example` documents every engine, one line each. An app that keeps the line for an engine
  // it no longer has is documentation that lies, and `VITE_STORAGE_ENGINE` would name a candidate
  // the chain cannot offer.
  dropLines(join(out, ".env.example"), (line) =>
    [...deadEngines].some((id) => line.startsWith(`#   ${id} `)),
  );
  rewriteLine(join(out, ".env.example"), /^VITE_STORAGE_ENGINE=/, `VITE_STORAGE_ENGINE=${engine}`);

  pruneDependencies(join(out, "package.json"), deadDeps);
  return { kept: kept[0], dropped: dropped.map(([name]) => name) };
}

function basenameOf(file) {
  return file.split("/").pop().replace(/\.ts$/, "");
}

function dropLines(path, matches) {
  if (!existsSync(path)) return;
  const kept = readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => !matches(line));
  writeFileSync(path, kept.join("\n"));
}

function rewriteLine(path, matches, replacement) {
  if (!existsSync(path)) return;
  const lines = readFileSync(path, "utf8")
    .split("\n")
    .map((line) => (matches.test(line) ? replacement : line));
  writeFileSync(path, lines.join("\n"));
}

function pruneDependencies(path, dead) {
  if (!existsSync(path) || dead.size === 0) return;
  const pkg = JSON.parse(readFileSync(path, "utf8"));
  for (const group of ["dependencies", "devDependencies"]) {
    if (!pkg[group]) continue;
    for (const dep of dead) delete pkg[group][dep];
  }
  writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
}
