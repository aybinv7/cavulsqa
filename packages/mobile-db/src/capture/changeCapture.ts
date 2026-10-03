import type { CaptureReply, CaptureTables, Changeset, ChangesetListener } from "./types.js";

/** How a dialect lets the capture talk to its worker. */
export interface CapturePort {
  request(tables: CaptureTables | null): Promise<CaptureReply | null>;
}

/**
 * Records every committed write to the attached tables as a SQLite changeset, inside the database
 * worker, and hands the bytes to subscribers on the main thread.
 *
 * Pass the same instance to the dialect and to whoever reads the changesets. It survives the worker
 * being replaced: a new dialect binding re-attaches whatever was last started.
 */
export interface ChangeCapture {
  start(tables?: CaptureTables): Promise<CaptureReply>;
  stop(): Promise<void>;
  subscribe(listener: ChangesetListener): () => void;
  readonly active: boolean;
  /** @internal Called by the worker dialect. */
  bind(port: CapturePort): () => void;
  /** @internal Called by the worker dialect for each changeset the worker pushes. */
  publish(changeset: Changeset): void;
}

const UNBOUND: CaptureReply = {
  supported: false,
  reason: "no database dialect is bound to this capture",
};

export function createChangeCapture(): ChangeCapture {
  const listeners = new Set<ChangesetListener>();
  let port: CapturePort | null = null;
  let wanted: CaptureTables | null = null;

  async function send(tables: CaptureTables | null): Promise<CaptureReply> {
    if (!port) return UNBOUND;
    return (await port.request(tables)) ?? UNBOUND;
  }

  return {
    get active() {
      return wanted !== null;
    },

    async start(tables = "all") {
      wanted = tables;
      const reply = await send(tables);
      if (!reply.supported) wanted = null;
      return reply;
    },

    async stop() {
      if (wanted === null) return;
      wanted = null;
      await send(null);
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    bind(next) {
      port = next;
      if (wanted !== null) void next.request(wanted).catch(() => undefined);
      return () => {
        if (port === next) port = null;
      };
    },

    publish(changeset) {
      for (const listener of listeners) {
        try {
          listener(changeset);
        } catch {
          continue;
        }
      }
    },
  };
}
