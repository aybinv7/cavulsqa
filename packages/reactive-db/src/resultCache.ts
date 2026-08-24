interface CacheEntry {
  value: unknown;
  tables: string[];
}

export interface ResultCache {
  get(key: string): unknown;
  set(key: string, value: unknown, tables: string[]): void;
  invalidateTable(table: string): void;
  clear(): void;
}

export function createResultCache(maxEntries: number): ResultCache {
  const entries = new Map<string, CacheEntry>();

  return {
    get(key) {
      const entry = entries.get(key);
      if (entry === undefined) return undefined;
      entries.delete(key);
      entries.set(key, entry);
      return entry.value;
    },
    set(key, value, tables) {
      if (entries.has(key)) entries.delete(key);
      entries.set(key, { value, tables });
      while (entries.size > maxEntries) {
        const oldest = entries.keys().next().value as string;
        entries.delete(oldest);
      }
    },
    invalidateTable(table) {
      for (const [key, entry] of entries) {
        if (entry.tables.includes(table)) entries.delete(key);
      }
    },
    clear() {
      entries.clear();
    },
  };
}
