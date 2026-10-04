import { onScopeDispose, shallowRef, watch, type Ref, type ShallowRef } from "vue";

type Listener = (visible: boolean) => void;

const listeners = new WeakMap<Element, Listener>();
let observer: IntersectionObserver | null = null;

function shared(): IntersectionObserver | null {
  if (observer || typeof IntersectionObserver === "undefined") return observer;
  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) listeners.get(entry.target)?.(entry.isIntersecting);
  });
  return observer;
}

/**
 * Whether the element is on screen, through one shared IntersectionObserver. Starts true so the
 * first frame draws before the observer reports; without IntersectionObserver it stays true.
 */
export function useInView(target: Ref<Element | null | undefined>): ShallowRef<boolean> {
  const visible = shallowRef(true);
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
      const io = shared();
      if (!element || !io) return;
      current = element;
      listeners.set(element, (value) => (visible.value = value));
      io.observe(element);
    },
    { immediate: true, flush: "post" },
  );

  onScopeDispose(detach);
  return visible;
}
