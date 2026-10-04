import { shallowRef, type Component, type ShallowRef } from "vue";

/**
 * In-app notifications, Framework7's `notification`: a banner from the top for something that
 * happened elsewhere - a message arrived, a sync finished - that the person may want to open.
 * Only one shows; a new one replaces it, as Android's heads-up notifications do.
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
  readonly current: ShallowRef<NotificationItem | null>;
  show(options: NotificationOptions): Promise<NotificationResult>;
  settle(result: NotificationResult): void;
  clear(): void;
}

export const NOTIFICATION_DURATION = 5000;

export function createNotificationQueue(): NotificationQueue {
  const current = shallowRef<NotificationItem | null>(null);
  let nextId = 1;

  return {
    current,
    show(options) {
      current.value?.settle("replaced");
      return new Promise<NotificationResult>((resolve) => {
        current.value = {
          ...options,
          id: nextId++,
          durationMs: options.duration ?? NOTIFICATION_DURATION,
          settle: resolve,
        };
      });
    },
    settle(result) {
      const item = current.value;
      if (!item) return;
      current.value = null;
      item.settle(result);
    },
    clear() {
      const item = current.value;
      current.value = null;
      item?.settle("dismissed");
    },
  };
}
