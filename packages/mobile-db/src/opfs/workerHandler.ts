import type { BindingSpec, OpfsSAHPoolDatabase, Sqlite3Static } from "@sqlite.org/sqlite-wasm";
import type { WorkerExecResult } from "../workerDialect.js";
import { createSessionCapture, type SessionCapture } from "../capture/sessionCapture.js";
import type { CaptureReply, CaptureTables } from "../capture/types.js";
import type { OpfsRequest, OpfsResponse, OpfsWorkerScope } from "./protocol.js";

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
  let database: OpfsSAHPoolDatabase | null = null;
  let sqlite3: Sqlite3Static | null = null;
  let capture: SessionCapture | null = null;

  const reply = (message: OpfsResponse) => {
    scope.postMessage(message);
  };

  function pushChangeset(): void {
    if (!capture) return;
    let bytes: Uint8Array | null;
    try {
      bytes = capture.collect();
    } catch {
      return;
    }
    if (bytes) scope.postMessage({ type: "changeset", bytes, at: Date.now() }, [bytes.buffer]);
  }

  function configureCapture(tables: CaptureTables | null): CaptureReply {
    if (!database || !sqlite3) throw new Error("[mobile-db] the OPFS database is not open");
    if (tables === null) {
      capture?.stop();
      capture = null;
      return { supported: true, tables: [] };
    }
    if (typeof sqlite3.capi.sqlite3session_create !== "function") {
      return { supported: false, reason: "this SQLite build has no session extension" };
    }
    capture ??= createSessionCapture(sqlite3, database);
    return { supported: true, tables: capture.start(tables) };
  }

  async function open(name: string, capacity: number): Promise<void> {
    const { default: sqlite3InitModule } = await import("@sqlite.org/sqlite-wasm");
    const runtime = await sqlite3InitModule();

    // The SAH pool VFS, not the plain `opfs` one: it needs neither SharedArrayBuffer nor
    // cross-origin isolation, so it works under Capacitor's https://localhost without the
    // COOP/COEP headers a WebView cannot easily be given.
    const pool = await runtime.installOpfsSAHPoolVfs({ initialCapacity: capacity });

    sqlite3 = runtime;
    database = new pool.OpfsSAHPoolDb(`/${name}`);
  }

  function exec(sql: string, parameters: readonly unknown[], inserts: boolean): WorkerExecResult {
    if (!database || !sqlite3) throw new Error("[mobile-db] the OPFS database is not open");

    const rows = database.exec({
      sql,
      bind: parameters.length ? ([...parameters] as BindingSpec) : undefined,
      rowMode: "object",
      returnValue: "resultRows",
    });

    return {
      rows,
      numAffectedRows: sqlite3.capi.sqlite3_changes(database),
      // Only an insert moves last_insert_rowid(); on an update it names a row nothing touched.
      insertId: inserts ? Number(sqlite3.capi.sqlite3_last_insert_rowid(database)) : null,
    };
  }

  scope.onmessage = (event: { data: OpfsRequest }) => {
    const request = event.data;

    const settle = (work: () => WorkerExecResult | CaptureReply | null | Promise<null>) => {
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
    if (request.type === "capture") {
      settle(() => configureCapture(request.tables));
      return;
    }
    try {
      settle(() => exec(request.sql, request.parameters, request.inserts));
    } finally {
      pushChangeset();
    }
  };
}

function describe(error: unknown): string {
  return error instanceof Error ? (error.stack ?? error.message) : String(error);
}
