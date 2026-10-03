import { expect, test, vi } from "vite-plus/test";
import { Kysely } from "kysely";
import { createChangeCapture } from "../src/capture/changeCapture.js";
import {
  createWorkerDialect,
  type WorkerMessage,
  type WorkerRequest,
} from "../src/workerDialect.js";

type Request = WorkerRequest<{ name: string }>;

function stubWorker() {
  const requests: Request[] = [];
  const worker = {
    onmessage: null as null | ((event: { data: WorkerMessage }) => void),
    onerror: null,
    postMessage(request: Request) {
      requests.push(request);
      if (request.type === "open")
        queueMicrotask(() => send({ id: request.id, ok: true, result: null }));
      if (request.type === "capture") {
        queueMicrotask(() =>
          send({ id: request.id, ok: true, result: { supported: true, tables: [] } }),
        );
      }
    },
    terminate: vi.fn(),
  };
  function send(message: WorkerMessage) {
    worker.onmessage?.({ data: message });
  }
  return { worker: worker as unknown as Worker, requests, send };
}

function connect(stub: ReturnType<typeof stubWorker>, capture = createChangeCapture()) {
  const db = new Kysely<{ item: { id: number } }>({
    dialect: createWorkerDialect({
      label: "the test worker",
      worker: stub.worker,
      open: { name: "test" },
      capture,
    }),
  });
  return { db, capture };
}

test("start opens the worker and sends the table list", async () => {
  const stub = stubWorker();
  const { capture } = connect(stub);

  const reply = await capture.start(["item"]);

  expect(reply).toEqual({ supported: true, tables: [] });
  expect(capture.active).toBe(true);
  expect(stub.requests.map((request) => request.type)).toEqual(["open", "capture"]);
  expect(stub.requests[1]).toMatchObject({ type: "capture", tables: ["item"] });
});

test("a changeset pushed by the worker reaches subscribers and not the request table", async () => {
  const stub = stubWorker();
  const { capture } = connect(stub);
  const received = vi.fn();
  capture.subscribe(received);

  stub.send({ type: "changeset", bytes: new Uint8Array([1, 2, 3]), at: 42 });

  expect(received).toHaveBeenCalledWith({ bytes: new Uint8Array([1, 2, 3]), at: 42 });
});

test("an unbound capture reports itself unsupported instead of throwing", async () => {
  const capture = createChangeCapture();
  const reply = await capture.start();
  expect(reply.supported).toBe(false);
  expect(capture.active).toBe(false);
});

test("a replacement dialect re-attaches a capture that was running", async () => {
  const first = stubWorker();
  const { capture } = connect(first);
  await capture.start(["item"]);

  const second = stubWorker();
  connect(second, capture);
  await vi.waitFor(() => {
    expect(second.requests.find((request) => request.type === "capture")).toMatchObject({
      tables: ["item"],
    });
  });
});

test("stop sends a null table list", async () => {
  const stub = stubWorker();
  const { capture } = connect(stub);
  await capture.start("all");
  await capture.stop();

  expect(stub.requests.at(-1)).toMatchObject({ type: "capture", tables: null });
  expect(capture.active).toBe(false);
});

test("a throwing subscriber does not stop the others", () => {
  const stub = stubWorker();
  const { capture } = connect(stub);
  const second = vi.fn();
  capture.subscribe(() => {
    throw new Error("boom");
  });
  capture.subscribe(second);

  stub.send({ type: "changeset", bytes: new Uint8Array([9]), at: 1 });

  expect(second).toHaveBeenCalledTimes(1);
});
