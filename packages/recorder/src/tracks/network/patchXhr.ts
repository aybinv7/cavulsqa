import { buildNetworkEvent, type BuiltNetworkEvent } from "./buildRecord.js";
import { createRequestIdFactory } from "./requestId.js";

export interface PatchXhrOptions {
  onEvent: (event: BuiltNetworkEvent) => void;
  redacted: ReadonlySet<string>;
  ignoreUrl?: (url: string) => boolean;
  /** Defaults to `globalThis.XMLHttpRequest.prototype`. */
  target?: typeof XMLHttpRequest;
  nextRequestId?: () => string;
}

export interface XhrPatch {
  /** Puts `open`, `setRequestHeader` and `send` back on the prototype exactly as they were. */
  restore: () => void;
}

interface XhrState {
  requestId: string;
  url: string;
  method: string;
  requestHeaders: Record<string, string>;
  startedAtMs: number;
  ignored: boolean;
}

function parseResponseHeaders(raw: string): Record<string, string> | null {
  const lines = raw
    .split("\r\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  const out: Record<string, string> = {};
  for (const line of lines) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    out[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return out;
}

function responseBodyText(xhr: XMLHttpRequest): string | null {
  const responseType = xhr.responseType;
  if (responseType === "" || responseType === "text") {
    try {
      return xhr.responseText;
    } catch {
      return null;
    }
  }
  if (responseType === "json") {
    const value: unknown = xhr.response;
    if (value === null || value === undefined) return null;
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Wraps `XMLHttpRequest.prototype.open/setRequestHeader/send` so every request produces one
 * finished/failed `NetworkCapuData` event on `loadend`. `status === 0` at `loadend` (network error,
 * abort, timeout, or opaque cross-origin failure) is recorded as `state: "failed"`.
 */
export function patchXhr(options: PatchXhrOptions): XhrPatch {
  const target =
    options.target ?? (typeof XMLHttpRequest === "undefined" ? undefined : XMLHttpRequest);
  if (!target) return { restore: () => {} };

  const nextRequestId = options.nextRequestId ?? createRequestIdFactory();
  const proto = target.prototype;
  const states = new WeakMap<XMLHttpRequest, XhrState>();

  const originalOpen = proto.open;
  const originalSetRequestHeader = proto.setRequestHeader;
  const originalSend = proto.send;

  proto.open = function patchedOpen(
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    ...rest: unknown[]
  ) {
    states.set(this, {
      requestId: "",
      url: url.toString(),
      method,
      requestHeaders: {},
      startedAtMs: 0,
      ignored: options.ignoreUrl?.(url.toString()) ?? false,
    });
    return (originalOpen as (...args: unknown[]) => void).apply(this, [method, url, ...rest]);
  } as typeof proto.open;

  proto.setRequestHeader = function patchedSetRequestHeader(
    this: XMLHttpRequest,
    name: string,
    value: string,
  ) {
    const state = states.get(this);
    if (state) state.requestHeaders[name] = value;
    return originalSetRequestHeader.call(this, name, value);
  };

  proto.send = function patchedSend(
    this: XMLHttpRequest,
    body?: Document | XMLHttpRequestBodyInit | null,
  ) {
    const state = states.get(this);
    if (state && !state.ignored) {
      state.startedAtMs = Date.now();
      state.requestId = nextRequestId();

      const onLoadend = () => {
        this.removeEventListener("loadend", onLoadend);
        const status = this.status;
        const event = buildNetworkEvent(
          {
            requestId: state.requestId,
            url: this.responseURL || state.url,
            method: state.method,
            resourceType: "XHR",
            startedAtMs: state.startedAtMs,
            requestHeaders:
              Object.keys(state.requestHeaders).length > 0 ? state.requestHeaders : null,
            requestBody: typeof body === "string" ? body : null,
            initiator: null,
          },
          {
            state: status === 0 ? "failed" : "finished",
            status: status === 0 ? null : status,
            mimeType: this.getResponseHeader("content-type"),
            responseHeaders: parseResponseHeaders(this.getAllResponseHeaders()),
            responseBodyText: status === 0 ? null : responseBodyText(this),
            finishedAtMs: Date.now(),
          },
          options.redacted,
        );
        options.onEvent(event);
      };
      this.addEventListener("loadend", onLoadend);
    }
    return originalSend.call(this, body as never);
  };

  return {
    restore() {
      proto.open = originalOpen;
      proto.setRequestHeader = originalSetRequestHeader;
      proto.send = originalSend;
    },
  };
}
