import { CompiledQuery, Kysely, sql } from "kysely";
import { expect, test } from "vite-plus/test";
import { createSqlJsDialect } from "../src/testing/sqlJsDialect.js";

const SEED_ROWS = 1024;
const SEED_BYTES_PER_ROW = 1024;

async function seededDatabase(): Promise<Kysely<any>> {
  const db = new Kysely<any>({ dialect: await createSqlJsDialect() });
  await sql`CREATE TABLE payload (id INTEGER PRIMARY KEY, body TEXT NOT NULL)`.execute(db);
  await sql`
    WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < ${SEED_ROWS})
    INSERT INTO payload (id, body) SELECT i, hex(randomblob(${SEED_BYTES_PER_ROW / 2})) FROM n
  `.execute(db);
  return db;
}

/**
 * A memory test, not a speed test: fifty seeded databases take about five seconds on a CI runner,
 * right at Vitest's default timeout, so it gets room of its own.
 */
const FIFTY_DATABASES_TIMEOUT_MS = 60_000;

test(
  "destroying a seeded database releases its heap, so a file can seed fifty of them",
  async () => {
    for (let round = 0; round < 50; round++) {
      const db = await seededDatabase();
      const { rows } = await sql<{ count: number }>`SELECT count(*) AS count FROM payload`.execute(
        db,
      );
      expect(rows[0]?.count).toBe(SEED_ROWS);
      await db.destroy();
    }
  },
  FIFTY_DATABASES_TIMEOUT_MS,
);

test("destroy closes the database, and a second destroy is a no-op", async () => {
  const dialect = await createSqlJsDialect();
  const driver = dialect.createDriver();
  const connection = await driver.acquireConnection();

  await driver.destroy();
  await expect(driver.destroy()).resolves.toBeUndefined();
  await expect(connection.executeQuery(CompiledQuery.raw("SELECT 1"))).rejects.toThrow("destroyed");
});
