import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import type { Plugin, ViteDevServer } from "vite-plus";

/** Quiet time after the last write before a rebuild counts as finished. */
const SETTLE_MS = 300;

const pathKey = (path: string) => {
  const absolute = resolve(path);
  return process.platform === "win32" ? absolute.toLowerCase() : absolute;
};

/**
 * `@cavulsqa` packages linked from the workspace, as opposed to installed from the registry - the
 * ones whose `dist` changes under a running dev server while their watchers rebuild them.
 */
export function linkedPackages(root: string, names: readonly string[]): string[] {
  return names.filter((name) => {
    const path = join(root, "node_modules", name);
    return existsSync(path) && !realpathSync(path).split(sep).includes("node_modules");
  });
}

function exportedFiles(packageDir: string): string[] {
  const manifest = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8")) as {
    exports?: unknown;
    main?: string;
    module?: string;
  };
  const files = new Set<string>();
  const collect = (value: unknown) => {
    if (typeof value === "string" && !value.includes("*")) files.add(join(packageDir, value));
    else if (value && typeof value === "object") Object.values(value).forEach(collect);
  };
  collect(manifest.exports);
  collect(manifest.main);
  collect(manifest.module);
  return [...files];
}

/**
 * One clean reload per rebuild of a linked package. Left to itself the dev server reloads on the
 * first file the build touches - often while `dist` has just been emptied, so the page asks for an
 * entry that is not there yet and boots blank. It also never notices the stylesheet `app.css`
 * imports, so a rebuild paired new JavaScript with old scoped styles. Here every change or
 * deletion under a linked `dist` - through both of Vite's HMR hooks - is held back until writing
 * stops and every exported file exists again with the same size on two checks in a row (a file that
 * exists can still be half written); then the cached CSS is dropped and the page reloads once.
 */
export function linkedRebuilds(root: string, names: readonly string[]): Plugin {
  const packages = names.map((name) => realpathSync(join(root, "node_modules", name)));
  const dists = packages.map((dir) => pathKey(join(dir, "dist")) + sep);
  const required = packages.flatMap(exportedFiles);
  const inDist = (file: string) => dists.some((dist) => pathKey(file).startsWith(dist));

  let server: ViteDevServer | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let sizes = "";

  const snapshot = () =>
    required.map((file) => (existsSync(file) ? statSync(file).size : -1)).join(",");

  const reload = () => {
    if (!server) return;
    const now = snapshot();
    const settled = now === sizes && !now.split(",").includes("-1");
    sizes = now;
    if (!settled) {
      timer = setTimeout(reload, SETTLE_MS);
      return;
    }
    for (const module of server.moduleGraph.idToModuleMap.values()) {
      if (module.file?.endsWith(".css")) server.moduleGraph.invalidateModule(module);
    }
    server.ws.send({ type: "full-reload" });
  };

  const schedule = () => {
    clearTimeout(timer);
    sizes = "";
    timer = setTimeout(reload, SETTLE_MS);
  };

  return {
    name: "cavulsqa:linked-rebuilds",
    apply: "serve",
    configureServer(devServer) {
      if (packages.length === 0) return;
      server = devServer;
      devServer.watcher.add(packages.map((dir) => join(dir, "dist")));
      for (const event of ["add", "change", "unlink"] as const) {
        devServer.watcher.on(event, (file) => {
          if (inDist(file)) schedule();
        });
      }
    },
    hotUpdate({ file }) {
      if (inDist(file)) return [];
    },
    handleHotUpdate({ file }) {
      if (inDist(file)) return [];
    },
  };
}
