import { materialShapeCubics, type MaterialShapeName } from "./materialShapes.js";
import { toSvgPath } from "./transform.js";

const paths = new Map<MaterialShapeName, string>();
const masks = new Map<MaterialShapeName, string>();

/** The shape's outline as an SVG path over a 100 x 100 box, computed once per shape. */
export function materialShapePath(name: MaterialShapeName): string {
  let path = paths.get(name);
  if (!path) {
    path = toSvgPath(materialShapeCubics(name));
    paths.set(name, path);
  }
  return path;
}

/**
 * A CSS `mask-image` value that cuts whatever an element draws to the shape, at any size. Prefer it
 * over `clip-path: path()`, which is in pixels and does not scale with the box.
 */
export function materialShapeMask(name: MaterialShapeName): string {
  let mask = masks.get(name);
  if (!mask) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="${materialShapePath(name)}"/></svg>`;
    mask = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    masks.set(name, mask);
  }
  return mask;
}
