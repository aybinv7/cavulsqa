export type QueryKey = readonly unknown[];

/**
 * A stable string for a key array.
 *
 * The identity has to come from the arguments, not from a name the caller invents: two mounted
 * queries sharing an identity await one request and share its result, so `"order-detail"` used by
 * two detail pages showed one page the other page's order. `["order-detail", id]` cannot.
 */
export function hashQueryKey(key: QueryKey): string {
  return JSON.stringify(key, (_field, value: unknown) => {
    if (typeof value === "function" || typeof value === "symbol") {
      throw new Error(
        `[reactive-db] a query key cannot contain a ${typeof value}: it has no stable serialisation, ` +
          "so two different queries would hash alike and share each other's results. Key on the " +
          "values the query reads instead.",
      );
    }
    return isPlainObject(value) ? sortFields(value) : value;
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}

// `{ a, b }` and `{ b, a }` are the same query, and JSON.stringify would disagree.
function sortFields(value: Record<string, unknown>): Record<string, unknown> {
  const sorted: Record<string, unknown> = {};
  for (const field of Object.keys(value).sort()) sorted[field] = value[field];
  return sorted;
}
