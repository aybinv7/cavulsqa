import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, test } from "vite-plus/test";
import { scaffold } from "../lib/scaffold.mjs";
import { linkCommands, normaliseUpdateUrl, UPDATE_PACKAGES } from "../lib/updates.mjs";

const PACKAGE = dirname(dirname(fileURLToPath(import.meta.url)));
const TEMPLATES = ["f7-app", "m3e-app"];
const URL_ = "https://updates.example.com";

test("an update URL is the server's base: no trailing slash, no /api, http(s) only", () => {
  expect(normaliseUpdateUrl(" https://updates.example.com/ ")).toBe(URL_);
  expect(normaliseUpdateUrl("http://localhost:3000")).toBe("http://localhost:3000");
  expect(() => normaliseUpdateUrl("https://updates.example.com/api")).toThrow(/without \/api/);
  expect(() => normaliseUpdateUrl("updates.example.com")).toThrow(/not a URL/);
  expect(() => normaliseUpdateUrl("ftp://updates.example.com")).toThrow(/http\(s\)/);
});

test("linking registers the dev and staging ids after init, and the prod id is init's own", () => {
  const commands = linkCommands("com.example.caputa").map((args) => args.join(" "));
  expect(commands[0]).toBe("install");
  expect(commands[1]).toBe("exec capuchoo init --app-id com.example.caputa");
  expect(commands.slice(2)).toEqual([
    "exec capuchoo app identifiers add com.example.caputa.dev --flavour dev --platform all --yes",
    "exec capuchoo app identifiers add com.example.caputa.staging --flavour staging --platform all --yes",
  ]);
});

describe.each(TEMPLATES)("%s", (templateName) => {
  let out;
  afterEach(() => {
    if (out) rmSync(dirname(out), { recursive: true, force: true });
    out = undefined;
  });

  function generate(updateUrl, options = {}) {
    out = join(mkdtempSync(join(tmpdir(), "cavulsqa-")), "app");
    scaffold({
      templateDir: join(PACKAGE, "templates", templateName),
      out,
      name: "caputa",
      appId: "com.example.caputa",
      appName: "Caputa",
      updateUrl,
      ...options,
    });
    return (file) => readFileSync(join(out, file), "utf8");
  }

  const keysOf = (text) =>
    text
      .split("\n")
      .map((line) => line.match(/^(VITE_\w+)=/)?.[1])
      .filter(Boolean);

  /**
   * `.env` is git-ignored, so a value only it holds is this machine's, not the app's: `capuchoo
   * deploy` warns about every `VITE_` key a local env file sets and the flavour file does not, and
   * refuses a prod deploy over it. The engine and the PRAGMA profile were exactly those keys.
   */
  test("every value the generated .env sets is set by each flavour too", () => {
    const read = generate(URL_, { engine: "sqlite-wasm-opfs-sahpool", pragmas: "fast" });
    const local = keysOf(read(".env"));
    expect(local).toEqual(["VITE_STORAGE_ENGINE", "VITE_PRAGMA_PROFILE"]);

    for (const env of ["dev", "staging", "prod"]) {
      const flavour = read(`build/${env}/.env.${env}`);
      expect(keysOf(flavour), env).toEqual(expect.arrayContaining(local));
      expect(flavour).toMatch(/^VITE_STORAGE_ENGINE=sqlite-wasm-opfs-sahpool$/m);
      expect(flavour).toMatch(/^VITE_PRAGMA_PROFILE=fast$/m);
    }
  });

  test("a flavour names no engine or profile that was never chosen", () => {
    const read = generate(URL_);
    for (const env of ["dev", "staging", "prod"]) {
      expect(read(`build/${env}/.env.${env}`), env).not.toMatch(
        /VITE_STORAGE_ENGINE|VITE_PRAGMA_PROFILE/,
      );
    }
  });

  test("without updates the app carries no updater at all", () => {
    const read = generate(undefined);
    const pkg = JSON.parse(read("package.json"));

    for (const name of Object.keys(UPDATE_PACKAGES.dependencies)) {
      expect(pkg.dependencies[name], name).toBeUndefined();
    }
    expect(read("capacitor.config.ts")).not.toContain("CapacitorUpdater");
    expect(read("src/main.ts")).not.toContain("notifyAppReady");
    expect(existsSync(join(out, "build"))).toBe(false);
  });

  test("with updates the app is wired the way capuchoo init leaves it", () => {
    const read = generate(URL_);
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.dependencies).toMatchObject(UPDATE_PACKAGES.dependencies);
    expect(pkg.devDependencies).toMatchObject(UPDATE_PACKAGES.devDependencies);

    const config = read("capacitor.config.ts");
    expect(config).toContain(
      'import { capuchooUpdaterConfig } from "@capuchoo/updater/capacitor";',
    );
    expect(config).toMatch(
      /plugins: \{\n {4}CapacitorUpdater: capuchooUpdaterConfig\(\{\n {6}apiUrl: process\.env\.VITE_UPDATE_API_URL,\n {6}channel: process\.env\.VITE_UPDATE_CHANNEL,/,
    );

    const entry = read("src/main.ts");
    const lines = entry.split("\n");
    const call = lines.indexOf("void notifyAppReady();");
    const lastImport = lines.findLastIndex((line) => line.startsWith("import "));
    expect(lines[lastImport]).toBe('import { notifyAppReady } from "@capuchoo/updater";');
    expect(call).toBeGreaterThan(lastImport);
    expect(call).toBeLessThan(lines.findIndex((line) => line.startsWith("async function")));
  });

  test("each flavour has its own id, name, channel and the server", () => {
    const read = generate(URL_);
    const flavour = (env) => read(`build/${env}/.env.${env}`);

    expect(flavour("dev")).toContain("VITE_APP_ID=com.example.caputa.dev");
    expect(flavour("dev")).toContain("VITE_APP_NAME=Caputa Dev");
    expect(flavour("staging")).toContain("VITE_APP_ID=com.example.caputa.staging");
    expect(flavour("prod")).toMatch(/^VITE_APP_ID=com\.example\.caputa$/m);
    expect(flavour("prod")).toMatch(/^VITE_APP_NAME=Caputa$/m);
    for (const env of ["dev", "staging", "prod"]) {
      expect(flavour(env)).toContain(`VITE_ENVIRONMENT=${env}`);
      expect(flavour(env)).toContain(`VITE_UPDATE_API_URL=${URL_}`);
      expect(flavour(env)).toContain(`VITE_UPDATE_CHANNEL=${env}`);
    }

    // The flavour files are configuration to commit; the broad .env.* ignore must not swallow them.
    // The template's own .gitignore repeats `.env.*`, and the last matching rule wins.
    const rules = read(".gitignore").split("\n");
    expect(rules.lastIndexOf("!build/*/.env.*")).toBeGreaterThan(rules.lastIndexOf(".env.*"));
    expect(read(".env.example")).toContain("VITE_UPDATE_API_URL");
    expect(read("README.md")).toContain("pnpm exec capuchoo init --app-id com.example.caputa");
  });
});
