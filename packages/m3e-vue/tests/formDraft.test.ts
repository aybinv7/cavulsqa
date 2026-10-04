import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { effectScope, nextTick, reactive, ref } from "vue";
import { useFormDraft, type DraftStorage } from "../src/index.js";

function memory(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const storage: DraftStorage = {
    get: (key) => data.get(key) ?? null,
    set: (key, value) => void data.set(key, value),
    remove: (key) => void data.delete(key),
  };
  return { data, storage };
}

const envelope = (data: object, at = Date.now(), v = 1) => JSON.stringify({ v, at, data });

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useFormDraft", () => {
  test("saves after the quiet time and restores into a fresh form", async () => {
    const { data, storage } = memory();
    const scope = effectScope();
    const form = reactive({ customer: "", note: "" });
    const draft = scope.run(() => useFormDraft("order", form, { storage }))!;
    await vi.advanceTimersByTimeAsync(0);
    form.customer = "Supérette El Feth";
    await nextTick();
    expect(data.size).toBe(0);
    await vi.advanceTimersByTimeAsync(400);
    expect(JSON.parse(data.get("m3e.draft:order")!).data).toEqual({
      customer: "Supérette El Feth",
      note: "",
    });
    expect(draft.savedAt.value).toBeInstanceOf(Date);
    scope.stop();

    const again = effectScope();
    const reopened = reactive({ customer: "", note: "" });
    const restoredDraft = again.run(() => useFormDraft("order", reopened, { storage }))!;
    await vi.advanceTimersByTimeAsync(0);
    expect(reopened.customer).toBe("Supérette El Feth");
    expect(restoredDraft.restored.value).toBe(true);
    await vi.advanceTimersByTimeAsync(1000);
    expect(data.size).toBe(1);
    again.stop();
  });

  test("a stale version or an expired draft is dropped, not restored", async () => {
    for (const stored of [
      envelope({ customer: "old" }, Date.now(), 0),
      envelope({ customer: "old" }, Date.now() - 10_000),
    ]) {
      const { data, storage } = memory({ "m3e.draft:order": stored });
      const scope = effectScope();
      const form = reactive({ customer: "" });
      scope.run(() => useFormDraft("order", form, { storage, maxAge: 5_000 }));
      await vi.advanceTimersByTimeAsync(0);
      expect(form.customer).toBe("");
      expect(data.size).toBe(0);
      scope.stop();
    }
  });

  test("an edit made while a slow store reads is never overwritten", async () => {
    let release!: (value: string) => void;
    const storage: DraftStorage = {
      get: () => new Promise((resolve) => (release = resolve)),
      set: vi.fn(),
      remove: vi.fn(),
    };
    const scope = effectScope();
    const form = ref({ customer: "" });
    const draft = scope.run(() => useFormDraft("order", form, { storage }))!;
    form.value = { customer: "typed first" };
    await nextTick();
    release(envelope({ customer: "from storage" }));
    await vi.advanceTimersByTimeAsync(0);
    expect(form.value.customer).toBe("typed first");
    expect(draft.restored.value).toBe(false);
    scope.stop();
  });

  test("clear removes the draft, and a reset form keeps none", async () => {
    const { data, storage } = memory();
    const scope = effectScope();
    const form = reactive({ customer: "" });
    const draft = scope.run(() => useFormDraft("order", form, { storage }))!;
    await vi.advanceTimersByTimeAsync(0);
    form.customer = "Karim";
    await vi.advanceTimersByTimeAsync(400);
    expect(data.size).toBe(1);
    form.customer = "";
    await vi.advanceTimersByTimeAsync(400);
    expect(data.size).toBe(0);
    form.customer = "Amina";
    await vi.advanceTimersByTimeAsync(400);
    await draft.clear();
    expect(data.size).toBe(0);
    expect(draft.savedAt.value).toBeNull();
    scope.stop();
  });

  test("going to the background writes at once; a failing store reports instead of throwing", async () => {
    const { data, storage } = memory();
    const scope = effectScope();
    const form = reactive({ customer: "" });
    scope.run(() => useFormDraft("order", form, { storage }));
    await vi.advanceTimersByTimeAsync(0);
    form.customer = "Walid";
    await nextTick();
    window.dispatchEvent(new Event("pagehide"));
    await vi.advanceTimersByTimeAsync(0);
    expect(data.size).toBe(1);
    scope.stop();

    const broken = effectScope();
    const failing: DraftStorage = {
      get: () => {
        throw new Error("quota");
      },
      set: () => {
        throw new Error("quota");
      },
      remove: () => undefined,
    };
    const other = reactive({ customer: "" });
    const draft = broken.run(() => useFormDraft("order", other, { storage: failing }))!;
    await vi.advanceTimersByTimeAsync(0);
    other.customer = "x";
    await vi.advanceTimersByTimeAsync(400);
    expect(String(draft.error.value)).toContain("quota");
    broken.stop();
  });
});
