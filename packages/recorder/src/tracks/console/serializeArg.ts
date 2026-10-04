import type { ConsoleArgRecord, ConsolePropRecord } from "../../capu/types.js";

/** Deepest object level serialized. Objects below it become a description with `overflow: true`. */
export const MAX_ARG_DEPTH = 3;

/** Own properties kept per object level; the rest is dropped and flagged with `overflow: true`. */
export const MAX_ARG_PROPERTIES = 64;

/** Longest `text` or `description` in characters. Longer strings are cut and end with `…`. */
export const MAX_ARG_TEXT = 2048;

const ELLIPSIS = "…";

type ObjectRecord = Extract<ConsoleArgRecord, { kind: "object" }>;

/** Caps a string at `MAX_ARG_TEXT` characters, ending it with an ellipsis when it was cut. */
export function truncateText(text: string): string {
  if (text.length <= MAX_ARG_TEXT) return text;
  return text.slice(0, MAX_ARG_TEXT - 1) + ELLIPSIS;
}

/** The plain-text form of a record used for the entry's `text`: the primitive text or the description. */
export function argToText(record: ConsoleArgRecord): string {
  return record.kind === "primitive" ? record.text : record.description;
}

/**
 * Converts one console argument into the `ConsoleArgRecord` shape Capubridge renders. Bounded by
 * `MAX_ARG_DEPTH`, `MAX_ARG_PROPERTIES` and `MAX_ARG_TEXT`; cycles serialize as `[Circular]`.
 */
export function serializeArg(value: unknown): ConsoleArgRecord {
  return serialize(value, 0, new Set());
}

function serialize(value: unknown, depth: number, ancestors: Set<object>): ConsoleArgRecord {
  if (value === null) return objectRecord("null", "null", [], false);
  switch (typeof value) {
    case "string":
      return primitive(value);
    case "number":
    case "boolean":
    case "undefined":
      return primitive(String(value));
    case "bigint":
      return primitive(`${value}n`);
    case "symbol":
      return primitive(value.toString());
    case "function":
      return primitive(functionText(value));
    default:
      return serializeObject(value as object, depth, ancestors);
  }
}

function primitive(text: string): ConsoleArgRecord {
  return { kind: "primitive", text: truncateText(text) };
}

function objectRecord(
  description: string,
  subtype: string | null,
  properties: ConsolePropRecord[],
  overflow: boolean,
): ObjectRecord {
  return { kind: "object", description: truncateText(description), subtype, properties, overflow };
}

function functionText(fn: Function): string {
  return fn.name ? `ƒ ${fn.name}()` : "ƒ ()";
}

function serializeObject(value: object, depth: number, ancestors: Set<object>): ConsoleArgRecord {
  if (ancestors.has(value)) return objectRecord("[Circular]", null, [], false);

  const { description, subtype, entries } = describe(value);
  if (entries.length === 0) return objectRecord(description, subtype, [], false);
  if (depth >= MAX_ARG_DEPTH) return objectRecord(description, subtype, [], true);

  ancestors.add(value);
  try {
    const kept = entries.slice(0, MAX_ARG_PROPERTIES);
    const properties = kept.map(([name, prop]) => ({
      name: truncateText(name),
      value: serialize(prop, depth + 1, ancestors),
    }));
    return objectRecord(description, subtype, properties, entries.length > kept.length);
  } finally {
    ancestors.delete(value);
  }
}

interface Described {
  description: string;
  subtype: string | null;
  entries: Array<[string, unknown]>;
}

function describe(value: object): Described {
  if (Array.isArray(value)) {
    return {
      description: `Array(${value.length})`,
      subtype: "array",
      entries: value.map((item, index) => [String(index), item]),
    };
  }
  if (value instanceof Error) {
    const entries: Array<[string, unknown]> = [["stack", value.stack ?? ""]];
    for (const [name, prop] of ownEntries(value)) {
      if (name !== "stack" && name !== "message") entries.push([name, prop]);
    }
    return { description: `${value.name}: ${value.message}`, subtype: "error", entries };
  }
  if (value instanceof Date) {
    return { description: dateText(value), subtype: "date", entries: [] };
  }
  if (value instanceof Map) {
    return {
      description: `Map(${value.size})`,
      subtype: "map",
      entries: Array.from(value, ([key, item]) => [keyText(key), item]),
    };
  }
  if (value instanceof Set) {
    return {
      description: `Set(${value.size})`,
      subtype: "set",
      entries: Array.from(value, (item, index) => [String(index), item]),
    };
  }
  return { description: constructorName(value), subtype: null, entries: ownEntries(value) };
}

function ownEntries(value: object): Array<[string, unknown]> {
  const entries: Array<[string, unknown]> = [];
  for (const name of Object.keys(value)) {
    try {
      entries.push([name, (value as Record<string, unknown>)[name]]);
    } catch (err) {
      entries.push([name, `[Throws: ${errorText(err)}]`]);
    }
  }
  return entries;
}

function constructorName(value: object): string {
  const proto: unknown = Object.getPrototypeOf(value);
  if (proto === null) return "Object";
  const ctor = (proto as { constructor?: { name?: string } }).constructor;
  return ctor?.name || "Object";
}

function dateText(value: Date): string {
  return Number.isNaN(value.getTime()) ? "Invalid Date" : value.toISOString();
}

function keyText(key: unknown): string {
  if (typeof key === "string") return key;
  if (key === null || typeof key !== "object") return String(key);
  return constructorName(key);
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
