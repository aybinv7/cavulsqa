const SESSION_ID_PREFIX = "capu_";
const SUFFIX_LENGTH = 6;
const BASE36 = "0123456789abcdefghijklmnopqrstuvwxyz";

function randomBase36(length: number): string {
  const bytes = new Uint8Array(length);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = "";
  for (let i = 0; i < length; i++) out += BASE36[(bytes[i] ?? 0) % 36];
  return out;
}

/** `capu_<Date.now()>_<6 base36 chars>`, always valid under `isValidSessionId`. */
export function createSessionId(now: number = Date.now()): string {
  return `${SESSION_ID_PREFIX}${now}_${randomBase36(SUFFIX_LENGTH)}`;
}

/**
 * The Capubridge Rust rules: non-empty after trim, no slash, no backslash, no `..`, no leading
 * dot. The id becomes a file name on the reader side.
 */
export function isValidSessionId(sessionId: string): boolean {
  if (typeof sessionId !== "string") return false;
  const trimmed = sessionId.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.includes("/") || trimmed.includes("\\") || trimmed.includes("..")) return false;
  if (trimmed.startsWith(".")) return false;
  return true;
}
