import { expect, test } from "vite-plus/test";
import { systemStylesheet } from "../src/tokens/stylesheet.js";

const css = systemStylesheet();

test("the shape scale includes the expressive steps", () => {
  expect(css).toContain("--md-sys-shape-corner-large-increased:20px;");
  expect(css).toContain("--md-sys-shape-corner-extra-large-increased:32px;");
  expect(css).toContain("--md-sys-shape-corner-extra-extra-large:48px;");
});

test("type tokens are in rem so they follow the user's text size", () => {
  expect(css).toContain("--md-sys-typescale-body-large-size:1rem;");
  expect(css).toContain("--md-sys-typescale-display-large-line-height:4rem;");
  expect(css).toContain("--md-sys-typescale-emphasized-title-medium-weight:700;");
  expect(css).toContain("--md-sys-typescale-headline-small-font:var(--md-ref-typeface-brand);");
});

test("spatial springs keep their overshoot as linear() curves; effects use the official beziers", () => {
  expect(css).toMatch(/--md-sys-motion-spring-fast-spatial:linear\(0, /);
  expect(css).toContain("--md-sys-motion-spring-fast-spatial-duration:350ms;");
  expect(css).toContain("--md-sys-motion-spring-default-effects:cubic-bezier(0.34, 0.8, 0.34, 1);");
  expect(css).toContain(
    "--md-sys-motion-easing-emphasized-decelerate:cubic-bezier(0.05, 0.7, 0.1, 1);",
  );
});

test("reduced motion collapses travel to 1ms and leaves effects alone", () => {
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  expect(reduced).toContain("--md-sys-motion-spring-slow-spatial-duration:1ms;");
  expect(reduced).not.toContain("effects");
});

test("the standard scheme is available for calmer products", () => {
  expect(systemStylesheet({ motion: "standard" })).toContain(
    "--md-sys-motion-spring-slow-spatial-duration:750ms;",
  );
});

test("elevation and state tokens are present", () => {
  expect(css).toContain("--md-sys-elevation-level0:none;");
  expect(css).toMatch(/--md-sys-elevation-level3:0 1px 3px 0 color-mix/);
  expect(css).toContain("--md-sys-state-pressed-opacity:0.1;");
});

test("joined scripts - Arabic and its neighbours - get zero tracking, the rest keep the scale's", () => {
  const css = systemStylesheet();
  const block = css.slice(css.indexOf(":root:lang(ar)"));
  expect(block).toContain("[lang]:lang(fa)");
  expect(block).toMatch(/--md-sys-typescale-label-large-tracking:\s*0[;}]/);
  expect(block).toMatch(/--md-sys-typescale-emphasized-body-medium-tracking:\s*0[;}]/);
  expect(css.slice(0, css.indexOf(":root:lang(ar)"))).toMatch(
    /--md-sys-typescale-label-large-tracking:\s*0\.0063rem/,
  );
});
