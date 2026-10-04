import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import type Framework7 from "framework7";
import { m3e } from "@/plugins/m3e.plugin";
import { useActiveTab } from "@/shared/composables/navigation/useActiveTab";
import { START_TAB } from "@/app/tabs";

/**
 * Android back closes what is on top before it navigates, in this order:
 * 1. the topmost M3 overlay - a sheet, a dialog, a menu, the FAB menu. A persistent one swallows
 *    back instead of closing, so a required decision cannot be backed out of by accident;
 * 2. the current tab's own history;
 * 3. from the root of any other destination, the start destination, as M3 navigation does;
 * 4. otherwise the app goes to the background rather than exiting, so it reopens where it was.
 */
export async function useAndroidBackButton(f7: Framework7): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const tabs = useActiveTab();

  await App.addListener("backButton", () => {
    if (m3e.config.overlays.closeTop()) return;

    const view = f7.views.current;
    if (view?.router && view.router.history.length > 1) {
      view.router.back();
      return;
    }

    if (!tabs.isStart()) {
      tabs.show(START_TAB);
      return;
    }

    void App.minimizeApp();
  });
}
