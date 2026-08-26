import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

/** Files whose contents carry the app's identity and have to be rewritten, not copied. */
function personalise(entry, text, { name, appName }) {
  if (entry === "capacitor.config.ts") {
    return text
      .replace(/appId: "[^"]*"/, `appId: "${name.appId}"`)
      .replace(/appName: "[^"]*"/, `appName: "${appName}"`);
  }
  if (entry === "vite.config.ts") {
    return text.replace(
      /__APP_NAME__: JSON\.stringify\("[^"]*"\)/,
      `__APP_NAME__: JSON.stringify("${appName}")`,
    );
  }
  if (entry === "index.html") {
    return text.replace(/<title>[^<]*<\/title>/, `<title>${appName}</title>`);
  }
  return null;
}

function manifest(source, { name, appName, templateName }) {
  const pkg = JSON.parse(source);
  const { private: _private, ...rest } = pkg;
  return `${JSON.stringify(
    {
      ...rest,
      name: name.package,
      version: "0.1.0",
      private: true,
      description: `${appName} - generated from @cavulsqa/create (${templateName}).`,
      engines: { node: ">=22.18.0" },
    },
    null,
    2,
  )}\n`;
}

function copyTree(from, to, transform) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const source = join(from, entry.name);
    const target = join(to, entry.name);
    if (entry.isDirectory()) {
      copyTree(source, target, transform);
      continue;
    }
    const rewritten = transform(entry.name, source);
    if (rewritten === null) cpSync(source, target);
    else writeFileSync(target, rewritten);
  }
}

/**
 * Writes a generated app to `out`.
 *
 * The template's dependencies are already concrete - `bundleTemplates.mjs` resolved them when the
 * creator was packed - so nothing here has to know about workspaces or catalogs.
 */
export function scaffold({ templateDir, out, name, appId, appName, engine, pragmas }) {
  if (!existsSync(templateDir)) throw new Error(`no template at ${templateDir}`);
  if (existsSync(out)) throw new Error(`${out} already exists`);

  const templateName = basename(templateDir);
  const identity = { package: name, appId };

  copyTree(templateDir, out, (entry, source) => {
    const text = readFileSync(source, "utf8");
    if (entry === "package.json" && source === join(templateDir, "package.json")) {
      return manifest(text, { name: identity, appName, templateName });
    }
    return personalise(entry, text, { name: identity, appName });
  });

  /**
   * A real `.env` when the generator was told which engine to prefer.
   *
   * Written rather than editing `storage.config.ts`, because the config is code someone will read
   * and change, while the choice of engine for one deployment is configuration. `.env.example` is
   * copied in by the template and documents every value.
   */
  if (engine || pragmas) {
    const lines = ["# Written by @cavulsqa/create. See .env.example for what these mean.", ""];
    if (engine) lines.push(`VITE_STORAGE_ENGINE=${engine}`);
    if (pragmas) lines.push(`VITE_PRAGMA_PROFILE=${pragmas}`);
    writeFileSync(join(out, ".env"), `${lines.join("\n")}\n`);
  }

  // pnpm will not finish an install while a dependency's build script is neither allowed nor
  // denied, and vite-plus pulls esbuild in. Without this every generated app fails its first
  // `pnpm install` with ERR_PNPM_IGNORED_BUILDS.
  writeFileSync(join(out, "pnpm-workspace.yaml"), "allowBuilds:\n  esbuild: true\n");

  // Inside the monorepo the template leaned on the root for the ordinary ignores.
  const ignore = join(out, ".gitignore");
  const existing = existsSync(ignore) ? readFileSync(ignore, "utf8").trim() : "";
  writeFileSync(
    ignore,
    [
      "node_modules",
      "dist",
      "*.log",
      ".env",
      ".env.*",
      "!.env.example",
      ".DS_Store",
      "",
      "# Generated native projects. Recreate with `npx cap add android`.",
      "android",
      "ios",
      "",
      existing,
      "",
    ].join("\n"),
  );

  writeFileSync(
    join(out, "README.md"),
    `# ${appName}

Generated from \`@cavulsqa/create\` (${templateName}).

\`\`\`bash
pnpm install
pnpm dev            # browser, sql.js in memory - data does not survive a reload
npx cap add android # once
pnpm build && npx cap sync android && npx cap run android
\`\`\`

Android builds need **JDK 21**; an older one fails with \`invalid source release: 21\`.

\`CLAUDE.md\` and \`.claude/\` carry the architecture an agent needs before editing anything here.
`,
  );

  return { templateName };
}
