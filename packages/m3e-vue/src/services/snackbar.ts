import { shallowRef, type ShallowRef } from "vue";

/**
 * How long a snackbar stays, Compose's `SnackbarDuration`. One with an action stays until the
 * action or a dismissal by default, since a timed-out action is an action the user never saw.
 *
 * @see https://m3.material.io/components/snackbar/guidelines
 */
export const SNACKBAR_DURATION = { short: 4000, long: 10000, indefinite: Infinity } as const;

export type SnackbarDuration = keyof typeof SNACKBAR_DURATION | number;
export type SnackbarResult = "action" | "dismissed" | "timeout";

export interface SnackbarOptions {
  message: string;
  action?: string;
  /** Shows a close icon; on by default for indefinite snackbars, which have no other way out. */
  closable?: boolean;
  duration?: SnackbarDuration;
}

export interface SnackbarItem extends Required<Pick<SnackbarOptions, "message">> {
  id: number;
  action?: string;
  closable: boolean;
  durationMs: number;
  settle: (result: SnackbarResult) => void;
}

export interface SnackbarQueue {
  readonly current: ShallowRef<SnackbarItem | null>;
  show(options: SnackbarOptions | string): Promise<SnackbarResult>;
  /** Settles the visible snackbar and shows the next one. */
  settle(result: SnackbarResult): void;
  clear(): void;
}

export function createSnackbarQueue(): SnackbarQueue {
  const current = shallowRef<SnackbarItem | null>(null);
  const pending: SnackbarItem[] = [];
  let nextId = 1;

  const advance = () => {
    current.value = pending.shift() ?? null;
  };

  return {
    current,
    show(input) {
      const options = typeof input === "string" ? { message: input } : input;
      const duration = options.duration ?? (options.action ? "indefinite" : "short");
      const durationMs = typeof duration === "number" ? duration : SNACKBAR_DURATION[duration];
      return new Promise<SnackbarResult>((resolve) => {
        pending.push({
          id: nextId++,
          message: options.message,
          action: options.action,
          closable: options.closable ?? durationMs === Infinity,
          durationMs,
          settle: resolve,
        });
        if (!current.value) advance();
      });
    },
    settle(result) {
      const item = current.value;
      if (!item) return;
      item.settle(result);
      advance();
    },
    clear() {
      for (const item of pending.splice(0)) item.settle("dismissed");
      current.value?.settle("dismissed");
      current.value = null;
    },
  };
}
