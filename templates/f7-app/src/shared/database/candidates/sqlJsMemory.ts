import type { StorageCandidate } from "./types";

/**
 * sql.js, entirely in memory, and last in every chain.
 *
 * Nothing is persisted: closing the app loses everything. It exists so a browser with no usable
 * file system still runs the app rather than showing an error screen - useful while developing,
 * indefensible as a place to keep a day's orders, which is why `durable` says so and any chain that
 * lands here should tell the person using it.
 */
export const sqlJsMemory: StorageCandidate = {
  id: "sql-js-memory",
  label: "sql.js · in memory",
  tradeoff: "Not persisted at all. Everything is lost when the app closes.",
  durable: false,
  evidence: "measured",
  probe: () => ({ supported: true }),
  createDialect: async () => {
    const { createSqlJsDialect } = await import("@cavulsqa/mobile-db/testing");
    return createSqlJsDialect();
  },
};
