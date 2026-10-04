import { onMounted, onScopeDispose, shallowRef, type Ref } from "vue";

export type ScrollTarget = HTMLElement | string | null | undefined;

function scrollableAncestor(element: HTMLElement): HTMLElement | null {
  let node = element.parentElement;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll" || node.classList.contains("page-content"))
      return node;
    node = node.parentElement;
  }
  return null;
}

/**
 * Finds the element that scrolls a component's content - an explicit element or selector, else the
 * nearest scrolling ancestor (Framework7's `.page-content` included) - and reports its scroll
 * position to `onScroll` at most once per frame, without going through Vue.
 */
export function useScrollContainer(
  anchor: Ref<HTMLElement | null | undefined>,
  target: () => ScrollTarget,
  onScroll: (scrollTop: number, delta: number) => void,
) {
  const container = shallowRef<HTMLElement | null>(null);
  let frame = 0;
  let last = 0;

  const read = () => {
    frame = 0;
    const element = container.value;
    if (!element) return;
    const top = Math.max(0, element.scrollTop);
    onScroll(top, top - last);
    last = top;
  };

  const schedule = () => {
    if (frame === 0) frame = requestAnimationFrame(read);
  };

  const detach = () => {
    container.value?.removeEventListener("scroll", schedule);
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  };

  onMounted(() => {
    const explicit = target();
    const element =
      typeof explicit === "string"
        ? document.querySelector<HTMLElement>(explicit)
        : (explicit ?? (anchor.value ? scrollableAncestor(anchor.value) : null));
    container.value = element;
    if (!element) return;
    last = element.scrollTop;
    element.addEventListener("scroll", schedule, { passive: true });
    read();
  });

  onScopeDispose(detach);
  return container;
}
