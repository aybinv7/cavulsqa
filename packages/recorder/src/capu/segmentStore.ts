import type { TrackName } from "./types.js";

const OPFS_ROOT_DIR = "capu-recorder";
const MANIFEST_SNAPSHOT_FILE = "manifest.json";

/** One retained NDJSON segment for a track. */
export interface SegmentMeta {
  index: number;
  startMs: number;
  bytes: number;
}

/**
 * Bounded, per-track NDJSON storage backing the recorder's ring buffer. Retention (which
 * segments to evict) is decided by `recorder/retention.ts`; the store only executes it.
 */
export interface SegmentStore {
  readonly backend: "memory" | "opfs";
  append(track: TrackName, line: string): Promise<void>;
  rotate(track: TrackName): Promise<void>;
  list(track: TrackName): Promise<SegmentMeta[]>;
  read(track: TrackName, index: number): Promise<string>;
  evict(track: TrackName, index: number): Promise<void>;
  clear(): Promise<void>;
}

interface MemorySegment {
  index: number;
  startMs: number;
  lines: string[];
}

function byteLength(text: string): number {
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(text).length;
  return text.length;
}

/** An in-memory `SegmentStore`. Data is lost on reload; used as the universal fallback. */
export function createMemorySegmentStore(): SegmentStore {
  const segments = new Map<TrackName, MemorySegment[]>();

  function segmentsFor(track: TrackName): MemorySegment[] {
    let list = segments.get(track);
    if (!list) {
      list = [];
      segments.set(track, list);
    }
    return list;
  }

  function currentSegment(track: TrackName): MemorySegment {
    const list = segmentsFor(track);
    const last = list[list.length - 1];
    if (last) return last;
    const created: MemorySegment = { index: 0, startMs: Date.now(), lines: [] };
    list.push(created);
    return created;
  }

  return {
    backend: "memory",
    async append(track, line) {
      currentSegment(track).lines.push(line);
    },
    async rotate(track) {
      const list = segmentsFor(track);
      const nextIndex = list.length === 0 ? 0 : (list[list.length - 1]?.index ?? -1) + 1;
      list.push({ index: nextIndex, startMs: Date.now(), lines: [] });
    },
    async list(track) {
      return segmentsFor(track).map((segment) => ({
        index: segment.index,
        startMs: segment.startMs,
        bytes: byteLength(segment.lines.join("")),
      }));
    },
    async read(track, index) {
      const segment = segmentsFor(track).find((s) => s.index === index);
      return segment ? segment.lines.join("") : "";
    },
    async evict(track, index) {
      const list = segmentsFor(track);
      const at = list.findIndex((s) => s.index === index);
      if (at !== -1) list.splice(at, 1);
    },
    async clear() {
      segments.clear();
    },
  };
}

function hasOpfsSupport(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.storage !== "undefined" &&
    typeof navigator.storage.getDirectory === "function" &&
    typeof FileSystemFileHandle !== "undefined" &&
    typeof FileSystemFileHandle.prototype.createWritable === "function"
  );
}

/** Probes OPFS support once. Exported so callers can report the chosen backend before creating a store. */
export async function probeOpfsSupport(): Promise<boolean> {
  if (!hasOpfsSupport()) return false;
  try {
    const root = await navigator.storage.getDirectory();
    await root.getDirectoryHandle(OPFS_ROOT_DIR, { create: true });
    return true;
  } catch {
    return false;
  }
}

async function getSessionDir(
  sessionId: string,
  create: boolean,
): Promise<FileSystemDirectoryHandle | null> {
  try {
    const root = await navigator.storage.getDirectory();
    const recorderDir = await root.getDirectoryHandle(OPFS_ROOT_DIR, { create: true });
    return await recorderDir.getDirectoryHandle(sessionId, { create });
  } catch {
    return null;
  }
}

async function getTrackDir(
  sessionId: string,
  track: TrackName,
  create: boolean,
): Promise<FileSystemDirectoryHandle | null> {
  const sessionDir = await getSessionDir(sessionId, create);
  if (!sessionDir) return null;
  try {
    return await sessionDir.getDirectoryHandle(track, { create });
  } catch {
    return null;
  }
}

interface OpfsWriter {
  index: number;
  startMs: number;
  bytes: number;
  writable: FileSystemWritableFileStream;
}

/**
 * An OPFS-backed `SegmentStore` under `capu-recorder/<sessionId>/<track>/<index>.ndjson`. Writes
 * go through `FileSystemWritableFileStream`; `createSyncAccessHandle` (the worker-only, faster
 * path some WebViews require) is not implemented here, so a WebView that lacks
 * `FileSystemWritableFileStream` but has `createSyncAccessHandle` falls through to `probeOpfsSupport`
 * returning false and the caller should use the memory store instead.
 */
export async function createOpfsSegmentStore(sessionId: string): Promise<SegmentStore> {
  const supported = await probeOpfsSupport();
  if (!supported) return createMemorySegmentStore();

  const writers = new Map<TrackName, OpfsWriter>();
  const metaCache = new Map<TrackName, SegmentMeta[]>();

  function cachedList(track: TrackName): SegmentMeta[] {
    let list = metaCache.get(track);
    if (!list) {
      list = [];
      metaCache.set(track, list);
    }
    return list;
  }

  async function closeWriter(track: TrackName): Promise<void> {
    const writer = writers.get(track);
    if (!writer) return;
    await writer.writable.close();
    writers.delete(track);
    const list = cachedList(track);
    const at = list.findIndex((s) => s.index === writer.index);
    const meta = { index: writer.index, startMs: writer.startMs, bytes: writer.bytes };
    if (at === -1) list.push(meta);
    else list[at] = meta;
  }

  async function openWriter(track: TrackName, index: number, startMs: number): Promise<OpfsWriter> {
    const trackDir = await getTrackDir(sessionId, track, true);
    if (!trackDir) throw new Error(`OPFS unavailable for track ${track}`);
    const fileHandle = await trackDir.getFileHandle(`${index}.ndjson`, { create: true });
    const writable = await fileHandle.createWritable({ keepExistingData: false });
    const writer: OpfsWriter = { index, startMs, bytes: 0, writable };
    writers.set(track, writer);
    return writer;
  }

  async function ensureWriter(track: TrackName): Promise<OpfsWriter> {
    const existing = writers.get(track);
    if (existing) return existing;
    const list = cachedList(track);
    const nextIndex = list.length === 0 ? 0 : Math.max(...list.map((s) => s.index)) + 1;
    return openWriter(track, nextIndex, Date.now());
  }

  return {
    backend: "opfs",
    async append(track, line) {
      const writer = await ensureWriter(track);
      await writer.writable.write(line);
      writer.bytes += byteLength(line);
    },
    async rotate(track) {
      await closeWriter(track);
      const list = cachedList(track);
      const nextIndex = list.length === 0 ? 0 : Math.max(...list.map((s) => s.index)) + 1;
      await openWriter(track, nextIndex, Date.now());
    },
    async list(track) {
      const writer = writers.get(track);
      const list = cachedList(track).slice();
      if (writer) list.push({ index: writer.index, startMs: writer.startMs, bytes: writer.bytes });
      return list.sort((a, b) => a.index - b.index);
    },
    async read(track, index) {
      const writer = writers.get(track);
      if (writer && writer.index === index) await closeWriter(track);
      const trackDir = await getTrackDir(sessionId, track, false);
      if (!trackDir) return "";
      try {
        const fileHandle = await trackDir.getFileHandle(`${index}.ndjson`);
        const file = await fileHandle.getFile();
        return await file.text();
      } catch {
        return "";
      }
    },
    async evict(track, index) {
      if (writers.get(track)?.index === index) await closeWriter(track);
      const list = cachedList(track);
      const at = list.findIndex((s) => s.index === index);
      if (at !== -1) list.splice(at, 1);
      const trackDir = await getTrackDir(sessionId, track, false);
      if (!trackDir) return;
      try {
        await trackDir.removeEntry(`${index}.ndjson`);
      } catch {
        /* already gone */
      }
    },
    async clear() {
      for (const track of writers.keys()) await closeWriter(track);
      metaCache.clear();
      await removeOpfsSession(sessionId);
    },
  };
}

/** Snapshots the freshly created manifest so a leftover session can be recovered after a crash. */
export async function writeOpfsManifestSnapshot(
  sessionId: string,
  manifestJson: string,
): Promise<void> {
  if (!hasOpfsSupport()) return;
  const sessionDir = await getSessionDir(sessionId, true);
  if (!sessionDir) return;
  try {
    const fileHandle = await sessionDir.getFileHandle(MANIFEST_SNAPSHOT_FILE, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(manifestJson);
    await writable.close();
  } catch {
    /* best effort */
  }
}

/** Reads back a manifest snapshot written by `writeOpfsManifestSnapshot`, or `null` if absent. */
export async function readOpfsManifestSnapshot(sessionId: string): Promise<string | null> {
  if (!hasOpfsSupport()) return null;
  const sessionDir = await getSessionDir(sessionId, false);
  if (!sessionDir) return null;
  try {
    const fileHandle = await sessionDir.getFileHandle(MANIFEST_SNAPSHOT_FILE);
    const file = await fileHandle.getFile();
    return await file.text();
  } catch {
    return null;
  }
}

/** Lists NDJSON segment file contents for one track of one session, ordered oldest to newest. */
export async function readOpfsTrackSegments(
  sessionId: string,
  track: TrackName,
): Promise<string[]> {
  const trackDir = await getTrackDir(sessionId, track, false);
  if (!trackDir) return [];
  const indices: number[] = [];
  const iterable = trackDir as unknown as { keys(): AsyncIterable<string> };
  if (typeof iterable.keys !== "function") return [];
  for await (const name of iterable.keys()) {
    const match = /^(\d+)\.ndjson$/.exec(name);
    if (match?.[1] !== undefined) indices.push(Number(match[1]));
  }
  indices.sort((a, b) => a - b);
  const contents: string[] = [];
  for (const index of indices) {
    try {
      const fileHandle = await trackDir.getFileHandle(`${index}.ndjson`);
      const file = await fileHandle.getFile();
      contents.push(await file.text());
    } catch {
      /* skip unreadable segment */
    }
  }
  return contents;
}

/** Lists leftover session ids under `capu-recorder/`, excluding none — callers filter the active one. */
export async function listOpfsSessionIds(): Promise<string[]> {
  if (!hasOpfsSupport()) return [];
  try {
    const root = await navigator.storage.getDirectory();
    const recorderDir = await root.getDirectoryHandle(OPFS_ROOT_DIR, { create: true });
    const iterable = recorderDir as unknown as { keys(): AsyncIterable<string> };
    if (typeof iterable.keys !== "function") return [];
    const ids: string[] = [];
    for await (const name of iterable.keys()) ids.push(name);
    return ids;
  } catch {
    return [];
  }
}

/** Permanently deletes one session's directory under `capu-recorder/<sessionId>`. */
export async function removeOpfsSession(sessionId: string): Promise<void> {
  if (!hasOpfsSupport()) return;
  try {
    const root = await navigator.storage.getDirectory();
    const recorderDir = await root.getDirectoryHandle(OPFS_ROOT_DIR, { create: true });
    await recorderDir.removeEntry(sessionId, { recursive: true });
  } catch {
    /* already gone */
  }
}
