import { onScopeDispose, toValue, watch, type MaybeRefOrGetter, type Ref } from "vue";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
  "[contenteditable='true']",
].join(",");

function focusables(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) => !element.closest("[inert]") && element.getClientRects().length > 0,
  );
}

/**
 * Keeps keyboard focus inside a modal surface while it is active and hands it back to whatever had
 * it before. The container itself takes focus first, so a screen reader announces the surface
 * rather than jumping to its first button.
 */
export function useFocusTrap(
  container: Ref<HTMLElement | null | undefined>,
  active: MaybeRefOrGetter<boolean>,
) {
  let previous: HTMLElement | null = null;

  const onKeydown = (event: KeyboardEvent) => {
    const root = container.value;
    if (event.key !== "Tab" || !root) return;
    const items = focusables(root);
    if (items.length === 0) {
      event.preventDefault();
      root.focus();
      return;
    }
    const first = items[0]!;
    const last = items.at(-1)!;
    const current = document.activeElement;
    if (event.shiftKey && (current === first || current === root)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && current === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const release = () => {
    document.removeEventListener("keydown", onKeydown, true);
    if (previous?.isConnected) previous.focus({ preventScroll: true });
    previous = null;
  };

  watch(
    [() => toValue(active), container],
    ([on, root]) => {
      if (on && root) {
        if (!previous) previous = document.activeElement as HTMLElement | null;
        document.addEventListener("keydown", onKeydown, true);
        if (!root.contains(document.activeElement)) root.focus({ preventScroll: true });
      } else if (!on && previous !== null) {
        release();
      }
    },
    { flush: "post" },
  );

  onScopeDispose(() => {
    if (previous !== null) release();
  });
}
