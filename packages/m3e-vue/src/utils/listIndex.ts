/** The key under a finger on an index rail, pure so the edges are testable. */
export function indexKeyAt(
  y: number,
  top: number,
  height: number,
  keys: readonly string[],
): string | null {
  if (keys.length === 0 || height <= 0) return null;
  const fraction = Math.min(0.999999, Math.max(0, (y - top) / height));
  return keys[Math.floor(fraction * keys.length)] ?? null;
}

/** Group keys from labels: first letters, accents folded, digits and symbols together under `#`. */
export function groupKey(label: string): string {
  const first = label.trim().normalize("NFD").replace(/\p{M}/gu, "").charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : "#";
}
