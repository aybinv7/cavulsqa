import type { OpfsExecResult, OpfsRequest, OpfsResponse, OpfsWorkerScope } from "./protocol.js";

/**
 * The worker half of the OPFS engine, as a function rather than a worker file.
 *
 * A library cannot ship a worker that an application's bundler will reliably build: the worker has
 * to be constructed from a URL the bundler can see, and it pulls in a `.wasm` asset that has to be
 * emitted and served by that same build. So the application owns a three-line worker file and calls
 * this from it, which puts the bundling where the bundler already works and leaves the logic here.
 *
 * ```ts
 * // app/src/shared/database/opfs.worker.ts
 * import { runOpfsWorker } from "@cavulsqa/mobile-db/opfs";
 * runOpfsWorker();
 * ```
 */
export function runOpfsWorker(
  scope: OpfsWorkerScope = globalThis as unknown as OpfsWorkerScope,
): void {
  let database: { exec: (options: unknown) => unknown; close: () => void } | null = null;
  let sqlite3: {
    oo1: { OpfsSAHPoolDb: new (name: string) => never };
    capi: {
      sqlite3_changes: (p: unknown) => number;
      sqlite3_last_insert_rowid: (p: unknown) => number;
    };
  } | null = null;

  const reply = (message: OpfsResponse) => {
    scope.postMessage(message);
  };

  async function open(name: string, capacity: number): Promise<void> {
    const { default: sqlite3InitModule } = await import("@sqlite.org/sqlite-wasm");
    const runtime = (await sqlite3InitModule()) as never as NonNullable<typeof sqlite3> & {
      installOpfsSAHPoolVfs: (options: {
        initialCapacity?: number;
        name?: string;
      }) => Promise<{ OpfsSAHPoolDb: new (file: string) => never }>;
    };

    // The SAH pool VFS, not the plain `opfs` one: it needs neither SharedArrayBuffer nor
    // cross-origin isolation, so it works under Capacitor's https://localhost without the
    // COOP/COEP headers a WebView cannot easily be given.
    const pool = await runtime.installOpfsSAHPoolVfs({ initialCapacity: capacity });

    sqlite3 = runtime;
    database = new pool.OpfsSAHPoolDb(`/${name}`) as never;
  }

  function exec(sql: string, parameters: readonly unknown[]): OpfsExecResult {
    if (!database || !sqlite3) throw new Error("[mobile-db] the OPFS database is not open");

    const rows: unknown[] = [];
    database.exec({
      sql,
      bind: parameters.length ? [...parameters] : undefined,
      rowMode: "object",
      resultRows: rows,
    });

    const pointer = (database as unknown as { pointer: unknown }).pointer;
    const inserting = /^\s*insert\b/i.test(sql);

    return {
      rows,
      numAffectedRows: sqlite3.capi.sqlite3_changes(pointer),
      // Only an insert moves last_insert_rowid(); on an update it names a row nothing touched.
      insertId: inserting ? sqlite3.capi.sqlite3_last_insert_rowid(pointer) : null,
    };
  }

  scope.onmessage = (event: { data: OpfsRequest }) => {
    const request = event.data;

    const settle = (work: () => OpfsExecResult | null | Promise<null>) => {
      try {
        const outcome = work();
        if (outcome instanceof Promise) {
          void outcome.then(
            (result) => {
              reply({ id: request.id, ok: true, result });
            },
            (error: unknown) => {
              reply({ id: request.id, ok: false, error: describe(error) });
            },
          );
          return;
        }
        reply({ id: request.id, ok: true, result: outcome });
      } catch (error) {
        reply({ id: request.id, ok: false, error: describe(error) });
      }
    };

    if (request.type === "open") {
      settle(() => open(request.name, request.capacity ?? 12).then(() => null));
      return;
    }
    settle(() => exec(request.sql, request.parameters));
  };
}

function describe(error: unknown): string {
  return error instanceof Error ? (error.stack ?? error.message) : String(error);
}
