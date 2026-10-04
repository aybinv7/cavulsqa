/**
 * Splits what was typed into a chip field into finished entries and the text still being typed:
 * every separator ends an entry, so "north, south, ea" gives ["north", "south"] and "ea". Entries
 * are trimmed and empty ones dropped.
 */
export function splitEntries(
  text: string,
  separators: readonly string[],
): { entries: string[]; rest: string } {
  const marks = separators.filter((separator) => separator.length === 1);
  if (marks.length === 0) return { entries: [], rest: text };
  const parts: string[] = [];
  let current = "";
  for (const char of text) {
    if (marks.includes(char)) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  return {
    entries: parts.map((part) => part.trim()).filter((part) => part.length > 0),
    rest: current,
  };
}

/** Whether `value` is already among `entries`, ignoring case and surrounding space. */
export function hasEntry(entries: readonly string[], value: string): boolean {
  const needle = value.trim().toLocaleLowerCase();
  return entries.some((entry) => entry.trim().toLocaleLowerCase() === needle);
}
