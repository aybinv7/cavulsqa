#!/usr/bin/env node
/**
 * `pnpm create @cavulsqa` / `npm create @cavulsqa` / `vp create @cavulsqa`.
 *
 * Interactive when it can be, flag-driven when it cannot: a TTY gets asked, and CI passing
 * `--name` gets no prompts at all. Anything still missing without a TTY is an error rather than a
 * silent default, because a generated app named "my-app" in the wrong directory is worse than a
 * failed command.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { scaffold } from "../lib/scaffold.mjs";

const PACKAGE = dirname(dirname(fileURLToPath(import.meta.url)));
const BUNDLED = join(PACKAGE, "templates");

function parseArgs(argv) {
  const flags = new Map();
  const positional = [];
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const [key, inline] = arg.slice(2).split("=");
    if (inline !== undefined) flags.set(key, inline);
    else if (argv[index + 1] && !argv[index + 1].startsWith("--")) flags.set(key, argv[++index]);
    else flags.set(key, true);
  }
  return { flags, positional };
}

function usage() {
  console.log(`Usage: create-cavulsqa [name] [options]

Options:
  --name NAME          package and directory name
  --template NAME      which template (default: the only one, or you are asked)
  --dir PATH           where to write it (default: ./<name>)
  --app-name NAME      launcher name and window title (default: Name)
  --app-id ID          android application id (default: com.ayb.<name>)
  --engine ID          which storage engine the app prefers, written to .env
  --pragmas PROFILE    safe (default) or fast
  --from PATH          use a template directory on disk instead of the bundled ones
  --yes                take the defaults, ask nothing
  --help               this

Templates bundled in this package:
${listTemplates()
  .map((entry) => `  ${entry.name}  ${entry.description}`)
  .join("\n")}`);
}

function listTemplates() {
  const manifest = JSON.parse(readFileSync(join(PACKAGE, "package.json"), "utf8"));
  const declared = manifest.createConfig?.templates ?? [];
  if (!existsSync(BUNDLED)) return declared;

  // The manifest is what `vp create` reads; the directory is what actually shipped. Trust the
  // directory, and let the manifest supply the descriptions.
  return readdirSync(BUNDLED).map((name) => ({
    name,
    description: declared.find((entry) => entry.name === name)?.description ?? "",
  }));
}

/**
 * The engine ids a template actually offers, read out of its own candidate list rather than kept in
 * a second list here - a generator that knows more engines than the template does is a generator
 * that writes a `.env` the app ignores.
 */
function listEngines(templateDir) {
  try {
    const source = readFileSync(
      join(templateDir, "src/shared/database/candidates/types.ts"),
      "utf8",
    );
    const union = /export type StorageId =([\s\S]*?);/.exec(source)?.[1] ?? "";
    return [...union.matchAll(/"([a-z0-9-]+)"/g)].map((match) => match[1]);
  } catch {
    // A template without the candidate module simply has no engine choice to offer.
    return [];
  }
}

/** npm package names: lowercase, no spaces, no leading dot or underscore. */
function validName(value) {
  return /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(value);
}

async function main() {
  const { flags, positional } = parseArgs(process.argv.slice(2));
  if (flags.has("help") || flags.has("h")) return usage();

  const interactive = process.stdin.isTTY && !flags.has("yes");
  const rl = interactive ? createInterface({ input: process.stdin, output: process.stdout }) : null;

  const ask = async (question, fallback) => {
    if (!rl) return fallback;
    const answer = (await rl.question(`${question}${fallback ? ` (${fallback})` : ""}: `)).trim();
    return answer || fallback;
  };

  try {
    let name = flags.get("name") ?? positional[0];
    if (typeof name !== "string") name = await ask("App name", "my-app");
    if (typeof name !== "string" || !validName(name)) {
      throw new Error(`"${String(name)}" is not a usable package name`);
    }

    const templates = listTemplates();
    if (!templates.length) throw new Error("this build of @cavulsqa/create bundles no templates");

    let template = flags.get("template");
    if (typeof template !== "string") {
      template =
        templates.length === 1
          ? templates[0].name
          : await ask(`Template [${templates.map((t) => t.name).join(", ")}]`, templates[0].name);
    }
    if (!templates.some((entry) => entry.name === template)) {
      throw new Error(
        `unknown template "${template}"; bundled: ${templates.map((t) => t.name).join(", ")}`,
      );
    }

    const titled = name.charAt(0).toUpperCase() + name.slice(1);
    const appName = flags.get("app-name") ?? (await ask("Display name", titled));
    const bareName = name.replace(/[^a-z0-9]/gi, "").toLowerCase();
    const appId =
      flags.get("app-id") ?? (await ask("Android application id", `com.ayb.${bareName}`));

    const engines = listEngines(join(BUNDLED, template));
    let engine = flags.get("engine");
    if (typeof engine !== "string" && engines.length > 1) {
      engine = await ask(`Storage engine [${engines.join(", ")}]`, engines[0]);
    }
    if (typeof engine === "string" && engines.length && !engines.includes(engine)) {
      throw new Error(`unknown engine "${engine}"; this template offers: ${engines.join(", ")}`);
    }

    const pragmas = flags.get("pragmas");
    if (typeof pragmas === "string" && pragmas !== "safe" && pragmas !== "fast") {
      throw new Error(`--pragmas must be "safe" or "fast", not "${pragmas}"`);
    }

    const dir = flags.get("dir") ?? (await ask("Directory", `./${name}`));
    const out = isAbsolute(dir) ? dir : resolve(process.cwd(), dir);

    const from = flags.get("from");
    const templateDir =
      typeof from === "string" ? resolve(process.cwd(), from) : join(BUNDLED, template);

    scaffold({
      templateDir,
      out,
      name,
      appId,
      appName: String(appName),
      engine: typeof engine === "string" ? engine : undefined,
      pragmas: typeof pragmas === "string" ? pragmas : undefined,
    });

    console.log(`
${appName} created in ${out}
  template  ${template}
  appId     ${appId}

  cd ${basename(out)}
  pnpm install
  pnpm dev

Android needs JDK 21: npx cap add android, then pnpm build && npx cap sync android`);
  } finally {
    rl?.close();
  }
}

main().catch((error) => {
  console.error(`\n${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
