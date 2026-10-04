import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { defineComponent, h } from "vue";
import { M3NotificationHost, createM3e, useNotification } from "../src/index.js";
import { createNotificationQueue } from "../src/services/notification.js";
import { dismissDirection } from "../src/utils/dismiss.js";

describe("notification queue", () => {
  test("a new notification replaces the one showing", async () => {
    const queue = createNotificationQueue();
    const first = queue.show({ title: "First" });
    const second = queue.show({ title: "Second" });
    await expect(first).resolves.toBe("replaced");
    expect(queue.current.value?.title).toBe("Second");
    queue.settle("opened");
    await expect(second).resolves.toBe("opened");
    expect(queue.current.value).toBeNull();
  });
});

describe("dismiss thresholds", () => {
  const base = { dx: 0, dy: 0, vx: 0, vy: 0, width: 360 };
  test("sideways past a third of the width, or flung sideways", () => {
    expect(dismissDirection({ ...base, dx: 130 })).toBe("right");
    expect(dismissDirection({ ...base, dx: -60, vx: -1200 })).toBe("left");
    expect(dismissDirection({ ...base, dx: 60, vx: -1200 })).toBeNull();
    expect(dismissDirection({ ...base, dx: 60 })).toBeNull();
  });

  test("up after a short push or a flick; down never", () => {
    expect(dismissDirection({ ...base, dy: -30 })).toBe("up");
    expect(dismissDirection({ ...base, dy: -10, vy: -900 })).toBe("up");
    expect(dismissDirection({ ...base, dy: 15 })).toBeNull();
  });
});

describe("M3NotificationHost", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  function mountHost() {
    let service!: ReturnType<typeof useNotification>;
    mount(
      defineComponent({
        setup() {
          service = useNotification();
          return () => h(M3NotificationHost, { closeLabel: "Dismiss" });
        },
      }),
      { global: { plugins: [createM3e({ reducedMotion: true })] }, attachTo: document.body },
    );
    return service;
  }

  const settle = () => vi.advanceTimersByTimeAsync(50);

  test("tapping it opens it", async () => {
    const service = mountHost();
    const result = service.show({ title: "New order", text: "SO-1024 from Oran" });
    await settle();
    const body = document.body.querySelector<HTMLButtonElement>(".m3-notification__body")!;
    expect(body.textContent).toContain("New order");
    body.click();
    await settle();
    await expect(result).resolves.toBe("opened");
    expect(document.body.querySelector(".m3-notification")).toBeNull();
  });

  test("the close button dismisses it, and it times out on its own", async () => {
    const service = mountHost();
    const closed = service.show({ title: "Synced" });
    await settle();
    document.body.querySelector<HTMLButtonElement>(".m3-notification__close")!.click();
    await settle();
    await expect(closed).resolves.toBe("dismissed");

    const timed = service.show({ title: "Backup done", duration: 3000 });
    await settle();
    await vi.advanceTimersByTimeAsync(3100);
    await expect(timed).resolves.toBe("timeout");
  });
});
