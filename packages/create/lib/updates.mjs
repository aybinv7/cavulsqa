import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * What a Capuchoo-updated app installs, matching what `capuchoo init` would add so its `packages`
 * step finds everything present. `@capacitor/app` is already a template dependency.
 */
export const UPDATE_PACKAGES = {
  dependencies: {
    "@capacitor/device": "^8.0.0",
    "@capgo/capacitor-updater": "^8.0.0",
    "@capuchoo/updater": "^0.14.1",
  },
  devDependencies: {
    "@capuchoo/cli": "^0.16.4",
  },
};

export const FLAVOURS = [
  { env: "dev", idSuffix: ".dev", nameSuffix: " Dev" },
  { env: "staging", idSuffix: ".staging", nameSuffix: " Staging" },
  { env: "prod", idSuffix: "", nameSuffix: "" },
];

/**
 * The update server's base URL, normalised: no trailing slash, and no `/api`, because the runtime
 * appends `/api/update` itself and a doubled segment is a 404 that reads as "no update".
 */
export function normaliseUpdateUrl(value) {
  const trimmed = String(value).trim().replace(/\/+$/, "");
  let url;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(
      `"${value}" is not a URL; give the update server's base, e.g. https://updates.example.com`,
    );
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`the update server must be http(s), not ${url.protocol}`);
  }
  if (url.pathname.endsWith("/api")) {
    throw new Error(
      `give the server's base URL without /api - the updater appends /api/update itself`,
    );
  }
  return trimmed;
}

/**
 * The server the Capuchoo CLI is already signed in to, as the default answer. Only the endpoint is
 * read; the API key next to it is never touched.
 */
export function knownUpdateServer() {
  if (process.env.CAPUCHOO_ENDPOINT) return process.env.CAPUCHOO_ENDPOINT;
  try {
    const config = JSON.parse(readFileSync(join(homedir(), ".capuchoo", "config.json"), "utf8"));
    return typeof config.endpoint === "string" ? config.endpoint : undefined;
  } catch {
    return undefined;
  }
}

function sortedMerge(base = {}, extra) {
  return Object.fromEntries(
    Object.entries({ ...base, ...extra }).sort(([a], [b]) => a.localeCompare(b)),
  );
}

export function withUpdatePackages(pkg) {
  return {
    ...pkg,
    dependencies: sortedMerge(pkg.dependencies, UPDATE_PACKAGES.dependencies),
    devDependencies: sortedMerge(pkg.devDependencies, UPDATE_PACKAGES.devDependencies),
  };
}

function insertAfter(text, anchor, insertion, file) {
  const index = text.indexOf(anchor);
  if (index === -1) throw new Error(`${file} has no "${anchor.trim()}" to wire the updater into`);
  const at = index + anchor.length;
  return text.slice(0, at) + insertion + text.slice(at);
}

/**
 * The shape `capuchoo init` writes and its doctor checks for. The helper refuses an empty server
 * URL - an empty one silently disables updates - which is why every flavour file carries one.
 */
export function wireCapacitorConfig(text) {
  const withImport = insertAfter(
    text,
    'import type { CapacitorConfig } from "@capacitor/cli";\n',
    'import { capuchooUpdaterConfig } from "@capuchoo/updater/capacitor";\n',
    "capacitor.config.ts",
  );
  return insertAfter(
    withImport,
    "  plugins: {\n",
    [
      "    CapacitorUpdater: capuchooUpdaterConfig({",
      "      apiUrl: process.env.VITE_UPDATE_API_URL,",
      "      channel: process.env.VITE_UPDATE_CHANNEL,",
      "    }),",
      "",
    ].join("\n"),
    "capacitor.config.ts",
  );
}

/**
 * `notifyAppReady()` right after the imports and before anything that can throw: a bundle that has
 * not confirmed it booted within ten seconds is rolled back, working or not.
 */
export function wireEntry(text) {
  const lines = text.split("\n");
  let last = -1;
  for (let index = 0; index < lines.length; index++) {
    if (!/^import\b/.test(lines[index])) continue;
    last = index;
    while (last < lines.length - 1 && !/;\s*$/.test(lines[last])) last++;
    index = last;
  }
  if (last === -1) throw new Error("src/main.ts has no imports to place notifyAppReady after");
  lines.splice(
    last + 1,
    0,
    'import { notifyAppReady } from "@capuchoo/updater";',
    "",
    "/** First, unconditionally: an update that does not confirm it booted is rolled back. */",
    "void notifyAppReady();",
  );
  return lines.join("\n");
}

export function flavourFile({ env, idSuffix, nameSuffix }, { appId, appName, updateUrl }) {
  return [
    `# The ${env} flavour. The Capuchoo CLI exports these values when it builds ${env}; see .env.example.`,
    `VITE_APP_ID=${appId}${idSuffix}`,
    `VITE_APP_NAME=${appName}${nameSuffix}`,
    `VITE_ENVIRONMENT=${env}`,
    `VITE_UPDATE_API_URL=${updateUrl}`,
    `VITE_UPDATE_CHANNEL=${env}`,
    "",
  ].join("\n");
}

const ENV_EXAMPLE_UPDATES = `
# Capuchoo over-the-air updates. Each flavour sets these in build/<env>/.env.<env>; capacitor.config.ts
# loads the one VITE_ENVIRONMENT names (dev by default) so a local \`npx cap sync\` works too.
#   VITE_UPDATE_API_URL     the update server's base URL, without /api
#   VITE_UPDATE_CHANNEL     the channel this build follows: dev, staging or prod
# VITE_UPDATE_PUBLIC_KEY=   release signing; \`capuchoo keys init\` prints it. Once set, unsigned updates are refused.
`;

/**
 * Turns a scaffolded app into a Capuchoo-updated one, offline. What needs the server - linking the
 * app, its channels, registering the flavour ids - is left to `capuchoo init`, which reports
 * everything written here as already satisfied.
 */
export function addUpdates(out, { appId, appName, updateUrl }) {
  const packagePath = join(out, "package.json");
  const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
  writeFileSync(packagePath, `${JSON.stringify(withUpdatePackages(pkg), null, 2)}\n`);

  const configPath = join(out, "capacitor.config.ts");
  writeFileSync(configPath, wireCapacitorConfig(readFileSync(configPath, "utf8")));

  const entryPath = join(out, "src", "main.ts");
  writeFileSync(entryPath, wireEntry(readFileSync(entryPath, "utf8")));

  for (const flavour of FLAVOURS) {
    const dir = join(out, "build", flavour.env);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, `.env.${flavour.env}`),
      flavourFile(flavour, { appId, appName, updateUrl }),
    );
  }

  const examplePath = join(out, ".env.example");
  if (existsSync(examplePath)) {
    writeFileSync(
      examplePath,
      `${readFileSync(examplePath, "utf8").trimEnd()}\n${ENV_EXAMPLE_UPDATES}`,
    );
  }
}

/** The commands that finish the job against the server, in order, for the README and the CLI. */
export function linkCommands(appId) {
  return [
    ["install"],
    ["exec", "capuchoo", "init", "--app-id", appId],
    ...FLAVOURS.filter((flavour) => flavour.idSuffix).map((flavour) => [
      "exec",
      "capuchoo",
      "app",
      "identifiers",
      "add",
      `${appId}${flavour.idSuffix}`,
      "--flavour",
      flavour.env,
      "--platform",
      "all",
      "--yes",
    ]),
  ];
}
