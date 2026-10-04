import { onScopeDispose, shallowRef, watch, type Ref, type ShallowRef } from "vue";

type Listener = (entry: ResizeObserverEntry) => void;

const listeners = new WeakMap<Element, Listener>();
let observer: ResizeObserver | null = null;

function shared(): ResizeObserver | null {
  if (observer || typeof ResizeObserver === "undefined") return observer;
  observer = new ResizeObserver((entries) => {
    for (const entry of entries) listeners.get(entry.target)?.(entry);
  });
  return observer;
}

export interface ElementSize {
  width: ShallowRef<number>;
  height: ShallowRef<number>;
}

/** The element's border-box size through one shared ResizeObserver; no layout reads per frame. */
export function useElementSize(target: Ref<Element | null | undefined>): ElementSize {
  const width = shallowRef(0);
  const height = shallowRef(0);
  let current: Element | null = null;

  const detach = () => {
    if (!current) return;
    shared()?.unobserve(current);
    listeners.delete(current);
    current = null;
  };

  watch(
    target,
    (element) => {
      detach();
      if (!element) return;
      const rect = element.getBoundingClientRect();
      width.value = rect.width;
      height.value = rect.height;
      const ro = shared();
      if (!ro) return;
      current = element;
      listeners.set(element, (entry) => {
        const box = entry.borderBoxSize?.[0];
        width.value = box ? box.inlineSize : entry.contentRect.width;
        height.value = box ? box.blockSize : entry.contentRect.height;
      });
      ro.observe(element, { box: "border-box" });
    },
    { immediate: true, flush: "post" },
  );

  onScopeDispose(detach);
  return { width, height };
}
