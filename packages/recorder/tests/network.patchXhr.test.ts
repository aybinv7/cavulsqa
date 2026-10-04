import { expect, test } from "vite-plus/test";
import { buildRedactedHeaderSet } from "../src/tracks/network/redact.js";
import { patchXhr } from "../src/tracks/network/patchXhr.js";
import type { BuiltNetworkEvent } from "../src/tracks/network/buildRecord.js";

class FakeXhr extends EventTarget {
  status = 0;
  response: unknown = null;
  responseText = "";
  responseType: XMLHttpRequestResponseType = "";
  responseURL = "";
  private headers = new Map<string, string>();
  private responseHeaders: Record<string, string> = {};

  open(_method: string, _url: string | URL): void {}
  setRequestHeader(name: string, value: string): void {
    this.headers.set(name, value);
  }
  send(_body?: unknown): void {}
  getResponseHeader(name: string): string | null {
    return this.responseHeaders[name.toLowerCase()] ?? null;
  }
  getAllResponseHeaders(): string {
    return Object.entries(this.responseHeaders)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\r\n");
  }
  seenRequestHeader(name: string): string | undefined {
    return this.headers.get(name);
  }
  respondJson(status: number, body: unknown): void {
    this.status = status;
    this.responseType = "json";
    this.response = body;
    this.responseHeaders = { "content-type": "application/json" };
    this.dispatchEvent(new Event("loadend"));
  }
  respondFailed(): void {
    this.status = 0;
    this.dispatchEvent(new Event("loadend"));
  }
}

function collector(): { events: BuiltNetworkEvent[]; onEvent: (event: BuiltNetworkEvent) => void } {
  const events: BuiltNetworkEvent[] = [];
  return { events, onEvent: (event) => events.push(event) };
}

test("captures a JSON XHR response body via xhr.response", () => {
  const { events, onEvent } = collector();
  const target = FakeXhr as unknown as typeof XMLHttpRequest;
  const patch = patchXhr({ onEvent, redacted: buildRedactedHeaderSet(), target });

  const xhr = new FakeXhr() as unknown as XMLHttpRequest;
  xhr.open("GET", "https://api.example.com/whoami");
  xhr.setRequestHeader("Authorization", "Bearer real-secret-token");
  xhr.send();
  (xhr as unknown as FakeXhr).respondJson(200, { ok: true });

  expect((xhr as unknown as FakeXhr).seenRequestHeader("Authorization")).toBe(
    "Bearer real-secret-token",
  );
  expect(events).toHaveLength(1);
  expect(events[0]!.data.resourceType).toBe("XHR");
  expect(events[0]!.data.state).toBe("finished");
  expect(events[0]!.data.status).toBe(200);
  expect(events[0]!.data.responseBody).toBe('{"ok":true}');
  expect(events[0]!.data.requestHeaders).toEqual({ Authorization: "[redacted]" });

  patch.restore();
});

test("a status-0 loadend is recorded as failed with a null status", () => {
  const { events, onEvent } = collector();
  const target = FakeXhr as unknown as typeof XMLHttpRequest;
  const patch = patchXhr({ onEvent, redacted: buildRedactedHeaderSet(), target });

  const xhr = new FakeXhr() as unknown as XMLHttpRequest;
  xhr.open("GET", "https://api.example.com/timeout");
  xhr.send();
  (xhr as unknown as FakeXhr).respondFailed();

  expect(events).toHaveLength(1);
  expect(events[0]!.data.state).toBe("failed");
  expect(events[0]!.data.status).toBeNull();

  patch.restore();
});

test("restore puts open/setRequestHeader/send back to the exact originals", () => {
  const target = FakeXhr as unknown as typeof XMLHttpRequest;
  const originalOpen = target.prototype.open;
  const originalSetRequestHeader = target.prototype.setRequestHeader;
  const originalSend = target.prototype.send;

  const patch = patchXhr({ onEvent: () => {}, redacted: buildRedactedHeaderSet(), target });
  expect(target.prototype.open).not.toBe(originalOpen);

  patch.restore();
  expect(target.prototype.open).toBe(originalOpen);
  expect(target.prototype.setRequestHeader).toBe(originalSetRequestHeader);
  expect(target.prototype.send).toBe(originalSend);
});
