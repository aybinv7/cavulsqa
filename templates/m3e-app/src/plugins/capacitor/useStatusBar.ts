import { Capacitor } from "@capacitor/core";
import { StatusBar } from "@capacitor/status-bar";

/**
 * Edge to edge: the status bar is transparent over the web view and the top app bar pads itself
 * with the safe-area inset. Its icon colour follows the theme's dark mode, which the theme sets -
 * see `useThemeSettings`.
 */
export async function useStatusBar(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await StatusBar.setOverlaysWebView({ overlay: true });
  } catch (error) {
    console.warn("[status-bar] overlay not applied", error);
  }
}
