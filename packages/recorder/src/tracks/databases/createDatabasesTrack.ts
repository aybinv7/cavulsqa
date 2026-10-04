import type { DatabaseCapuData } from "../../capu/types.js";
import type { TrackContext, TrackRecorder } from "../../recorder/types.js";
import { defaultMaskKeys, startLocalStorageSnapshots } from "./localStorageSnapshots.js";
import type { LocalStorageSnapshotHandle } from "./localStorageSnapshots.js";
import { startTableChanges } from "./tableChanges.js";
import type { ChangeBusLike, TableChangeHandle } from "./tableChanges.js";

export interface DatabasesTrackOptions {
  /** Record `localStorage` snapshots. Defaults to `true`. */
  localStorage?: boolean;
  /** When provided, `tableChange` markers are recorded from this bus; otherwise none are recorded. */
  changeBus?: ChangeBusLike;
  /** Replaces the value of a matching `localStorage` key with `[masked]`. Defaults to {@link defaultMaskKeys}. */
  maskKeys?: (key: string) => boolean;
  /** Defaults to `window.localStorage`. Injectable for tests and non-`window` hosts. */
  storage?: Storage;
}

/**
 * Builds the `databases` track: `localStorage` snapshots (`initial`, debounced `change`, `final`)
 * and, when `changeBus` is supplied, `tableChange` markers mapped from its events.
 */
export function createDatabasesTrack(
  options: DatabasesTrackOptions = {},
): TrackRecorder<DatabaseCapuData> {
  const localStorageEnabled = options.localStorage ?? true;
  const maskKeys = options.maskKeys ?? defaultMaskKeys;

  let localStorageHandle: LocalStorageSnapshotHandle | undefined;
  let tableChangeHandle: TableChangeHandle | undefined;

  return {
    name: "databases",
    async start(ctx: TrackContext<DatabaseCapuData>): Promise<void> {
      if (localStorageEnabled) {
        localStorageHandle = startLocalStorageSnapshots({
          maskKeys,
          storage: options.storage,
          onSnapshot: (data) => ctx.push(data),
        });
      }
      if (options.changeBus) {
        tableChangeHandle = startTableChanges({
          changeBus: options.changeBus,
          onEvent: (data, wallMs) => ctx.push(data, wallMs),
        });
      }
    },
    async stop(): Promise<void> {
      tableChangeHandle?.stop();
      tableChangeHandle = undefined;
      localStorageHandle?.stop();
      localStorageHandle = undefined;
    },
  };
}
