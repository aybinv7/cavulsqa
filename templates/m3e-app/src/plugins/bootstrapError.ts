import {
  MINIMUM_CHROMIUM_FOR_OPFS,
  webviewLikelyTooOld,
  webviewVersion,
} from "@/shared/database/storage";
import { hideSplashScreen } from "@/plugins/capacitor/useSplashScreen";

/**
 * The screen shown when the app cannot start, which in practice means the database did not open.
 *
 * Deliberately framework-free. Mounting the app to report the failure would run screens that assume
 * a working database, so a second failure would replace the first and the person would learn
 * nothing. Plain DOM cannot fail for the same reason twice.
 *
 * It replaces a red sentence in a bare div, which is what shipped before and told a field user
 * nothing they could act on.
 */
export function renderBootstrapError(error: unknown): void {
  hideSplashScreen();
  const root = document.getElementById("app");
  if (!root) return;

  const message = error instanceof Error ? error.message : String(error);
  const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
  const version = webviewVersion();

  const advice = webviewLikelyTooOld()
    ? `This WebView is Chromium ${String(version)}. The app needs ${String(MINIMUM_CHROMIUM_FOR_OPFS)} or newer for local storage. Update Android System WebView in the Play Store - it updates separately from Android itself.`
    : "Closing the app completely and opening it again usually clears this. Your data has not been deleted.";

  root.replaceChildren();
  root.insertAdjacentHTML(
    "afterbegin",
    `<div style="font:16px/1.5 var(--md-ref-typeface-plain,system-ui),sans-serif;padding:max(32px,env(safe-area-inset-top)) 24px 32px;max-width:38rem;margin:0 auto;min-height:100dvh;box-sizing:border-box;background:var(--md-sys-color-surface,#fff);color:var(--md-sys-color-on-surface,#1c1b1f)">
      <div style="width:56px;height:56px;border-radius:28px;display:grid;place-items:center;font-size:28px;background:var(--md-sys-color-error-container,#ffdad6);color:var(--md-sys-color-on-error-container,#410002)">!</div>
      <h1 style="font:400 28px/36px var(--md-ref-typeface-brand,system-ui),sans-serif;margin:20px 0 8px">The app could not start</h1>
      <p style="margin:0 0 12px;color:var(--md-sys-color-on-surface-variant,#49454f)">${escapeHtml(message)}</p>
      <p style="margin:0 0 24px;color:var(--md-sys-color-on-surface-variant,#49454f)">${escapeHtml(advice)}</p>
      <button id="bootstrap-retry" style="appearance:none;border:0;border-radius:28px;height:56px;width:100%;background:var(--md-sys-color-primary,#6750a4);color:var(--md-sys-color-on-primary,#fff);font:500 16px var(--md-ref-typeface-plain,system-ui),sans-serif">
        Try again
      </button>
      <details style="margin-top:24px;color:var(--md-sys-color-on-surface-variant,#49454f)">
        <summary style="cursor:pointer;font-size:13px">Technical details</summary>
        <p style="font-size:12px;margin:8px 0 0">WebView: Chromium ${version === null ? "unknown" : String(version)}</p>
        <pre style="font-size:11px;white-space:pre-wrap;word-break:break-word;margin:8px 0 0">${escapeHtml(detail)}</pre>
      </details>
    </div>`,
  );

  document.getElementById("bootstrap-retry")?.addEventListener("click", () => {
    window.location.reload();
  });
}

/** The message can carry an engine's own text, and that text is not trusted markup. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
