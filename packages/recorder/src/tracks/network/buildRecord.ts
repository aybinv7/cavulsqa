import type { NetworkCapuData, NetworkRequestState } from "../../capu/types.js";
import { getContentType, redactHeaders, toRecordableBody } from "./redact.js";
import { resolveNetworkTiming } from "./timing.js";

export interface RawRequestInfo {
  requestId: string;
  url: string;
  method: string;
  resourceType: string;
  startedAtMs: number;
  requestHeaders: Record<string, string> | null;
  requestBody: string | null;
  initiator: string | null;
}

export interface RawResponseInfo {
  state: NetworkRequestState;
  status: number | null;
  mimeType: string | null;
  responseHeaders: Record<string, string> | null;
  responseBodyText: string | null;
  finishedAtMs: number;
}

export interface BuiltNetworkEvent {
  data: NetworkCapuData;
  wallMs: number;
}

/**
 * Combines a request and its outcome into the `NetworkCapuData` row the track pushes: header
 * redaction, the response body size/content-type gate, and best-effort `PerformanceResourceTiming`
 * matching all happen here so `patchFetch` and `patchXhr` only supply raw values.
 */
export function buildNetworkEvent(
  request: RawRequestInfo,
  response: RawResponseInfo,
  redacted: ReadonlySet<string>,
): BuiltNetworkEvent {
  const { timing, transferSize } = resolveNetworkTiming(request.url, request.startedAtMs);
  const { body: responseBody, error: responseBodyError } = toRecordableBody(
    response.responseBodyText,
    response.mimeType ?? getContentType(response.responseHeaders),
  );

  const data: NetworkCapuData = {
    requestId: request.requestId,
    url: request.url,
    method: request.method,
    status: response.status,
    resourceType: request.resourceType,
    duration: response.finishedAtMs - request.startedAtMs,
    transferSize,
    state: response.state,
    mimeType: response.mimeType,
    requestHeaders: redactHeaders(request.requestHeaders, redacted),
    responseHeaders: redactHeaders(response.responseHeaders, redacted),
    requestBody: request.requestBody,
    responseBody,
    responseBodyBase64: false,
    responseBodyError,
    timing,
    initiator: request.initiator,
  };

  return { data, wallMs: request.startedAtMs };
}
