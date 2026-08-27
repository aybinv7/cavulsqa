import type { Dialect } from "kysely";
import { createWorkerDialect } from "../workerDialect.js";
import type { OpfsOpenPayload } from "./protocol.js";

export interface OpfsDialectOptions extends OpfsOpenPayload {
  /**
   * The worker running `runOpfsWorker()`. The application constructs it, because only the
   * application's bundler can emit a worker and the `.wasm` it loads.
   */
  worker: Worker;
  requestTimeoutMs?: number;
}

/**
 * SQLite compiled to WebAssembly, storing a real database file in OPFS, running in a worker.
 *
 * Unlike the Capacitor dialect there is no native bridge in the path, so a statement costs a
 * structured clone rather than a JSON round trip through Java. Unlike the sql.js test dialect the
 * data is durable and written page by page, rather than by serialising the whole database.
 */
export function createOpfsDialect(options: OpfsDialectOptions): Dialect {
  return createWorkerDialect<OpfsOpenPayload>({
    label: "the OPFS worker",
    worker: options.worker,
    open: { name: options.name, capacity: options.capacity },
    requestTimeoutMs: options.requestTimeoutMs,
  });
}
