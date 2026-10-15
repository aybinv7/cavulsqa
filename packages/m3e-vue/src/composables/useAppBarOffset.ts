import { computed, reactive, type ComputedRef, type Ref } from "vue";

const offsets = reactive(new WeakMap<HTMLElement, number>());

/**
 * Records how far the enter-always `M3TopAppBar` scrolling `container` has slid away. Kept beside
 * the element rather than written on it: `--m3-app-bar-offset` inherits, so setting it on the
 * scroll container restyles every descendant of a long list.
 */
export function publishAppBarOffset(container: HTMLElement, px: number) {
  offsets.set(container, px);
}

export function withdrawAppBarOffset(container: HTMLElement) {
  offsets.delete(container);
}

/**
 * How far, in px, the enter-always `M3TopAppBar` of the nearest enclosing scroll container has
 * slid away - `0` when it is shown or there is none. It changes only when the bar comes to rest
 * fully in or out, so an element pinned under the bar can write it on itself:
 * `top: calc(env(safe-area-inset-top) + 64px - var(--m3-app-bar-offset, 0px))`.
 */
export function useAppBarOffset(anchor: Ref<HTMLElement | null | undefined>): ComputedRef<number> {
  return computed(() => {
    for (let node = anchor.value?.parentElement; node; node = node.parentElement) {
      const px = offsets.get(node);
      if (px !== undefined) return px;
    }
    return 0;
  });
}
