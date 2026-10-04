const REDACTED_VALUE = "[redacted]";

/** Header names redacted by default, matched case-insensitively. Extend via `RedactOptions.extraHeaders`. */
export const DEFAULT_REDACTED_HEADERS: readonly string[] = [
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "proxy-authorization",
];

/** Largest response or request body kept, in bytes. Larger bodies are skipped, not truncated. */
export const MAX_BODY_BYTES = 512 * 1024;

const RECORDABLE_CONTENT_TYPES = ["application/json", "application/x-www-form-urlencoded"] as const;

export interface RedactOptions {
  /** Additional header names (case-insensitive) redacted alongside `DEFAULT_REDACTED_HEADERS`. */
  extraHeaders?: readonly string[];
}

/** Returns a lowercase set of every header name this call redacts. */
export function buildRedactedHeaderSet(options: RedactOptions = {}): Set<string> {
  const names = [...DEFAULT_REDACTED_HEADERS, ...(options.extraHeaders ?? [])];
  return new Set(names.map((name) => name.toLowerCase()));
}

/** Replaces every header in `redacted` with `[redacted]`, leaving the rest of `headers` untouched. */
export function redactHeaders(
  headers: Record<string, string> | null,
  redacted: ReadonlySet<string>,
): Record<string, string> | null {
  if (!headers) return null;
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    out[name] = redacted.has(name.toLowerCase()) ? REDACTED_VALUE : value;
  }
  return out;
}

function contentTypeIsRecordable(contentType: string | null): boolean {
  if (!contentType) return false;
  const normalized = contentType.toLowerCase();
  if (normalized.startsWith("text/")) return true;
  return RECORDABLE_CONTENT_TYPES.some((allowed) => normalized.startsWith(allowed));
}

export interface RecordableBodyResult {
  body: string | null;
  error: string | null;
}

/**
 * Decides whether `text` may be kept for `contentType`: only JSON, text/* and form-urlencoded
 * under `MAX_BODY_BYTES`. Anything else comes back as `body: null` with `error` explaining why.
 */
export function toRecordableBody(
  text: string | null,
  contentType: string | null,
): RecordableBodyResult {
  if (text === null) return { body: null, error: null };
  if (!contentTypeIsRecordable(contentType)) {
    return { body: null, error: `skipped: unsupported content-type ${contentType ?? "unknown"}` };
  }
  const byteLength = new TextEncoder().encode(text).length;
  if (byteLength > MAX_BODY_BYTES) {
    return { body: null, error: `skipped: body exceeded ${MAX_BODY_BYTES} bytes` };
  }
  return { body: text, error: null };
}

/** Reads the `content-type` header from a header map, independent of casing. */
export function getContentType(headers: Record<string, string> | null): string | null {
  if (!headers) return null;
  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() === "content-type") return value;
  }
  return null;
}
