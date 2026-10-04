import { buildNetworkEvent, type BuiltNetworkEvent } from "./buildRecord.js";
import { normalizeHeadersInit } from "./headers.js";
import { createRequestIdFactory } from "./requestId.js";

export interface PatchFetchOptions {
  onEvent: (event: BuiltNetworkEvent) => void;
  redacted: ReadonlySet<string>;
  ignoreUrl?: (url: string) => boolean;
  /** Defaults to `globalThis.fetch`. */
  target?: typeof fetch;
  nextRequestId?: () => string;
}

export interface FetchPatch {
  /** Puts `window.fetch` back exactly as it was before `patchFetch` ran. */
  restore: () => void;
}

function requestBodyText(init: RequestInit | undefined): string | null {
  const body = init?.body;
  return typeof body === "string" ? body : null;
}

function requestUrlAndMethod(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
): {
  url: string;
  method: string;
  headers: Record<string, string> | null;
  body: string | null;
} {
  if (typeof Request !== "undefined" && input instanceof Request) {
    return {
      url: input.url,
      method: init?.method ?? input.method,
      headers: normalizeHeadersInit(init?.headers) ?? normalizeHeadersInit(input.headers),
      body: requestBodyText(init),
    };
  }
  return {
    url: typeof input === "string" ? input : (input as URL).toString(),
    method: init?.method ?? "GET",
    headers: normalizeHeadersInit(init?.headers),
    body: requestBodyText(init),
  };
}

/**
 * Wraps `globalThis.fetch` (or `options.target`) so every call produces one finished/failed
 * `NetworkCapuData` event. The response is cloned before its body is read so the caller's own
 * `await response.text()` / `.json()` still sees an unconsumed stream; if cloning throws, the
 * event is still emitted, just without a `responseBody`.
 */
export function patchFetch(options: PatchFetchOptions): FetchPatch {
  const target = options.target ?? (typeof fetch === "undefined" ? undefined : fetch);
  if (!target) return { restore: () => {} };

  const nextRequestId = options.nextRequestId ?? createRequestIdFactory();
  const original = target;
  const boundOriginal = original.bind(globalThis);

  const patched: typeof fetch = function patchedFetch(
    this: unknown,
    input: RequestInfo | URL,
    init?: RequestInit,
  ) {
    const { url, method, headers, body } = requestUrlAndMethod(input, init);
    if (options.ignoreUrl?.(url)) {
      return boundOriginal(input, init);
    }

    const startedAtMs = Date.now();
    const requestId = nextRequestId();

    const promise = boundOriginal(input, init);
    void promise.then(
      async (response) => {
        let responseBodyText: string | null = null;
        try {
          responseBodyText = await response.clone().text();
        } catch {
          responseBodyText = null;
        }
        const event = buildNetworkEvent(
          {
            requestId,
            url,
            method,
            resourceType: "Fetch",
            startedAtMs,
            requestHeaders: headers,
            requestBody: body,
            initiator: null,
          },
          {
            state: "finished",
            status: response.status,
            mimeType: response.headers.get("content-type"),
            responseHeaders: normalizeHeadersInit(response.headers),
            responseBodyText,
            finishedAtMs: Date.now(),
          },
          options.redacted,
        );
        options.onEvent(event);
      },
      () => {
        const event = buildNetworkEvent(
          {
            requestId,
            url,
            method,
            resourceType: "Fetch",
            startedAtMs,
            requestHeaders: headers,
            requestBody: body,
            initiator: null,
          },
          {
            state: "failed",
            status: null,
            mimeType: null,
            responseHeaders: null,
            responseBodyText: null,
            finishedAtMs: Date.now(),
          },
          options.redacted,
        );
        options.onEvent(event);
      },
    );

    return promise;
  };

  globalThis.fetch = patched;

  return {
    restore() {
      globalThis.fetch = original;
    },
  };
}
