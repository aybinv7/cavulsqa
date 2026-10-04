import type { NetworkCapuData } from "../../capu/types.js";
import type { TrackContext, TrackRecorder } from "../../recorder/types.js";
import { buildRedactedHeaderSet, type RedactOptions } from "./redact.js";
import { patchFetch } from "./patchFetch.js";
import { patchXhr } from "./patchXhr.js";
import { createRequestIdFactory } from "./requestId.js";

export interface NetworkTrackOptions extends RedactOptions {
  /** URLs this returns `true` for are neither wrapped-through nor recorded (e.g. the sink's own upload endpoint). */
  ignoreUrl?: (url: string) => boolean;
}

/**
 * `TrackRecorder<NetworkCapuData>` that wraps `window.fetch` and `XMLHttpRequest` to push one
 * `finished` or `failed` event per request, at the request's own start time. Header redaction and
 * the response body size/content-type gate are applied before the event reaches `ctx.push`;
 * `stop()` restores both globals unconditionally.
 */
export function createNetworkTrack(
  options: NetworkTrackOptions = {},
): TrackRecorder<NetworkCapuData> {
  const redacted = buildRedactedHeaderSet(options);
  const nextRequestId = createRequestIdFactory();
  let fetchPatch: ReturnType<typeof patchFetch> | null = null;
  let xhrPatch: ReturnType<typeof patchXhr> | null = null;

  return {
    name: "network",

    async start(ctx: TrackContext<NetworkCapuData>) {
      const onEvent = (event: { data: NetworkCapuData; wallMs: number }) => {
        ctx.push(event.data, event.wallMs);
      };

      fetchPatch = patchFetch({
        onEvent,
        redacted,
        ignoreUrl: options.ignoreUrl,
        nextRequestId,
      });
      xhrPatch = patchXhr({
        onEvent,
        redacted,
        ignoreUrl: options.ignoreUrl,
        nextRequestId,
      });
    },

    async stop() {
      fetchPatch?.restore();
      xhrPatch?.restore();
      fetchPatch = null;
      xhrPatch = null;
    },
  };
}
