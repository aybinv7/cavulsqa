export type CodeAlphabet = "numeric" | "alphanumeric";

const ALLOWED: Record<CodeAlphabet, RegExp> = {
  numeric: /[0-9]/,
  alphanumeric: /[0-9A-Z]/,
};

function westernDigit(char: string): string {
  const code = char.charCodeAt(0);
  if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
  if (code >= 0x06f0 && code <= 0x06f9) return String(code - 0x06f0);
  return char;
}

/**
 * What a code field keeps of what was typed or pasted: the characters its alphabet allows,
 * alphanumeric ones upper-cased, up to `length`. A pasted "Your code: 482 913" becomes "482913", and
 * Arabic-Indic digits from an Arabic keyboard count as the digits they are.
 */
export function sanitizeCode(
  raw: string,
  length: number,
  alphabet: CodeAlphabet = "numeric",
): string {
  const allowed = ALLOWED[alphabet];
  let code = "";
  for (const typed of raw.normalize("NFKC").toUpperCase()) {
    const char = westernDigit(typed);
    if (!allowed.test(char)) continue;
    code += char;
    if (code.length >= length) break;
  }
  return code;
}
