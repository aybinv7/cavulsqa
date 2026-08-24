let instanceCounter = 0;

/**
 * A key unique to this call, so the query is never deduplicated against another and its
 * `cacheTime` window is its own.
 *
 * A `queryKey` is an *identity*: two mounted queries sharing one await a single request and share
 * the result. That is what you want for the same list rendered twice, and wrong for two different
 * queries that happen to be named alike - the second would be handed the first's rows. Reach for a
 * stable literal only when sharing is the intent; otherwise call this.
 */
export function uniqueQueryKey(prefix: string): string {
  instanceCounter += 1;
  return `${prefix}#${instanceCounter}`;
}
