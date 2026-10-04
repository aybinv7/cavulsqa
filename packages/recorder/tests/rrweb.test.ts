import { beforeEach, expect, test, vi } from "vite-plus/test";
import { silentLogger } from "../src/recorder/logger.js";
import type { TrackContext } from "../src/recorder/types.js";

/**
 * `rrweb` 2.0.0-alpha.4 ships `"type": "module"` with `main` pointing at a non-ESM UMD bundle and
 * no `exports` map, which the Vite+ module runner rejects with `ReferenceError: exports is not
 * defined in ES module scope` for any environment (this failed identically without happy-dom).
 * `createRrwebTrack.ts` imports the real named exports (`record`, `addCustomEvent`) as the task
 * requires; this suite mocks the `rrweb` module to a minimal stand-in that mirrors real behaviour
 * (Meta then FullSnapshot on start, custom events routed through the active `emit`) so the track's
 * own wiring — option threading, idempotent start/stop, route-change patching, error handling — is
 * exercised without depending on rrweb's DOM snapshotting under happy-dom.
 */
let activeEmit: ((event: unknown) => void) | undefined;

const recordMock = vi.fn(
  (options: { emit: (event: unknown) => void; checkoutEveryNms?: number }) => {
    activeEmit = options.emit;
    options.emit({
      type: 4,
      data: { href: window.location.href, width: 0, height: 0 },
      timestamp: Date.now(),
    });
    options.emit({ type: 2, data: {}, timestamp: Date.now() });
    return () => {
      activeEmit = undefined;
    };
  },
);

const addCustomEventMock = vi.fn((tag: string, payload: unknown) => {
  activeEmit?.({ type: 5, data: { tag, payload }, timestamp: Date.now() });
});

vi.mock("rrweb", () => ({
  record: (options: { emit: (event: unknown) => void; checkoutEveryNms?: number }) =>
    recordMock(options),
  addCustomEvent: (tag: string, payload: unknown) => addCustomEventMock(tag, payload),
}));

const { createRrwebTrack } = await import("../src/tracks/rrweb/index.js");

interface RrwebEvent {
  type: number;
  data?: { tag?: string; payload?: { url?: string } };
}

function createTestContext(): { ctx: TrackContext<unknown>; events: RrwebEvent[] } {
  const events: RrwebEvent[] = [];
  const ctx: TrackContext<unknown> = {
    push: (data) => {
      events.push(data as RrwebEvent);
    },
    startedAt: Date.now(),
    logger: silentLogger,
  };
  return { ctx, events };
}

beforeEach(() => {
  recordMock.mockClear();
  addCustomEventMock.mockClear();
  activeEmit = undefined;
});

test("start records a Meta event followed by a FullSnapshot", async () => {
  const track = createRrwebTrack();
  const { ctx, events } = createTestContext();

  await track.start(ctx);

  expect(events[0]?.type).toBe(4);
  expect(events[1]?.type).toBe(2);

  await track.stop();
});

test("start passes the plan's masking and bandwidth defaults to rrweb.record", async () => {
  const track = createRrwebTrack();
  const { ctx } = createTestContext();

  await track.start(ctx);

  expect(recordMock).toHaveBeenCalledTimes(1);
  const passedOptions = recordMock.mock.calls[0]?.[0];
  expect(passedOptions).toMatchObject({
    maskAllInputs: true,
    maskTextSelector: "[data-capu-mask]",
    blockSelector: "[data-capu-block]",
    inlineImages: false,
    collectFonts: false,
    recordCanvas: false,
    recordCrossOriginIframes: false,
    checkoutEveryNms: 60_000,
  });

  await track.stop();
});

test("options passed to createRrwebTrack override the defaults", async () => {
  const track = createRrwebTrack({ maskAllInputs: false, checkoutEveryNms: 30_000 });
  const { ctx } = createTestContext();

  await track.start(ctx);

  const passedOptions = recordMock.mock.calls[0]?.[0];
  expect(passedOptions).toMatchObject({ maskAllInputs: false, checkoutEveryNms: 30_000 });

  await track.stop();
});

test("pushState emits a capu:route-change custom event with the new URL", async () => {
  const track = createRrwebTrack();
  const { ctx, events } = createTestContext();

  await track.start(ctx);
  history.pushState({}, "", "/next");

  const routeChange = events.find(
    (event) => event.type === 5 && event.data?.tag === "capu:route-change",
  );

  expect(routeChange).toBeDefined();
  expect(routeChange?.data?.payload?.url).toContain("/next");

  await track.stop();
});

test("replaceState and popstate also emit capu:route-change", async () => {
  const track = createRrwebTrack();
  const { ctx, events } = createTestContext();

  await track.start(ctx);
  history.replaceState({}, "", "/replaced");
  const afterReplace = events.filter((event) => event.data?.tag === "capu:route-change").length;
  expect(afterReplace).toBe(1);

  history.pushState({}, "", "/pushed");
  window.dispatchEvent(new PopStateEvent("popstate"));
  const afterPop = events.filter((event) => event.data?.tag === "capu:route-change").length;
  expect(afterPop).toBe(2);

  await track.stop();
});

test("stop restores history.pushState identity", async () => {
  const track = createRrwebTrack();
  const { ctx } = createTestContext();
  const originalPushState = history.pushState;

  await track.start(ctx);
  expect(history.pushState).not.toBe(originalPushState);

  await track.stop();
  expect(history.pushState).toBe(originalPushState);
});

test("stop stops emitting route-change events", async () => {
  const track = createRrwebTrack();
  const { ctx, events } = createTestContext();

  await track.start(ctx);
  await track.stop();
  events.length = 0;

  history.pushState({}, "", "/after-stop");
  expect(events.length).toBe(0);
});

test("start after stop records again", async () => {
  const track = createRrwebTrack();
  const { ctx, events } = createTestContext();

  await track.start(ctx);
  await track.stop();
  events.length = 0;

  await track.start(ctx);
  expect(events[0]?.type).toBe(4);
  expect(events[1]?.type).toBe(2);
  expect(recordMock).toHaveBeenCalledTimes(2);

  await track.stop();
});

test("start is idempotent", async () => {
  const track = createRrwebTrack();
  const { ctx, events } = createTestContext();

  await track.start(ctx);
  const originalPushState = history.pushState;
  await track.start(ctx);

  expect(recordMock).toHaveBeenCalledTimes(1);
  expect(history.pushState).toBe(originalPushState);
  expect(events.length).toBeGreaterThan(0);

  await track.stop();
});

test("a push failure is reported once as __capuError, then later events still get through", async () => {
  const track = createRrwebTrack();
  const events: RrwebEvent[] = [];
  let callCount = 0;
  const ctx: TrackContext<unknown> = {
    push: (data) => {
      callCount += 1;
      if (callCount === 1 || callCount === 3) {
        throw new Error("boom");
      }
      events.push(data as RrwebEvent);
    },
    startedAt: Date.now(),
    logger: silentLogger,
  };

  await expect(track.start(ctx)).resolves.toBeUndefined();
  history.pushState({}, "", "/again");
  history.replaceState({}, "", "/again-2");

  const errorEvents = events.filter(
    (event) => (event as { __capuError?: string }).__capuError !== undefined,
  );
  const routeChangeEvents = events.filter((event) => event.data?.tag === "capu:route-change");

  expect(errorEvents.length).toBe(1);
  expect(routeChangeEvents.length).toBe(2);

  await track.stop();
});
