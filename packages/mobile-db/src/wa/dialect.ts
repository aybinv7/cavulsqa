import type { Dialect } from "kysely";
import { createWorkerDialect } from "../workerDialect.js";
import type { WaOpenPayload } from "./protocol.js";

export interface WaDialectOptions extends WaOpenPayload {
  /**
   * The worker running `runWaWorker()`. The application constructs it, because only the
   * application's bundler can emit a worker and the `.wasm` it loads.
   */
  worker: Worker;
  requestTimeoutMs?: number;
}

/**
 * SQLite through wa-sqlite, with the virtual file system chosen per instance.
 *
 * The alternative to the official build: its VFS layer is JavaScript, so it reaches storage that the
 * official engine has no VFS for - IndexedDB in particular, which is the only durable option on a
 * WebView too old for synchronous access handles. The cost is Asyncify, which wraps every call
 * SQLite believes is synchronous, and that is what the benchmark is for.
 */
export function createWaDialect(options: WaDialectOptions): Dialect {
  return createWorkerDialect<WaOpenPayload>({
    label: "the wa-sqlite worker",
    worker: options.worker,
    open: { name: options.name, kind: options.kind },
    requestTimeoutMs: options.requestTimeoutMs,
  });
}
