import type { Dialect } from "kysely";

export type StorageId =
  | "sqlite-wasm-opfs-sahpool"
  | "wa-sqlite-access-handle-pool"
  | "wa-sqlite-opfs-async"
  | "wa-sqlite-idb-batch-atomic";

export interface StorageProbe {
  supported: boolean;
  /** Present when unsupported, phrased so the person reading it can act on it. */
  reason?: string;
}

/**
 * One way to persist SQLite, described well enough to choose between them without reading the code.
 *
 * A candidate is not a config flag: it owns its own capability check and its own lazy import, so a
 * chain that never reaches the fourth entry never downloads the fourth entry's wasm.
 */
export interface StorageCandidate {
  id: StorageId;
  label: string;
  /** What it costs. Every entry has one, and an entry claiming none is a lie. */
  tradeoff: string;
  durable: boolean;
  /**
   * Whether the numbers behind its position in the chain came from a device or from a vendor's
   * README. Only one entry is currently `measured`, and the ordering says so rather than implying
   * more confidence than we have.
   */
  evidence: "measured" | "expected";
  probe: () => StorageProbe;
  createDialect: () => Promise<Dialect>;
}

export interface StorageAttempt {
  id: StorageId;
  outcome: "opened" | "unsupported" | "failed";
  detail?: string;
}
