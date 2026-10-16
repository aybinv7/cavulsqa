import { expect, test, vi } from "vite-plus/test";
import { Kysely } from "kysely";
import { createOpfsDialect } from "../src/opfs/dialect.js";
import type { OpfsRequest, OpfsWorkerScope } from "../src/opfs/protocol.js";
import { runOpfsWorker } from "../src/opfs/workerHandler.js";
import type { WorkerMessage } from "../src/workerDialect.js";

const installOpfsSAHPoolVfs = vi.fn(async () => ({
  OpfsSAHPoolDb: class {
    constructor(readonly filename: string) {}
  },
}));

vi.mock("@sqlite.org/sqlite-wasm", () => ({
  default: async () => ({ installOpfsSAHPoolVfs }),
}));

function recordingWorker() {
  const requests: OpfsRequest[] = [];
  const worker = {
    onmessage: null,
    onerror: null,
    postMessage(request: OpfsRequest) {
      requests.push(request);
    },
    terminate: vi.fn(),
  };
  return { worker: worker as unknown as Worker, requests };
}

async function untilOpenIsPosted(requests: OpfsRequest[]): Promise<OpfsRequest> {
  for (let attempt = 0; attempt < 200; attempt++) {
    const open = requests.find((request) => request.type === "open");
    if (open) return open;
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  throw new Error('the dialect never sent an "open" request');
}

function fakeScope() {
  const replies: WorkerMessage[] = [];
  const scope: OpfsWorkerScope = {
    onmessage: null,
    postMessage(message) {
      replies.push(message);
    },
  };
  runOpfsWorker(scope);

  async function open(request: OpfsRequest): Promise<WorkerMessage> {
    scope.onmessage?.({ data: request });
    for (let attempt = 0; attempt < 200; attempt++) {
      const reply = replies.find((message) => "id" in message && message.id === request.id);
      if (reply) return reply;
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
    throw new Error("the worker never answered the open");
  }

  return { open };
}

test("the dialect carries the pool directory in its open request", async () => {
  const { worker, requests } = recordingWorker();
  const db = new Kysely<{ thing: { id: number } }>({
    dialect: createOpfsDialect({
      worker,
      name: "app.sqlite3",
      directory: "panels/tab-a",
      requestTimeoutMs: 40,
    }),
  });

  const query = db.selectFrom("thing").selectAll().execute();
  const open = await untilOpenIsPosted(requests);

  expect(open).toMatchObject({ type: "open", name: "app.sqlite3", directory: "panels/tab-a" });
  await expect(query).rejects.toThrow();
});

test("the worker installs the pool in the requested directory", async () => {
  installOpfsSAHPoolVfs.mockClear();
  const worker = fakeScope();

  const reply = await worker.open({
    id: 1,
    type: "open",
    name: "app.sqlite3",
    capacity: 8,
    directory: "panels/tab-a",
  });

  expect(reply).toEqual({ id: 1, ok: true, result: null });
  expect(installOpfsSAHPoolVfs).toHaveBeenCalledWith({
    initialCapacity: 8,
    directory: "panels/tab-a",
  });
});

test("without a directory the worker keeps sqlite-wasm's default pool", async () => {
  installOpfsSAHPoolVfs.mockClear();
  const worker = fakeScope();

  await worker.open({ id: 1, type: "open", name: "app.sqlite3", directory: undefined });

  expect(installOpfsSAHPoolVfs).toHaveBeenCalledWith({ initialCapacity: 12 });
});
