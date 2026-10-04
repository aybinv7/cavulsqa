/** Sequential ids unique within one track instance, prefixed so ids from separate sessions do not collide. */
export function createRequestIdFactory(
  prefix: string = Math.random().toString(36).slice(2, 8),
): () => string {
  let counter = 0;
  return () => `${prefix}-${++counter}`;
}
