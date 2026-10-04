/** Columns and sorting for `M3DataTable`, pure so ordering is testable. */
export interface DataColumn<T> {
  key: string;
  label: string;
  /** Reads the cell's value from a row; `row[key]` when omitted. */
  value?: (row: T) => unknown;
  /** Text shown in the cell; the value as text when omitted. */
  format?: (value: unknown, row: T) => string;
  /** Right-aligned with tabular figures, and sorted as numbers. */
  numeric?: boolean;
  sortable?: boolean;
  /** Any CSS width, such as `8rem` or `120px`. */
  width?: string;
}

export interface DataSort {
  key: string;
  direction: "ascending" | "descending";
}

export function cellValue<T>(row: T, column: DataColumn<T>): unknown {
  if (column.value) return column.value(row);
  return (row as Record<string, unknown>)[column.key];
}

/** A value as cell text: numbers and text as they are, dates in the locale, anything else as JSON. */
export function textOf(value: unknown, locale?: string): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return value.toString();
  }
  if (value instanceof Date) return value.toLocaleDateString(locale);
  return JSON.stringify(value) ?? "";
}

export function cellText<T>(row: T, column: DataColumn<T>, locale?: string): string {
  const value = cellValue(row, column);
  if (column.format) return column.format(value, row);
  return textOf(value, locale);
}

/**
 * The rows in the sort's order: numbers as numbers, text by the locale's collation with numbers
 * inside it read as numbers ("SO-9" before "SO-10"), empty values last in either direction, and
 * rows that compare equal keeping their order.
 */
export function sortRows<T>(
  rows: readonly T[],
  columns: readonly DataColumn<T>[],
  sort: DataSort | null,
  locale?: string,
): T[] {
  const column = sort ? columns.find((candidate) => candidate.key === sort.key) : undefined;
  if (!sort || !column) return rows.slice();
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: "base" });
  const sign = sort.direction === "ascending" ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index, value: cellValue(row, column) }))
    .sort((a, b) => {
      const emptyA = a.value === null || a.value === undefined || a.value === "";
      const emptyB = b.value === null || b.value === undefined || b.value === "";
      if (emptyA || emptyB) return emptyA === emptyB ? a.index - b.index : emptyA ? 1 : -1;
      const order =
        typeof a.value === "number" && typeof b.value === "number"
          ? a.value - b.value
          : collator.compare(textOf(a.value, locale), textOf(b.value, locale));
      return order === 0 ? a.index - b.index : order * sign;
    })
    .map((entry) => entry.row);
}

/** The next sort when a header is pressed: ascending, then descending, then none. */
export function nextSort(current: DataSort | null, key: string): DataSort | null {
  if (!current || current.key !== key) return { key, direction: "ascending" };
  if (current.direction === "ascending") return { key, direction: "descending" };
  return null;
}
