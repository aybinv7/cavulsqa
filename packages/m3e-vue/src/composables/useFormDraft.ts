import {
  isRef,
  onScopeDispose,
  shallowRef,
  toRaw,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type Ref,
} from "vue";

/** Where drafts live. Every method may be synchronous or return a promise. */
export interface DraftStorage {
  get: (key: string) => string | null | Promise<string | null>;
  set: (key: string, value: string) => void | Promise<void>;
  remove: (key: string) => void | Promise<void>;
}

export interface FormDraftOptions<T> {
  /** Defaults to `localStorage`; pass an async store - SQLite, Preferences - to keep drafts there. */
  storage?: DraftStorage;
  /** Quiet time, in ms, after the last edit before the draft is written. */
  debounce?: number;
  /** Bump when the form's shape changes; a draft saved under another version is dropped. */
  version?: number;
  /** A draft older than this, in ms, is dropped instead of restored. */
  maxAge?: number;
  /** Decide whether a found draft is applied; return false to leave the form as it is. */
  accept?: (draft: T, savedAt: Date) => boolean;
}

interface Envelope<T> {
  v: number;
  at: number;
  data: T;
}

const PREFIX = "m3e.draft:";

export const localDraftStorage: DraftStorage = {
  get: (key) => localStorage.getItem(key),
  set: (key, value) => localStorage.setItem(key, value),
  remove: (key) => localStorage.removeItem(key),
};

function apply<T>(state: Ref<T> | T, data: T) {
  if (isRef(state)) state.value = data;
  else Object.assign(state as object, data);
}

/**
 * Framework7's form storage for an offline app: what is typed into a form is kept as a draft while
 * it is typed - debounced, and written at once when the app goes to the background - and put back
 * when the form opens again, so a call, a crash or a dead battery never costs a half-filled order.
 * Call `clear()` once the form is submitted or deliberately abandoned; a form put back to its
 * starting values keeps no draft either.
 *
 * `state` is a reactive object or a ref holding plain, JSON-safe values. Restoring never overwrites
 * an edit made while an asynchronous store was still reading. Storage failures do not throw: they
 * land in `error`, and the form keeps working without its draft.
 */
export function useFormDraft<T extends object>(
  key: MaybeRefOrGetter<string>,
  state: Ref<T> | T,
  options: FormDraftOptions<T> = {},
) {
  const storage = options.storage ?? localDraftStorage;
  const debounce = options.debounce ?? 400;
  const version = options.version ?? 1;
  const restored = shallowRef(false);
  const savedAt = shallowRef<Date | null>(null);
  const error = shallowRef<unknown>(null);
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingKey = "";
  let baseline = "";
  let edited = false;
  let generation = 0;

  const storageKey = () => PREFIX + toValue(key);
  const snapshot = () => toRaw(isRef(state) ? state.value : state);
  const pristine = JSON.stringify(snapshot());

  async function guard<R>(run: () => R | Promise<R>): Promise<R | undefined> {
    try {
      return await run();
    } catch (failure) {
      error.value = failure;
      return undefined;
    }
  }

  async function save(target: string) {
    timer = null;
    const envelope: Envelope<T> = { v: version, at: Date.now(), data: snapshot() };
    const written = await guard(async () => {
      await storage.set(target, JSON.stringify(envelope));
      return true;
    });
    if (written && target === storageKey()) savedAt.value = new Date(envelope.at);
  }

  function flush() {
    if (!timer) return;
    clearTimeout(timer);
    void save(pendingKey);
  }

  async function restore() {
    flush();
    const run = (generation += 1);
    edited = false;
    baseline = JSON.stringify(snapshot());
    restored.value = false;
    savedAt.value = null;
    const raw = await guard(() => storage.get(storageKey()));
    if (run !== generation || edited || !raw) return;
    const envelope = await guard(() => JSON.parse(raw) as Envelope<T>);
    const fresh =
      envelope &&
      envelope.v === version &&
      typeof envelope.at === "number" &&
      (options.maxAge === undefined || Date.now() - envelope.at <= options.maxAge);
    if (!envelope || !fresh) {
      await guard(() => storage.remove(storageKey()));
      return;
    }
    const at = new Date(envelope.at);
    if (options.accept && !options.accept(envelope.data, at)) return;
    apply(state, envelope.data);
    baseline = JSON.stringify(snapshot());
    restored.value = true;
    savedAt.value = at;
  }

  async function clear() {
    if (timer) clearTimeout(timer);
    timer = null;
    edited = false;
    restored.value = false;
    savedAt.value = null;
    await guard(() => storage.remove(storageKey()));
  }

  watch(
    () => (isRef(state) ? state.value : state),
    () => {
      const current = JSON.stringify(snapshot());
      if (current === baseline) return;
      baseline = "";
      edited = true;
      pendingKey = storageKey();
      if (timer) clearTimeout(timer);
      timer = null;
      if (current === pristine) {
        savedAt.value = null;
        const target = pendingKey;
        void guard(() => storage.remove(target));
        return;
      }
      timer = setTimeout(() => void save(pendingKey), debounce);
    },
    { deep: true },
  );

  watch(
    () => toValue(key),
    () => void restore(),
    { immediate: true },
  );

  const onHidden = () => {
    if (document.visibilityState === "hidden") flush();
  };
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", flush);
  }

  onScopeDispose(() => {
    flush();
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", flush);
    }
  });

  return { restored, savedAt, error, clear, flush };
}
