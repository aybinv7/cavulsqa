import type { ConsoleCapuData } from "../../capu/types.js";
import { buildEntry } from "./entry.js";
import { argToText, serializeArg } from "./serializeArg.js";

export interface CaptureErrorsOptions {
  onEntry: (entry: ConsoleCapuData) => void;
  /** Defaults to `globalThis.window`; when neither is available nothing is captured. */
  target?: EventTarget;
}

export interface ErrorCapture {
  stop: () => void;
}

interface ErrorEventLike {
  message?: unknown;
  filename?: unknown;
  lineno?: unknown;
  error?: unknown;
}

interface RejectionEventLike {
  reason?: unknown;
}

/**
 * Listens for `error` and `unhandledrejection` on `target` and records each as a `level: "error"`
 * row. `source` and `line` come from the `ErrorEvent` when it carries them; the thrown value is the
 * single serialized argument so the stack survives into the replay.
 */
export function captureErrors(options: CaptureErrorsOptions): ErrorCapture {
  const target = options.target ?? (typeof window === "undefined" ? undefined : window);
  if (!target) return { stop: () => {} };

  function emit(entry: ConsoleCapuData): void {
    try {
      options.onEntry(entry);
    } catch {
      return;
    }
  }

  function onError(event: Event): void {
    const { message, filename, lineno, error } = event as ErrorEventLike;
    const thrown = error ?? (typeof message === "string" ? message : "Unknown error");
    const text = `Uncaught ${argToText(serializeArg(thrown))}`;
    emit({
      ...buildEntry("error", [thrown]),
      text,
      source: typeof filename === "string" && filename ? filename : null,
      line: typeof lineno === "number" && lineno > 0 ? lineno : null,
    });
  }

  function onRejection(event: Event): void {
    const { reason } = event as RejectionEventLike;
    const text = `Uncaught (in promise) ${argToText(serializeArg(reason))}`;
    emit({ ...buildEntry("error", [reason]), text });
  }

  target.addEventListener("error", onError);
  target.addEventListener("unhandledrejection", onRejection);

  return {
    stop() {
      target.removeEventListener("error", onError);
      target.removeEventListener("unhandledrejection", onRejection);
    },
  };
}
