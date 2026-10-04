import { shallowRef, type ShallowRef } from "vue";
import { START_TAB, tabs } from "@/app/tabs";

const active = shallowRef(START_TAB);

export interface ActiveTab {
  active: Readonly<ShallowRef<string>>;
  show: (id: string) => void;
  /** Switches destination, then pushes `path` onto that destination's own history. */
  open: (id: string, path: string) => void;
  /** Back from the top of any other destination returns to the start one, as M3 navigation does. */
  isStart: () => boolean;
}

/**
 * The selected destination, shared by the shell's bar or rail and the Android back handler.
 * Switching happens through Framework7's tab API so each view keeps its own history and the
 * reactive queries see the `page:tabshow` / `page:tabhide` events they pause on.
 */
export function useActiveTab(): ActiveTab {
  const show = (id: string) => {
    if (!tabs.some((tab) => tab.id === id)) return;
    active.value = id;
    f7ready((app) => {
      app.tab.show(`#view-${id}`);
    });
  };
  return {
    active,
    show,
    open(id, path) {
      show(id);
      f7ready((app) => {
        app.views.get(`#view-${id}`)?.router.navigate(path);
      });
    },
    isStart: () => active.value === START_TAB,
  };
}
