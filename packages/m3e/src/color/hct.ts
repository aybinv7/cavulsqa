import { Hct, argbFromHex, hexFromArgb } from "@material/material-color-utilities";
import { isHexColor } from "./scheme.js";

/** A colour as Material reasons about it: hue in degrees, chroma (colourfulness), tone (0 black - 100 white). */
export interface HctColor {
  hue: number;
  chroma: number;
  tone: number;
}

const normaliseHue = (hue: number) => ((hue % 360) + 360) % 360;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** `#rgb` or `#rrggbb` to HCT; throws on anything else. */
export function hexToHct(hex: string): HctColor {
  const normalised = expandHex(hex);
  const hct = Hct.fromInt(argbFromHex(normalised));
  return { hue: hct.hue, chroma: hct.chroma, tone: hct.tone };
}

/**
 * The nearest displayable colour to `color` as `#rrggbb`. Asking for more chroma than a hue and
 * tone allow gives the most there is, keeping hue and tone - the way Material solves it.
 */
export function hctToHex(color: HctColor): string {
  const hct = Hct.from(
    normaliseHue(color.hue),
    Math.max(0, color.chroma),
    clamp(color.tone, 0, 100),
  );
  return hexFromArgb(hct.toInt());
}

/** The most chroma a hue reaches at a tone on screen, for scaling a chroma control. */
export function maxChroma(hue: number, tone: number): number {
  return Hct.from(normaliseHue(hue), 200, clamp(tone, 0, 100)).chroma;
}

/** `#abc` → `#aabbcc`, lower-cased; throws on anything that is not a 3- or 6-digit hex colour. */
export function expandHex(hex: string): string {
  const value = hex.trim().toLowerCase();
  const short = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(value);
  const full = short
    ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`
    : value.startsWith("#")
      ? value
      : `#${value}`;
  if (!isHexColor(full)) throw new TypeError(`"${hex}" is not a hex colour`);
  return full;
}
