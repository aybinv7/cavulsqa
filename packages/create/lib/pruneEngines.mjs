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

  dropListItems(join(out, "src/shared/database/candidates/types.ts"), (line) =>
    [...deadEngines].some((id) => line.trim() === `"${id}",`),
  );
  dropLines(join(out, "src/shared/database/candidates/index.ts"), (line) =>
    dropped.some(([, module]) => line.includes(`"./${basenameOf(module.file)}"`)),
  );
  dropListItems(join(out, "src/app/storage.config.ts"), (line) =>
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

/** oxfmt's default `printWidth`, which neither template overrides. */
const PRINT_WIDTH = 100;

const LIST_ITEM = /^\s+[^\s/*].*,\s*$/;

/**
 * `dropLines` for the items of a bracketed list, leaving the list the way oxfmt would print it.
 *
 * oxfmt puts an array or an import's specifiers on one line whenever that line fits, so a list the
 * template had to break can fit once engines leave it - and an app whose first `vp check` fails on
 * code nobody in it wrote is a broken scaffold. Only a list that lost an item is rejoined, and only
 * when every line left in it is a plain item, so a list carrying a comment is never touched.
 */
function dropListItems(path, matches) {
  if (!existsSync(path)) return;
  const lines = [];
  const cuts = new Set();
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (matches(line)) cuts.add(lines.length);
    else lines.push(line);
  }

  const lists = new Map();
  for (const cut of cuts) {
    const list = enclosingList(lines, cut);
    if (list) lists.set(list.open, list);
  }

  for (const { open, close } of [...lists.values()].sort((a, b) => b.open - a.open)) {
    const joined = joinList(lines[open], lines.slice(open + 1, close), lines[close]);
    if (joined.length <= PRINT_WIDTH) lines.splice(open, close - open + 1, joined);
  }
  writeFileSync(path, lines.join("\n"));
}

/** The opening and closing lines around the place an item was cut, or null if it was no list. */
function enclosingList(lines, cut) {
  let open = cut - 1;
  while (open >= 0 && LIST_ITEM.test(lines[open])) open--;
  let close = cut;
  while (close < lines.length && LIST_ITEM.test(lines[close])) close++;
  if (open < 0 || close >= lines.length || close === open + 1) return null;

  const opener = lines[open].trimEnd();
  const closer = { "[": "]", "{": "}" }[opener.at(-1)];
  const indent = opener.match(/^\s*/)[0];
  if (!closer || !lines[close].startsWith(`${indent}${closer}`)) return null;
  return { open, close };
}

/** `[a, b]` hugs its brackets and `{ a, b }` does not, as oxfmt prints them. */
function joinList(opener, items, closer) {
  const head = opener.trimEnd();
  const body = items.map((item) => item.trim().replace(/,$/, "")).join(", ");
  const tail = closer.trim();
  return head.endsWith("{") ? `${head} ${body} ${tail}` : `${head}${body}${tail}`;
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
