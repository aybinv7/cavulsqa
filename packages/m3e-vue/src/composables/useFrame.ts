import { onScopeDispose, toValue, watch, type MaybeRefOrGetter } from "vue";

export type FrameCallback = (now: number, delta: number) => void;

const subscribers = new Set<FrameCallback>();
let handle = 0;
let last = 0;

function loop(now: number) {
  const delta = last === 0 ? 16.7 : Math.min(now - last, 100);
  last = now;
  for (const callback of subscribers) callback(now, delta);
  if (subscribers.size > 0) {
    handle = requestAnimationFrame(loop);
  } else {
    handle = 0;
    last = 0;
  }
}

/**
 * Every animated component on screen draws from one animation-frame loop, which stops when the last
 * one leaves. Twenty loading indicators cost one rAF callback, not twenty.
 */
export function subscribeFrame(callback: FrameCallback): () => void {
  subscribers.add(callback);
  if (handle === 0) handle = requestAnimationFrame(loop);
  return () => {
    subscribers.delete(callback);
  };
}

/** Runs `callback` on every frame while `active` is true, and never after the scope is disposed. */
export function useFrame(callback: FrameCallback, active: MaybeRefOrGetter<boolean>): void {
  let unsubscribe: (() => void) | null = null;
  const stop = () => {
    unsubscribe?.();
    unsubscribe = null;
  };
  watch(
    () => toValue(active),
    (running) => {
      if (running && !unsubscribe) unsubscribe = subscribeFrame(callback);
      else if (!running) stop();
    },
    { immediate: true },
  );
  onScopeDispose(stop);
}
