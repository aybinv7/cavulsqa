import { computed, shallowRef, type Component, type ComputedRef, type ShallowRef } from "vue";

/**
 * In-app notifications, Framework7's `notification`: banners from the top for something that
 * happened elsewhere - a message arrived, a sync finished - that the person may want to open.
 * They stack, newest in front, as Android groups its heads-up notifications; each one keeps its
 * own promise, and past `limit` the oldest gives way with `"replaced"`.
 */
export type NotificationResult = "opened" | "dismissed" | "timeout" | "replaced";

export interface NotificationOptions {
  title: string;
  text?: string;
  /** Who or what it comes from, shown small above the title - an app area, a sender. */
  source?: string;
  /** A short time stamp beside the source, such as "now". */
  meta?: string;
  /** An icon component; give it to `markRaw` before passing it. */
  icon?: Component;
  /** Milliseconds; 5000 by default, `Infinity` to stay until dismissed. */
  duration?: number;
}

export interface NotificationItem extends NotificationOptions {
  id: number;
  durationMs: number;
  settle: (result: NotificationResult) => void;
}

export interface NotificationQueue {
  /** Newest first. */
  readonly items: ShallowRef<readonly NotificationItem[]>;
  /** The one in front. */
  readonly current: ComputedRef<NotificationItem | null>;
  show(options: NotificationOptions): Promise<NotificationResult>;
  /** Settles the notification `id`, or the one in front. */
  settle(result: NotificationResult, id?: number): void;
  clear(): void;
}

export const NOTIFICATION_DURATION = 5000;

export function createNotificationQueue(limit = 5): NotificationQueue {
  const items = shallowRef<readonly NotificationItem[]>([]);
  let nextId = 1;

  function settle(result: NotificationResult, id?: number) {
    const target = id === undefined ? items.value[0] : items.value.find((item) => item.id === id);
    if (!target) return;
    items.value = items.value.filter((item) => item !== target);
    target.settle(result);
  }

  return {
    items,
    current: computed(() => items.value[0] ?? null),
    show(options) {
      return new Promise<NotificationResult>((resolve) => {
        const item: NotificationItem = {
          ...options,
          id: nextId++,
          durationMs: options.duration ?? NOTIFICATION_DURATION,
          settle: resolve,
        };
        const next = [item, ...items.value];
        const overflow = next.slice(Math.max(1, limit));
        items.value = next.slice(0, Math.max(1, limit));
        for (const old of overflow) old.settle("replaced");
      });
    },
    settle,
    clear() {
      const all = items.value;
      items.value = [];
      for (const item of all) item.settle("dismissed");
    },
  };
}
