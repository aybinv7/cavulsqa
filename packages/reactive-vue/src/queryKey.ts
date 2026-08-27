import { isRef, toValue, type MaybeRefOrGetter } from "vue";
import type { QueryKey } from "@cavulsqa/reactive-db";

/**
 * Reads a key, unwrapping any refs inside it.
 *
 * `toValue` alone resolves the container, not its contents, so `["search", term]` hashed the ref
 * object itself: the hash never moved when the term did, and reading `_value` rather than `.value`
 * tracked nothing either - the key looked reactive and was not. Unwrapping here means the read
 * happens inside the caller's `computed`, which is what makes the dependency real.
 */
export function resolveQueryKey(key: MaybeRefOrGetter<QueryKey>): QueryKey {
  return toValue(key).map(unwrapRefs);
}

function unwrapRefs(value: unknown): unknown {
  if (isRef(value)) return unwrapRefs(value.value);
  if (Array.isArray(value)) return value.map(unwrapRefs);
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([field, inner]) => [field, unwrapRefs(inner)]),
    );
  }
  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}
