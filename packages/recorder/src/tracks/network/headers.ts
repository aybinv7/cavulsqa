/** Normalizes any fetch `HeadersInit` (a `Headers`, a plain object, or an entries array) to a plain map. */
export function normalizeHeadersInit(
  headers: HeadersInit | Headers | null | undefined,
): Record<string, string> | null {
  if (!headers) return null;
  const out: Record<string, string> = {};
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }
  if (Array.isArray(headers)) {
    for (const [key, value] of headers) out[key] = value;
    return out;
  }
  for (const [key, value] of Object.entries(headers as Record<string, string>)) {
    out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : null;
}
