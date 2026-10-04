/** The five NDJSON tracks Capubridge reads from `tracks/<name>.ndjson`. */
export type TrackName = "rrweb" | "network" | "console" | "perf" | "databases";

export const TRACK_NAMES: readonly TrackName[] = [
  "rrweb",
  "network",
  "console",
  "perf",
  "databases",
];

/** One NDJSON line. `t` is the millisecond offset from `SessionManifest.startedAt`. */
export interface CapuEvent<T = unknown> {
  t: number;
  data: T;
}

export interface DatabaseTrackConfig {
  localStorage: boolean;
  indexedDB?: boolean;
  localForage?: boolean;
  sqlite?: boolean;
}

export interface TrackConfig {
  rrweb: boolean;
  network: boolean;
  console: boolean;
  perf?: boolean;
  databases?: boolean;
}

/** Recorder-only manifest addition. Capubridge tolerates it; its validator checks required keys only. */
export interface ManifestProducer {
  name: string;
  version: string;
  platform: string;
}

/** Recorder-only manifest addition describing the device the archive was captured on. */
export interface ManifestDevice {
  model: string | null;
  osVersion: string | null;
  webviewVersion: string | null;
  appId: string | null;
  appVersion: string | null;
}

export interface ManifestIncomplete {
  errors: string[];
  missingTracks: string[];
}

/**
 * `manifest.json` at the root of the `.capu` zip. Mirrors Capubridge `replay.types.ts`
 * `SessionManifest`; `producer` and `device` are additive and optional.
 */
export interface SessionManifest {
  version: 1;
  sessionId: string;
  label: string;
  startedAt: number;
  duration: number;
  deviceSerial: string | null;
  targetUrl: string | null;
  appPackage: string | null;
  tracks: TrackConfig;
  databaseTracks?: DatabaseTrackConfig;
  incomplete?: ManifestIncomplete;
  producer?: ManifestProducer;
  device?: ManifestDevice;
}

export type ConsoleArgRecord =
  | { kind: "primitive"; text: string }
  | {
      kind: "object";
      description: string;
      subtype: string | null;
      properties: ConsolePropRecord[];
      overflow: boolean;
    };

export interface ConsolePropRecord {
  name: string;
  value: ConsoleArgRecord;
}

export interface ConsoleCapuData {
  level: string;
  text: string;
  source: string | null;
  line: number | null;
  id?: string;
  parentId?: string | null;
  isGroup?: boolean;
  groupCollapsed?: boolean;
  args?: ConsoleArgRecord[];
}

export type ConsoleCapuEvent = CapuEvent<ConsoleCapuData>;

export interface NetworkCapuTiming {
  dnsStart: number;
  dnsEnd: number;
  connectStart: number;
  connectEnd: number;
  sslStart: number;
  sslEnd: number;
  sendStart: number;
  sendEnd: number;
  receiveHeadersEnd: number;
}

export type NetworkRequestState = "pending" | "finished" | "failed";

export interface NetworkCapuData {
  requestId: string;
  url: string;
  method: string;
  status: number | null;
  resourceType: string;
  duration: number | null;
  transferSize: number;
  state: NetworkRequestState;
  mimeType: string | null;
  requestHeaders: Record<string, string> | null;
  responseHeaders: Record<string, string> | null;
  requestBody: string | null;
  responseBody: string | null;
  responseBodyBase64: boolean;
  responseBodyError?: string | null;
  timing: NetworkCapuTiming | null;
  initiator: string | null;
}

export type NetworkCapuEvent = CapuEvent<NetworkCapuData>;

export interface PerfCpuCore {
  core: number;
  usage: number;
}

/**
 * Device-side fields (`cpuTotal` through `batteryTemp`) are `null` when recorded from inside a
 * WebView, which cannot read them. Requires Capubridge CB-28 to replay with gaps in the lane.
 */
export interface PerfCapuSample {
  cpuTotal: number | null;
  cpuCores: PerfCpuCore[] | null;
  memUsedPct: number | null;
  memUsedKb: number | null;
  memTotalKb: number | null;
  rxBps: number | null;
  txBps: number | null;
  batteryLevel: number | null;
  batteryCharging: boolean | null;
  batteryTemp: number | null;
  cpuTemp: number | null;
  jsHeapUsedMb: number | null;
  jsHeapTotalMb: number | null;
  domNodes: number | null;
}

export type PerfCapuEvent = CapuEvent<PerfCapuSample>;

export interface LocalStorageCapuEntry {
  key: string;
  value: string;
}

export type LocalStorageSnapshotReason = "initial" | "change" | "final";

export interface LocalStorageCapuData {
  kind: "localStorage";
  origin: string;
  entries: LocalStorageCapuEntry[];
  reason: LocalStorageSnapshotReason;
}

export type TableChangeType = "insert" | "update" | "delete" | "bulk";

/** Marker event for a SQLite table write. Requires Capubridge CB-29 to render. */
export interface TableChangeCapuData {
  kind: "tableChange";
  engine: "sqlite";
  table: string;
  type: TableChangeType;
  affectedRows: number | null;
  affectedIds: Array<string | number> | null;
  transactionId: string | null;
}

export type DatabaseCapuData = LocalStorageCapuData | TableChangeCapuData;

export type DatabaseCapuEvent = CapuEvent<DatabaseCapuData>;

export type RrwebCapuEvent = CapuEvent<unknown>;
