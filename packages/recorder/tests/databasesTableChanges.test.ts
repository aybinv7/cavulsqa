import { expect, test, vi } from "vite-plus/test";
import type { TableChangeCapuData } from "../src/capu/types.js";
import {
  ALL_TABLES,
  MAX_AFFECTED_IDS,
  startTableChanges,
} from "../src/tracks/databases/tableChanges.js";
import type { TableChangeBusEvent } from "../src/tracks/databases/tableChanges.js";

function fakeBus() {
  let listener: ((event: TableChangeBusEvent) => void) | undefined;
  const unsubscribe = vi.fn();
  return {
    on: vi.fn((_tables: readonly string[], fn: (event: TableChangeBusEvent) => void) => {
      listener = fn;
      return unsubscribe;
    }),
    emit(event: TableChangeBusEvent) {
      listener?.(event);
    },
    unsubscribe,
  };
}

test("subscribes to ALL_TABLES", () => {
  const bus = fakeBus();
  const handle = startTableChanges({ changeBus: bus, onEvent: () => {} });
  expect(bus.on).toHaveBeenCalledWith([ALL_TABLES], expect.any(Function));
  handle.stop();
});

test("maps a bus event to a tableChange marker", () => {
  const bus = fakeBus();
  const events: TableChangeCapuData[] = [];
  startTableChanges({ changeBus: bus, onEvent: (data) => events.push(data) });

  bus.emit({ table: "orders", type: "bulk", affectedRows: 3 });

  expect(events).toHaveLength(1);
  expect(events[0]).toEqual({
    kind: "tableChange",
    engine: "sqlite",
    table: "orders",
    type: "bulk",
    affectedRows: 3,
    affectedIds: null,
    transactionId: null,
  });
});

test("defaults affectedRows and transactionId to null when absent", () => {
  const bus = fakeBus();
  const events: TableChangeCapuData[] = [];
  startTableChanges({ changeBus: bus, onEvent: (data) => events.push(data) });

  bus.emit({ table: "users", type: "insert" });

  expect(events[0].affectedRows).toBeNull();
  expect(events[0].transactionId).toBeNull();
  expect(events[0].affectedIds).toBeNull();
});

test("caps affectedIds at 50 entries", () => {
  const bus = fakeBus();
  const events: TableChangeCapuData[] = [];
  startTableChanges({ changeBus: bus, onEvent: (data) => events.push(data) });

  const ids = Array.from({ length: 75 }, (_, i) => i);
  bus.emit({ table: "orders", type: "bulk", affectedIds: ids });

  expect(events[0].affectedIds).toHaveLength(MAX_AFFECTED_IDS);
  expect(events[0].affectedIds).toEqual(ids.slice(0, MAX_AFFECTED_IDS));
});

test("passes event.timestamp through as wallMs", () => {
  const bus = fakeBus();
  const wallTimes: Array<number | undefined> = [];
  startTableChanges({ changeBus: bus, onEvent: (_data, wallMs) => wallTimes.push(wallMs) });

  bus.emit({ table: "orders", type: "update", timestamp: 12345 });
  bus.emit({ table: "orders", type: "update" });

  expect(wallTimes).toEqual([12345, undefined]);
});

test("stop() unsubscribes from the bus", () => {
  const bus = fakeBus();
  const handle = startTableChanges({ changeBus: bus, onEvent: () => {} });

  handle.stop();

  expect(bus.unsubscribe).toHaveBeenCalledTimes(1);
});
