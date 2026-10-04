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
  /** Offered as a grouping in the column menu; text columns are, numeric ones are not, by default. */
  groupable?: boolean;
  /** Offered for hiding in the column menu; true by default. */
  hideable?: boolean;
  /** What a group's header shows in this column: the sum, the average or the count of its rows. */
  summary?: "sum" | "average" | "count";
  /** Text for a summary value; the locale's number format by default. */
  formatSummary?: (value: number) => string;
}

export interface ColumnMenuLabels {
  sortAscending: string;
  sortDescending: string;
  clearSort: string;
  groupBy: string;
  ungroup: string;
  pin: string;
  unpin: string;
  hide: string;
  columns: string;
}

export interface DataGroup<T> {
  key: string;
  label: string;
  rows: T[];
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
    .map((row, index) => {
      const value = cellValue(row, column);
      const empty = value === null || value === undefined || value === "";
      return { row, index, value, empty, text: empty ? "" : textOf(value, locale) };
    })
    .sort((a, b) => {
      if (a.empty || b.empty) return a.empty === b.empty ? a.index - b.index : a.empty ? 1 : -1;
      const order =
        typeof a.value === "number" && typeof b.value === "number"
          ? a.value - b.value
          : collator.compare(a.text, b.text);
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

/** The columns to draw: hidden ones out, pinned ones first in the order they were pinned. */
export function orderColumns<T>(
  columns: readonly DataColumn<T>[],
  hidden: readonly string[],
  pinned: readonly string[],
): DataColumn<T>[] {
  const visible = columns.filter((column) => !hidden.includes(column.key));
  const first = pinned
    .map((key) => visible.find((column) => column.key === key))
    .filter((column): column is DataColumn<T> => column !== undefined);
  return [...first, ...visible.filter((column) => !pinned.includes(column.key))];
}

/**
 * Rows split by one column's text, groups in the order their first row appears - so a table
 * sorted on that column keeps its groups in that order, and rows keep their order inside a group.
 */
export function groupRows<T>(
  rows: readonly T[],
  column: DataColumn<T>,
  locale?: string,
  emptyLabel = "-",
): DataGroup<T>[] {
  const groups = new Map<string, DataGroup<T>>();
  for (const row of rows) {
    const text = cellText(row, column, locale);
    const key = text === "" ? "" : `=${text}`;
    let group = groups.get(key);
    if (!group) {
      group = { key, label: text === "" ? emptyLabel : text, rows: [] };
      groups.set(key, group);
    }
    group.rows.push(row);
  }
  return [...groups.values()];
}

/** A column's summary over some rows, or null when it has none or there is nothing to sum. */
export function summarize<T>(rows: readonly T[], column: DataColumn<T>): number | null {
  if (!column.summary) return null;
  if (column.summary === "count") return rows.length;
  const numbers = rows
    .map((row) => cellValue(row, column))
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (numbers.length === 0) return null;
  const sum = numbers.reduce((total, value) => total + value, 0);
  return column.summary === "sum" ? sum : sum / numbers.length;
}
