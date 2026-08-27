import type { WorkerExecResult } from "../workerDialect.js";
import {
  needsAsyncBuild,
  type WaRequest,
  type WaResponse,
  type WaVfsKind,
  type WaWorkerScope,
} from "./protocol.js";

/**
 * The worker half of the wa-sqlite engine.
 *
 * Same division of labour as the OPFS engine: the application owns a three-line worker file so its
 * bundler can emit the worker and the `.wasm` it loads, and the logic lives here.
 *
 * ```ts
 * // app/src/shared/database/wa.worker.ts
 * import { runWaWorker } from "@cavulsqa/mobile-db/wa";
 * runWaWorker();
 * ```
 *
 * It runs in a worker even though wa-sqlite's headline feature is that it need not: the synchronous
 * pool VFS wants the same off-main-thread access handles the official engine does, and keeping every
 * engine in a worker means a query never competes with rendering regardless of which one is chosen.
 */
export function runWaWorker(scope: WaWorkerScope = globalThis as unknown as WaWorkerScope): void {
  let sqlite3: WaSqlite | null = null;
  let handle: number | null = null;

  const reply = (message: WaResponse) => {
    scope.postMessage(message);
  };

  async function open(kind: WaVfsKind, name: string): Promise<void> {
    // Two builds, and the VFS decides which: only the Asyncify one can host a VFS that awaits.
    const factory = needsAsyncBuild(kind)
      ? await import("wa-sqlite/dist/wa-sqlite-async.mjs")
      : await import("wa-sqlite/dist/wa-sqlite.mjs");
    const api = (await import("wa-sqlite")) as unknown as { Factory: (m: unknown) => WaSqlite };

    const module = await (factory as unknown as { default: () => Promise<unknown> }).default();
    const runtime = api.Factory(module);

    const vfs = await createVfs(kind, name, module);
    // `true` makes it the default, so `open_v2` needs no per-call vfs argument.
    runtime.vfs_register(vfs, true);

    sqlite3 = runtime;
    handle = await runtime.open_v2(name);
  }

  async function exec(
    sql: string,
    parameters: readonly unknown[],
    inserts: boolean,
  ): Promise<WorkerExecResult> {
    if (!sqlite3 || handle === null)
      throw new Error("[mobile-db] the wa-sqlite database is not open");
    const runtime = sqlite3;
    const db = handle;

    const rows: Record<string, unknown>[] = [];

    for await (const statement of runtime.statements(db, sql)) {
      if (parameters.length) runtime.bind_collection(statement, [...parameters]);

      const columns = runtime.column_names(statement);
      while ((await runtime.step(statement)) === SQLITE_ROW) {
        const values = runtime.row(statement);
        rows.push(Object.fromEntries(columns.map((column, index) => [column, values[index]])));
      }
    }

    return {
      rows,
      numAffectedRows: runtime.changes(db),
      // Only an insert moves last_insert_rowid(); on an update it names a row nothing touched.
      insertId: inserts ? await lastInsertRowId(runtime, db) : null,
    };
  }

  scope.onmessage = (event: { data: WaRequest }) => {
    const request = event.data;

    const settle = (work: () => Promise<WorkerExecResult | null>) => {
      void work().then(
        (result) => {
          reply({ id: request.id, ok: true, result });
        },
        (error: unknown) => {
          reply({ id: request.id, ok: false, error: describe(error) });
        },
      );
    };

    if (request.type === "open") {
      settle(() => open(request.kind, request.name).then(() => null));
      return;
    }
    settle(() => exec(request.sql, request.parameters, request.inserts));
  };
}

const SQLITE_ROW = 100;

/**
 * Asked for with SQL, because wa-sqlite's API has no `last_insert_rowid` binding - `changes` is
 * there, its sibling is not. One extra statement on the same connection is the whole cost, and it
 * runs only after an insert.
 */
async function lastInsertRowId(runtime: WaSqlite, db: number): Promise<number | null> {
  for await (const statement of runtime.statements(db, "select last_insert_rowid()")) {
    if ((await runtime.step(statement)) === SQLITE_ROW) {
      const value = runtime.row(statement)[0];
      return typeof value === "number" ? value : Number(value);
    }
  }
  return null;
}

/**
 * The VFS classes live under `src/examples/` in the package, which is where the project keeps them -
 * they are the supported implementations despite the directory name, and there is no other copy.
 */
async function createVfs(kind: WaVfsKind, name: string, module: unknown): Promise<unknown> {
  if (kind === "access-handle-pool") {
    const { AccessHandlePoolVFS } =
      (await import("wa-sqlite/src/examples/AccessHandlePoolVFS.js")) as {
        AccessHandlePoolVFS: new (path: string) => VfsInstance;
      };
    const vfs = new AccessHandlePoolVFS(`/${name}`);
    await vfs.isReady;
    return vfs;
  }

  if (kind === "origin-private-file-system") {
    const { OriginPrivateFileSystemVFS } =
      (await import("wa-sqlite/src/examples/OriginPrivateFileSystemVFS.js")) as {
        OriginPrivateFileSystemVFS: new () => VfsInstance;
      };
    return new OriginPrivateFileSystemVFS();
  }

  const { IDBBatchAtomicVFS } = (await import("wa-sqlite/src/examples/IDBBatchAtomicVFS.js")) as {
    IDBBatchAtomicVFS: new (database: string) => VfsInstance;
  };
  void module;
  return new IDBBatchAtomicVFS(name);
}

interface VfsInstance {
  isReady?: Promise<unknown>;
}

/** Only the members this dialect calls, so the untyped package does not leak `any` everywhere. */
interface WaSqlite {
  vfs_register: (vfs: unknown, makeDefault: boolean) => void;
  open_v2: (name: string) => Promise<number>;
  statements: (db: number, sql: string) => AsyncIterable<number>;
  bind_collection: (statement: number, values: unknown[]) => void;
  step: (statement: number) => Promise<number>;
  row: (statement: number) => unknown[];
  column_names: (statement: number) => string[];
  changes: (db: number) => number;
  close: (db: number) => Promise<void>;
}

function describe(error: unknown): string {
  return error instanceof Error ? (error.stack ?? error.message) : String(error);
}
