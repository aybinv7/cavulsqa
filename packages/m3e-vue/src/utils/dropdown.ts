/** Option search for the exposed dropdown, pure so matching and keyboard movement are testable. */
export interface DropdownOption<V> {
  value: V;
  label: string;
  supporting?: string;
  disabled?: boolean;
}

/** Lower case with diacritics stripped, so "constantine" finds "Constantine" and "bejaia" "Béjaïa". */
export function searchKey(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** Options whose label contains the query, those starting with it first; at most `limit`. */
export function filterOptions<V>(
  options: readonly DropdownOption<V>[],
  query: string,
  limit: number,
): DropdownOption<V>[] {
  const key = searchKey(query.trim());
  if (!key) return options.slice(0, limit);
  const starts: DropdownOption<V>[] = [];
  const contains: DropdownOption<V>[] = [];
  for (const option of options) {
    const index = searchKey(option.label).indexOf(key);
    if (index === 0) starts.push(option);
    else if (index > 0) contains.push(option);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}

/**
 * The label split around the first match, for bolding it. The label is folded one UTF-16 unit at a
 * time, so offsets in the folded text are offsets in the label; a label with a unit that does not
 * fold to exactly one (a decomposed accent) falls back to a plain case-insensitive search.
 */
export function highlightParts(
  label: string,
  query: string,
): { before: string; match: string; after: string } | null {
  const trimmed = query.trim();
  const key = searchKey(trimmed);
  if (!key) return null;
  const split = (index: number, length: number) =>
    index < 0
      ? null
      : {
          before: label.slice(0, index),
          match: label.slice(index, index + length),
          after: label.slice(index + length),
        };
  let folded = "";
  for (let index = 0; index < label.length; index++) {
    const unit = searchKey(label.charAt(index));
    if (unit.length !== 1) {
      return split(label.toLowerCase().indexOf(trimmed.toLowerCase()), trimmed.length);
    }
    folded += unit;
  }
  return split(folded.indexOf(key), key.length);
}

/** The next enabled option from `from` in `direction`, wrapping; -1 when none is enabled. */
export function nextEnabled<V>(
  options: readonly DropdownOption<V>[],
  from: number,
  direction: 1 | -1,
): number {
  const count = options.length;
  for (let step = 1; step <= count; step++) {
    const index = (((from + direction * step) % count) + count) % count;
    if (!options[index]!.disabled) return index;
  }
  return -1;
}

/** Type-ahead for a read-only dropdown: the next enabled option after `from` starting with `prefix`. */
export function typeahead<V>(
  options: readonly DropdownOption<V>[],
  prefix: string,
  from: number,
): number {
  const key = searchKey(prefix);
  const count = options.length;
  for (let step = 1; step <= count; step++) {
    const index = (from + step) % count;
    const option = options[index]!;
    if (!option.disabled && searchKey(option.label).startsWith(key)) return index;
  }
  return -1;
}
