import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";
import { useNavigationVisibility } from "@/shared/composables/navigation/useNavigationVisibility";

const EDITABLE = "input, textarea, [contenteditable='true']";
const KEEPS_KEYBOARD = `${EDITABLE}, [data-keeps-keyboard]`;

function scrollFocusedIntoView(): void {
  const focused = document.activeElement;
  if (focused instanceof HTMLElement && focused.matches(EDITABLE)) {
    focused.scrollIntoView({ block: "center", behavior: "smooth" });
  }
}

/**
 * The focused field scrolls out of view as the keyboard animates in, so it is scrolled back on
 * every phase: the layout is still settling at `keyboardWillShow` and only `keyboardDidShow` sees
 * the final height. The navigation bar leaves while the keyboard is up - it would otherwise sit on
 * the keyboard and steal a row from the field being typed into. A tap outside any field dismisses
 * the keyboard instead of leaving it over half the screen - except inside `[data-keeps-keyboard]`,
 * such as a message composer, whose send button must not close it.
 */
export function useKeyboard(): void {
  if (!Capacitor.isNativePlatform()) return;
  const { setKeyboardOpen } = useNavigationVisibility();

  void Keyboard.addListener("keyboardWillShow", () => {
    setKeyboardOpen(true);
    scrollFocusedIntoView();
  });
  void Keyboard.addListener("keyboardDidShow", scrollFocusedIntoView);
  void Keyboard.addListener("keyboardDidHide", () => setKeyboardOpen(false));

  document.addEventListener(
    "touchstart",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element) || target.closest(KEEPS_KEYBOARD)) return;
      if (
        document.activeElement instanceof HTMLElement &&
        document.activeElement.matches(EDITABLE)
      ) {
        document.activeElement.blur();
      }
    },
    { passive: true },
  );
}
