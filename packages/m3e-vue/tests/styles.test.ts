import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const components = walk(join(import.meta.dirname, "../src/components")).filter((file) =>
  file.endsWith(".vue"),
);

describe("scoped styles", () => {
  it.each(components)("%s wraps whole selectors in :global()", (file) => {
    const css = readFileSync(file, "utf8").split("<style")[1] ?? "";
    expect(css).not.toMatch(/:global\([^)]*\)\s*[^\s,{)]/);
  });
});
