import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import type Framework7 from "framework7/lite";

const PAGE_TIMEOUT_MS = 4000;

/**
 * `launchAutoHide` is off in `capacitor.config.ts`, so the splash stays up until this is called.
 * Hiding it on a frame boundary avoids a flash of an unpainted shell between the two.
 */
export function hideSplashScreen(): void {
  if (!Capacitor.isNativePlatform()) return;
  requestAnimationFrame(() => void SplashScreen.hide());
}

const inActiveTab = (element: Element | null | undefined) =>
  Boolean(element?.closest(".tab-active, .view-main"));

/**
 * Keeps the splash up until the visible tab's first page has rendered - route components load
 * lazily, so the shell alone would show an empty screen with a navigation bar for a beat. A page
 * that never arrives (a failed chunk) still lets the splash go after a few seconds.
 */
export function hideSplashWhenPageReady(app: Framework7): void {
  if (!Capacitor.isNativePlatform()) return;
  if (document.querySelector(".tab-active .page-current, .view-main .page-current")) {
    hideSplashScreen();
    return;
  }
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    app.off("pageInit", onPage);
    hideSplashScreen();
  };
  const onPage = (page: { el?: Element }) => {
    if (inActiveTab(page.el)) finish();
  };
  const timer = window.setTimeout(finish, PAGE_TIMEOUT_MS);
  app.on("pageInit", onPage);
}
