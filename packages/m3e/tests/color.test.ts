import { expect, test } from "vite-plus/test";
import { COLOR_ROLES, resolveExtras, resolveRoles } from "../src/color/roles.js";
import {
  InvalidSeedError,
  SCHEME_VARIANTS,
  createScheme,
  effectiveSpec,
  seedArgb,
} from "../src/color/scheme.js";
import { colorStylesheet } from "../src/tokens/stylesheet.js";

const SEED = "#e00b19";
const HEX = /^#[0-9a-f]{6}$/;

test("every variant resolves every role, in both modes", () => {
  for (const variant of SCHEME_VARIANTS) {
    for (const isDark of [false, true]) {
      const colors = resolveRoles(createScheme({ seed: SEED, variant, isDark }));
      for (const role of COLOR_ROLES) expect(colors[role], `${variant} ${role}`).toMatch(HEX);
    }
  }
});

test("the 2025 spec reaches only the variants material-color-utilities applies it to", () => {
  expect(effectiveSpec("expressive")).toBe("2025");
  expect(effectiveSpec("tonalSpot")).toBe("2025");
  expect(effectiveSpec("brand")).toBe("2021");
  expect(effectiveSpec("fidelity")).toBe("2021");
  expect(createScheme({ seed: SEED, variant: "vibrant", isDark: false }).specVersion).toBe("2025");
  expect(createScheme({ seed: SEED, variant: "content", isDark: false }).specVersion).toBe("2021");
});

test("brand keeps the seed exact as the primary container", () => {
  for (const isDark of [false, true]) {
    const colors = resolveRoles(createScheme({ seed: SEED, variant: "brand", isDark }));
    expect(colors["primary-container"]).toBe(SEED);
  }
});

test("light and dark surfaces are ordered by tone", () => {
  const luminance = (hex: string) =>
    parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);
  const light = resolveRoles(createScheme({ seed: SEED, isDark: false }));
  const dark = resolveRoles(createScheme({ seed: SEED, isDark: true }));
  expect(luminance(light.surface)).toBeGreaterThan(luminance(dark.surface));
  expect(luminance(light["surface-container-lowest"])).toBeGreaterThanOrEqual(
    luminance(light["surface-container-highest"]),
  );
  expect(luminance(dark["surface-container-lowest"])).toBeLessThanOrEqual(
    luminance(dark["surface-container-highest"]),
  );
});

test("higher contrast pushes on-surface-variant further from the surface", () => {
  const distance = (contrast: number) => {
    const colors = resolveRoles(createScheme({ seed: SEED, isDark: false, contrast }));
    return Math.abs(
      parseInt(colors.surface.slice(1, 3), 16) -
        parseInt(colors["on-surface-variant"].slice(1, 3), 16),
    );
  };
  expect(distance(1)).toBeGreaterThan(distance(0));
});

test("short hex seeds expand and bad seeds fail loudly", () => {
  expect(seedArgb("#fff")).toBe(seedArgb("#ffffff"));
  expect(() => createScheme({ seed: "red", isDark: false })).toThrow(InvalidSeedError);
});

test("custom colours publish the four roles of an M3 custom group", () => {
  const extras = resolveExtras(SEED, { success: "#1c7a4a" }, { isDark: false });
  expect(Object.keys(extras).sort()).toEqual([
    "on-success",
    "on-success-container",
    "success",
    "success-container",
  ]);
  for (const value of Object.values(extras)) expect(value).toMatch(HEX);
});

test("the colour stylesheet declares both modes under their selectors", () => {
  const css = colorStylesheet({
    seed: SEED,
    variant: "expressive",
    extras: { warning: "#c08a2e" },
  });
  expect(css.startsWith(":root{color-scheme:light;--md-sys-color-primary:#")).toBe(true);
  expect(css).toContain(":root.dark{color-scheme:dark;");
  expect(css).toContain("--md-sys-color-on-warning-container:#");
  expect(css.match(/--md-sys-color-surface-container-high:/g)).toHaveLength(2);
});
