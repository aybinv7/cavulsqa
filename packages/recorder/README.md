# @cavulsqa/recorder

An in-app field recorder for Capacitor WebViews. It captures the same evidence Capubridge collects
over ADB (DOM replay, console, network, performance samples, database changes) into a `.capu`
archive that [Capubridge](https://github.com/aybinv7/capubridge) opens through its existing replay
view, with no debugger attached and no server involved.

The package produces bytes. It has no Vue import, no transport, and never writes to `console`
except inside the console track's own wrapper. Everything it needs from the app is injected.

## Status

Scaffold. The contract types, session id and manifest helpers, and the recorder interfaces are
published; nothing records yet. Tracks and the lifecycle land in follow-up tasks (see ownership
below).

## The `.capu` format

A `.capu` is a deflate zip with `manifest.json` at the root, `tracks/<name>.ndjson` for
`rrweb | network | console | perf | databases`, and optionally `artifacts/databases.sqlite`. Every
NDJSON line is `{ "t": <ms offset from manifest.startedAt>, "data": ... }`.

The reader is Capubridge `apps/desktop/src-tauri/src/commands/recording.rs`; the shapes are typed
in `apps/desktop/src/types/replay.types.ts`. This package mirrors them by hand in
`src/capu/types.ts` and does not import across repositories. Additive manifest fields written
here and not in Capubridge: `producer` and `device`. The Capubridge validator checks required keys
only, so both are tolerated today.

Two contract relaxations are pending on the Capubridge side and are required before archives from
this recorder replay cleanly:

- **CB-28**: `PerfCapuSample` device-side fields (`cpuTotal`, `cpuCores`, `memUsedPct`,
  `memUsedKb`, `memTotalKb`, `rxBps`, `txBps`, `batteryLevel`, `batteryCharging`, `batteryTemp`)
  are `null` when recorded from a WebView, which cannot read them. Until CB-28, the perf lane
  expects numbers.
- **CB-29**: `DatabaseCapuData` is a union of the existing `localStorage` kind and the new
  `tableChange` kind (`TableChangeCapuData`: `engine`, `table`, `type`, `affectedRows`,
  `affectedIds`, `transactionId`). Until CB-29, `tableChange` events are ignored by the databases
  panel.

## Sink contract

```ts
interface RecorderSink {
  save(archive: Uint8Array, manifest: SessionManifest): Promise<void>;
}
```

`save` receives the finished archive and its manifest. The package ships only an in-memory sink for
tests. The consuming app decides where the bytes go: the cavulsqa `f7-app` template writes them
with the Capacitor Filesystem under `capu/` and offers the Android share sheet.

## Privacy defaults

Recordings hold personal data. The defaults are a floor, not a policy; the consuming app owns the
decision to record and must surface it to the user.

- rrweb: `maskAllInputs: true`, `maskTextSelector: "[data-capu-mask]"`,
  `blockSelector: "[data-capu-block]"`, no canvas, no cross-origin iframes, `inlineImages: false`.
- Network: `authorization`, `cookie`, `set-cookie`, `x-api-key` headers redacted; bodies captured
  only for JSON and text under 512 KiB.
- Console: argument serialization depth 3, 64 properties, 2 KiB of text per argument.
- Retention: ring buffer of 10 minutes or 20 MiB, whichever is hit first (`DEFAULT_RETENTION`).

## Public API

- `TrackName`, `TRACK_NAMES`, `CapuEvent<T>`, `SessionManifest`, `TrackConfig`,
  `DatabaseTrackConfig`, `ManifestProducer`, `ManifestDevice`, `ManifestIncomplete`
- Per-track `data` shapes: `ConsoleCapuData`, `ConsoleArgRecord`, `ConsolePropRecord`,
  `NetworkCapuData`, `NetworkCapuTiming`, `NetworkRequestState`, `PerfCapuSample`, `PerfCpuCore`,
  `DatabaseCapuData`, `LocalStorageCapuData`, `LocalStorageCapuEntry`,
  `LocalStorageSnapshotReason`, `TableChangeCapuData`, `TableChangeType`, and the
  `*CapuEvent` aliases
- `createSessionId()`, `isValidSessionId()`
- `createManifest(input)`, `assertManifest(manifest, expectedSessionId?)`, `ManifestError`,
  `CreateManifestInput`
- `RecorderSink`, `RecorderOptions`, `RecorderRetention`, `DEFAULT_RETENTION`, `TrackRecorder<T>`,
  `TrackContext<T>`
- `RecorderLogger`, `silentLogger`

## Directory ownership

Parallel tasks each own one directory. Shared files (`src/capu/*`, `src/recorder/types.ts`,
`src/recorder/logger.ts`, `src/index.ts`) are owned by CV-R01; a track that needs a shared change
reports it instead of editing.

| Directory                            | Owner  | Content                                              |
| ------------------------------------ | ------ | ---------------------------------------------------- |
| `src/capu/`                          | CV-R01 | Contract types, session id, manifest helpers         |
| `src/recorder/types.ts`, `logger.ts` | CV-R01 | Sink, options, track interfaces, logger              |
| `src/tracks/rrweb/`                  | CV-R02 | rrweb track with masking and checkout segments       |
| `src/tracks/console/`                | CV-R03 | console, errors and injected logger                  |
| `src/tracks/network/`                | CV-R04 | fetch and XHR with header redaction                  |
| `src/tracks/perf/`                   | CV-R05 | WebView-observable performance metrics               |
| `src/tracks/databases/`              | CV-R06 | localStorage snapshots and change-bus `tableChange`  |
| `src/recorder/` (lifecycle)          | CV-R07 | `createRecorder`, ring buffer store, archive builder |

`src/index.ts` is the only barrel. Relative imports carry explicit `.js` extensions.

## Install

```bash
vp install @cavulsqa/recorder
```

`fflate` (zip) and `rrweb` `2.0.0-alpha.4` (the version Capubridge replays with) are runtime
dependencies and are externalized from the bundle.
