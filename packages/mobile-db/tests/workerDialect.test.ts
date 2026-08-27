import { expect, test, vi } from "vite-plus/test";
import { Kysely } from "kysely";
import {
  createWorkerDialect,
  type WorkerExecResult,
  type WorkerRequest,
  type WorkerResponse,
} from "../src/workerDialect.js";

interface OpenPayload {
  name: string;
}

type Request = WorkerRequest<OpenPayload>;

/**
 * A worker that only ever does what a test tells it to, so "never replies" is expressible - which is
 * the state the channel had no answer for.
 */
function stubWorker() {
  const requests: Request[] = [];
  const terminate = vi.fn();

  const worker = {
    onmessage: null as null | ((event: { data: WorkerResponse }) => void),
    onerror: null as null | ((event: { message: string }) => void),
    postMessage(request: Request) {
      requests.push(request);
    },
    terminate,
  };

  const reply = (id: number, result: WorkerExecResult | null) => {
    worker.onmessage?.({ data: { id, ok: true, result } });
  };

  async function awaitRequest(type: Request["type"]): Promise<Request> {
    for (let attempt = 0; attempt < 200; attempt++) {
      const found = requests.find((request) => request.type === type);
      if (found) return found;
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
    throw new Error(`the dialect never sent a "${type}" request`);
  }

  /** Answers the lazy open so the statement under test is the next thing on the wire. */
  async function letItOpen(): Promise<void> {
    const open = await awaitRequest("open");
    reply(open.id, null);
  }

  return {
    worker: worker as unknown as Worker,
    requests,
    reply,
    awaitRequest,
    letItOpen,
    terminate,
  };
}

function connect(stub: ReturnType<typeof stubWorker>, requestTimeoutMs = 40) {
  return new Kysely<{ thing: { id: number } }>({
    dialect: createWorkerDialect<OpenPayload>({
      label: "the test worker",
      worker: stub.worker,
      open: { name: "test" },
      requestTimeoutMs,
    }),
  });
}

test("a statement the worker never answers rejects instead of hanging", async () => {
  const stub = stubWorker();
  const db = connect(stub);

  const query = db.selectFrom("thing").selectAll().execute();
  await stub.letItOpen();
  await stub.awaitRequest("exec");

  // There was no timeout at all. Android can freeze or kill a backgrounded app's worker, and every
  // request in flight then waited forever on a reply nobody was going to send.
  await expect(query).rejects.toThrow(/did not answer within 40ms/);
});

test("terminating rejects what was in flight", async () => {
  const stub = stubWorker();
  const db = connect(stub, 10_000);

  const query = db.selectFrom("thing").selectAll().execute();
  await stub.letItOpen();
  await stub.awaitRequest("exec");

  await db.destroy();

  await expect(query).rejects.toThrow(/was terminated/);
  expect(stub.terminate).toHaveBeenCalled();
});

test("a worker that dies fails later statements with the reason", async () => {
  const stub = stubWorker();
  const db = connect(stub, 10_000);

  const first = db.selectFrom("thing").selectAll().execute();
  await stub.letItOpen();
  await stub.awaitRequest("exec");

  stub.worker.onerror?.({ message: "boom" } as ErrorEvent);

  await expect(first).rejects.toThrow(/the test worker failed: boom/);
  // The open succeeded, so without poisoning the channel every statement after this waited on a
  // dead worker rather than reporting one.
  await expect(db.selectFrom("thing").selectAll().execute()).rejects.toThrow(
    /the test worker failed: boom/,
  );
});

test("the worker is told whether the statement inserts", async () => {
  const stub = stubWorker();
  const db = connect(stub, 10_000);

  void db.insertInto("thing").values({ id: 1 }).execute();
  await stub.letItOpen();
  const inserting = await stub.awaitRequest("exec");

  expect(inserting).toMatchObject({ inserts: true });

  const reading = stubWorker();
  const other = connect(reading, 10_000);
  void other.selectFrom("thing").selectAll().execute();
  await reading.letItOpen();

  expect(await reading.awaitRequest("exec")).toMatchObject({ inserts: false });
});

const ok = { rows: [], numAffectedRows: 0, insertId: null };

test("concurrent reads are all in flight at once", async () => {
  const stub = stubWorker();
  const db = connect(stub, 10_000);

  const reads = Promise.all([
    db.selectFrom("thing").selectAll().execute(),
    db.selectFrom("thing").selectAll().execute(),
    db.selectFrom("thing").selectAll().execute(),
  ]);

  await stub.letItOpen();
  await new Promise((resolve) => setTimeout(resolve, 60));

  // Under kysely's ConnectionMutex - which `SqliteAdapter` asks for - only one of these reached the
  // worker, and the next was not posted until the first round trip returned. On a screen loading
  // with `Promise.all` that is a full hop of latency per query.
  const execs = stub.requests.filter((request) => request.type === "exec");
  expect(execs).toHaveLength(3);

  for (const exec of execs) stub.reply(exec.id, ok);
  await reads;
});

test("concurrent writes are serialized", async () => {
  const stub = stubWorker();
  const db = connect(stub, 10_000);

  const writes = Promise.all([
    db.insertInto("thing").values({ id: 1 }).execute(),
    db.insertInto("thing").values({ id: 2 }).execute(),
  ]);

  await stub.letItOpen();
  await new Promise((resolve) => setTimeout(resolve, 60));

  // Reads run free, writes do not: two writes in the same tick would otherwise race for the BEGIN
  // the driver opens around them, and the loser is absorbed into the winner's transaction.
  let execs = stub.requests.filter((request) => request.type === "exec");
  expect(execs).toHaveLength(1);

  stub.reply(execs[0].id, ok);
  await new Promise((resolve) => setTimeout(resolve, 60));

  execs = stub.requests.filter((request) => request.type === "exec");
  expect(execs).toHaveLength(2);

  stub.reply(execs[1].id, ok);
  await writes;
});
