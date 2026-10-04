/** The arithmetic of a stepper, pure so rounding and repeat speed-up are testable. */
export interface StepBounds {
  min: number;
  max: number;
  step: number;
}

/** Decimal places a step needs, so 0.1 + 0.2 shows as 0.3. */
export function decimalsOf(step: number): number {
  const text = String(step);
  const exponent = /e-(\d+)$/.exec(text);
  if (exponent) return Number(exponent[1]);
  const dot = text.indexOf(".");
  return dot < 0 ? 0 : text.length - dot - 1;
}

/** Snaps to the step grid from `min`, clamps, and drops float dust. */
export function snapStep(value: number, bounds: StepBounds): number {
  const { min, max, step } = bounds;
  const snapped = step > 0 ? Math.round((value - min) / step) * step + min : value;
  const clamped = Math.min(max, Math.max(min, snapped));
  return Number(clamped.toFixed(decimalsOf(step)));
}

/** Moves by a number of steps. */
export function stepBy(value: number, steps: number, bounds: StepBounds): number {
  return snapStep(value + steps * bounds.step, bounds);
}

/**
 * Framework7's dynamic auto-repeat: a held button speeds up the longer it is held - one step per
 * tick at first, five after 1.5s, ten after 3s - but only across a range wide enough that a single
 * step would take too long.
 */
export function repeatSteps(heldMs: number, bounds: StepBounds): number {
  const span = bounds.step > 0 ? (bounds.max - bounds.min) / bounds.step : 0;
  if (span < 50) return 1;
  if (heldMs >= 3000) return 10;
  if (heldMs >= 1500) return 5;
  return 1;
}

/** Reads what a person typed, accepting a decimal comma; null when it is not a number. */
export function parseTyped(text: string): number | null {
  const normalised = text.trim().replace(/\s/g, "").replace(",", ".");
  if (normalised === "" || !/^[-+]?\d*\.?\d+$|^[-+]?\d+\.$/.test(normalised)) return null;
  const value = Number(normalised);
  return Number.isFinite(value) ? value : null;
}
