import {
  createConsoleTrack,
  createDatabasesTrack,
  createNetworkTrack,
  createPerfTrack,
  createRecorder,
  createRrwebTrack,
  type Recorder,
  type TrackContext,
  type TrackRecorder,
} from "@cavulsqa/recorder";
import { changeBus } from "@/shared/database/database";
import { createCapacitorSink } from "@/shared/recorder/capacitorSink";

const RRWEB_VERIFY_WINDOW_MS = 2000;

export type RecorderBackend = "memory" | "opfs" | null;

export interface RecorderDiagnostics {
  enabled: boolean;
  recording: boolean;
  backend: RecorderBackend;
  rrwebAvailable: boolean;
  lastError: string | null;
}

export const recorderDiagnostics = ref<RecorderDiagnostics>({
  enabled: false,
  recording: false,
  backend: null,
  rrwebAvailable: true,
  lastError: null,
});

let recorder: Recorder | null = null;

function resolveFieldRecorderMode(): "on" | "off" {
  const raw = import.meta.env.VITE_FIELD_RECORDER;
  if (raw === "on" || raw === "off") return raw;
  return import.meta.env.DEV ? "on" : "off";
}

function isCapuError(data: unknown): boolean {
  return typeof data === "object" && data !== null && "__capuError" in data;
}

/**
 * Wraps `createRrwebTrack` with a runtime check: rrweb's published package resolves to an empty
 * module outside a bundler, and a `record()` call against that module fails silently inside the
 * track's own try/catch, so the recorder would otherwise report a healthy `rrweb` track that never
 * emitted a frame. This watches the first events pushed and flips `rrwebAvailable` to `false` if
 * nothing but a `__capuError` payload arrives within {@link RRWEB_VERIFY_WINDOW_MS}.
 */
function createVerifiedRrwebTrack(): TrackRecorder {
  const inner = createRrwebTrack();
  let sawRealFrame = false;

  return {
    name: "rrweb",
    async start(ctx: TrackContext<unknown>) {
      const wrapped: TrackContext<unknown> = {
        ...ctx,
        push(data, wallMs) {
          if (!sawRealFrame && !isCapuError(data)) sawRealFrame = true;
          ctx.push(data, wallMs);
        },
      };
      await inner.start(wrapped);
      setTimeout(() => {
        recorderDiagnostics.value = { ...recorderDiagnostics.value, rrwebAvailable: sawRealFrame };
        if (!sawRealFrame) {
          console.error(
            "[recorder] rrweb produced no frames; recording is running without screen replay.",
          );
        }
      }, RRWEB_VERIFY_WINDOW_MS);
    },
    async stop() {
      await inner.stop();
    },
  };
}

function buildTracks(): TrackRecorder[] {
  return [
    createVerifiedRrwebTrack(),
    createConsoleTrack(),
    createNetworkTrack(),
    createPerfTrack(),
    createDatabasesTrack({ changeBus }),
  ];
}

function syncDiagnostics(): void {
  if (!recorder) return;
  const status = recorder.status;
  recorderDiagnostics.value = {
    ...recorderDiagnostics.value,
    recording: status.recording,
    backend: status.backend,
    lastError: status.lastError,
  };
}

/**
 * Builds and starts the field recorder, gated by `VITE_FIELD_RECORDER` (`"on"` or `"off"`,
 * defaulting to `on` in dev and `off` in a production build). Recovers a leftover session from a
 * previous run before starting a new one. Never throws: every failure lands in
 * {@link recorderDiagnostics}.`lastError` instead, so a broken recorder can never block `main.ts`
 * from mounting the app.
 */
export async function recorderPlugin(): Promise<void> {
  const mode = resolveFieldRecorderMode();
  recorderDiagnostics.value = { ...recorderDiagnostics.value, enabled: mode === "on" };
  if (mode === "off") return;

  try {
    recorder = createRecorder({
      tracks: buildTracks(),
      sink: createCapacitorSink(),
      label: "field recording",
      appId: __APP_NAME__,
      appVersion: __APP_VERSION__,
    });

    await recorder.recover();
    await recorder.start();
    syncDiagnostics();
  } catch (error) {
    recorderDiagnostics.value = {
      ...recorderDiagnostics.value,
      lastError: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Finalizes the current buffer into a `.capu` and hands it to the sink without stopping the
 * recorder, for the Settings "Report a problem" action. Returns `true` when the capture reached
 * the sink with no error.
 */
export async function reportProblem(): Promise<boolean> {
  if (!recorder) return false;
  try {
    await recorder.capture("user report");
  } catch (error) {
    recorderDiagnostics.value = {
      ...recorderDiagnostics.value,
      lastError: error instanceof Error ? error.message : String(error),
    };
    return false;
  }
  syncDiagnostics();
  return recorderDiagnostics.value.lastError === null;
}
