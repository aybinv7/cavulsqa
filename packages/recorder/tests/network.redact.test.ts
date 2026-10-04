import { expect, test } from "vite-plus/test";
import {
  DEFAULT_REDACTED_HEADERS,
  MAX_BODY_BYTES,
  buildRedactedHeaderSet,
  getContentType,
  redactHeaders,
  toRecordableBody,
} from "../src/tracks/network/redact.js";

test("buildRedactedHeaderSet lowercases the defaults and merges extraHeaders", () => {
  const set = buildRedactedHeaderSet({ extraHeaders: ["X-Session-Token"] });
  for (const name of DEFAULT_REDACTED_HEADERS) expect(set.has(name)).toBe(true);
  expect(set.has("x-session-token")).toBe(true);
});

test("redactHeaders replaces every matched header case-insensitively and leaves the rest", () => {
  const set = buildRedactedHeaderSet();
  const result = redactHeaders(
    { Authorization: "Bearer secret", "X-Request-Id": "abc", Cookie: "session=1" },
    set,
  );
  expect(result).toEqual({
    Authorization: "[redacted]",
    "X-Request-Id": "abc",
    Cookie: "[redacted]",
  });
});

test("redactHeaders passes through null", () => {
  expect(redactHeaders(null, buildRedactedHeaderSet())).toBeNull();
});

test("toRecordableBody keeps a small JSON body", () => {
  const result = toRecordableBody('{"ok":true}', "application/json; charset=utf-8");
  expect(result).toEqual({ body: '{"ok":true}', error: null });
});

test("toRecordableBody skips a 1 MiB JSON body and explains why", () => {
  const oneMib = "a".repeat(1024 * 1024);
  const result = toRecordableBody(oneMib, "application/json");
  expect(result.body).toBeNull();
  expect(result.error).toBe(`skipped: body exceeded ${MAX_BODY_BYTES} bytes`);
});

test("toRecordableBody skips an unsupported content-type", () => {
  const result = toRecordableBody("binarydata", "image/png");
  expect(result.body).toBeNull();
  expect(result.error).toBe("skipped: unsupported content-type image/png");
});

test("toRecordableBody keeps text/* and form-urlencoded", () => {
  expect(toRecordableBody("plain", "text/plain").body).toBe("plain");
  expect(toRecordableBody("a=1&b=2", "application/x-www-form-urlencoded").body).toBe("a=1&b=2");
});

test("getContentType finds the header regardless of casing", () => {
  expect(getContentType({ "Content-Type": "text/html" })).toBe("text/html");
  expect(getContentType({})).toBeNull();
  expect(getContentType(null)).toBeNull();
});
