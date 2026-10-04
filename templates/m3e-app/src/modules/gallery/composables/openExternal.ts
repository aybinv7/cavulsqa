import { Capacitor } from "@capacitor/core";

/**
 * Opens a link outside the app. On a device Capacitor hands any navigation to another host to the
 * system, so a maps link opens the maps app and a web page the browser; in a browser it opens a new
 * tab, so `vp dev` keeps the app it is running.
 */
export function openExternal(url: string): void {
  if (Capacitor.isNativePlatform()) window.location.assign(url);
  else window.open(url, "_blank", "noopener,noreferrer");
}
