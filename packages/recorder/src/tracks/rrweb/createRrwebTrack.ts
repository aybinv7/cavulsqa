import { addCustomEvent, record as rrwebRecord } from "rrweb";
import type { TrackContext, TrackRecorder } from "../../recorder/types.js";
import { installRouteChangeTracking } from "./routeChange.js";

/**
 * `rrweb.record` options this track exposes, with field masking and bandwidth defaults from the
 * Cavulsqa Recorder Plan. Every field is overridable by the consuming app.
 */
export interface RrwebTrackOptions {
  /** Masks every input's value. Default `true`. */
  maskAllInputs?: boolean;
  /** Elements matching this selector have their text masked. Default `"[data-capu-mask]"`. */
  maskTextSelector?: string;
  /** Elements matching this selector are recorded as opaque blocks. Default `"[data-capu-block]"`. */
  blockSelector?: string;
  /** Inlines `<img>` sources as data URLs. Default `false` (mobile data bandwidth). */
  inlineImages?: boolean;
  /** Collects and inlines used web fonts. Default `false` (mobile data bandwidth). */
  collectFonts?: boolean;
  /** Inlines external stylesheets. Default `true`, matching rrweb's own default. */
  inlineStylesheet?: boolean;
  /** Records `<canvas>` content. Default `false`. */
  recordCanvas?: boolean;
  /** Records same-process cross-origin iframes. Default `false`. */
  recordCrossOriginIframes?: boolean;
  /**
   * Forces a full-snapshot checkout every `n` milliseconds, so a trimmed ring buffer segment
   * still starts from a complete DOM. Default `60_000`, matching the ring buffer's segment length.
   */
  checkoutEveryNms?: number;
}

const DEFAULT_OPTIONS: Required<RrwebTrackOptions> = {
  maskAllInputs: true,
  maskTextSelector: "[data-capu-mask]",
  blockSelector: "[data-capu-block]",
  inlineImages: false,
  collectFonts: false,
  inlineStylesheet: true,
  recordCanvas: false,
  recordCrossOriginIframes: false,
  checkoutEveryNms: 60_000,
};

/**
 * Records the page with rrweb, pushing every raw event through `ctx.push(event, event.timestamp)`
 * and emitting `capu:route-change` custom events on `pushState`, `replaceState` and `popstate`.
 * `start` is idempotent; `stop` restores every hook rrweb and the route-change patch installed, and
 * a later `start` works again. A failure inside `emit` is reported once as `{ __capuError }` and
 * never rethrown into rrweb.
 */
export function createRrwebTrack(options: RrwebTrackOptions = {}): TrackRecorder<unknown> {
  const resolved: Required<RrwebTrackOptions> = { ...DEFAULT_OPTIONS, ...options };
  let stopRecording: (() => void) | undefined;
  let restoreRouteChange: (() => void) | undefined;
  let started = false;

  return {
    name: "rrweb",

    async start(ctx: TrackContext<unknown>): Promise<void> {
      if (started) return;

      let errorReported = false;
      function reportErrorOnce(error: unknown): void {
        if (errorReported) return;
        errorReported = true;
        try {
          ctx.push({ __capuError: error instanceof Error ? error.message : String(error) });
        } catch {
          return;
        }
      }

      try {
        stopRecording = rrwebRecord({
          emit: (event) => {
            try {
              ctx.push(event, event.timestamp);
            } catch (error) {
              reportErrorOnce(error);
            }
          },
          maskAllInputs: resolved.maskAllInputs,
          maskTextSelector: resolved.maskTextSelector,
          blockSelector: resolved.blockSelector,
          inlineImages: resolved.inlineImages,
          collectFonts: resolved.collectFonts,
          inlineStylesheet: resolved.inlineStylesheet,
          recordCanvas: resolved.recordCanvas,
          recordCrossOriginIframes: resolved.recordCrossOriginIframes,
          checkoutEveryNms: resolved.checkoutEveryNms,
        });
      } catch (error) {
        reportErrorOnce(error);
        return;
      }

      restoreRouteChange = installRouteChangeTracking((url) => {
        try {
          addCustomEvent("capu:route-change", { url });
        } catch (error) {
          reportErrorOnce(error);
        }
      });

      started = true;
    },

    async stop(): Promise<void> {
      if (!started) return;
      started = false;
      restoreRouteChange?.();
      restoreRouteChange = undefined;
      stopRecording?.();
      stopRecording = undefined;
    },
  };
}
