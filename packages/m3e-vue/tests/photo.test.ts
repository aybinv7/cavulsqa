import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, test } from "vite-plus/test";
import { defineComponent, h, nextTick, ref } from "vue";
import { M3PhotoBrowser, createM3e } from "../src/index.js";
import {
  clampPan,
  fitSize,
  pageTarget,
  panBounds,
  resistScale,
  shouldClose,
  zoomAround,
} from "../src/utils/photoZoom.js";

const viewport = { width: 400, height: 800 };

describe("photo geometry", () => {
  test("a landscape photo fits the width; zoomed, it may pan only as far as its edges", () => {
    const fit = fitSize({ width: 1600, height: 1200 }, viewport);
    expect(fit).toEqual({ width: 400, height: 300 });
    expect(panBounds(fit, viewport, 1)).toEqual({ x: 0, y: 0 });
    expect(panBounds(fit, viewport, 2)).toEqual({ x: 200, y: 0 });
    expect(clampPan({ x: 260, y: 50 }, { x: 200, y: 0 })).toEqual({ x: 200, y: 0 });
  });

  test("zooming keeps the point under the fingers still", () => {
    const point = { x: 100, y: -40 };
    const pan = zoomAround(point, { x: 0, y: 0 }, 1, 2);
    expect(pan).toEqual({ x: -100, y: 40 });
    expect(point.x - (point.x - pan.x) / 2).toBeCloseTo(0);
  });

  test("pinching past the limits gives way slowly", () => {
    expect(resistScale(0.4)).toBeCloseTo(0.8);
    expect(resistScale(7)).toBe(5);
    expect(resistScale(2)).toBe(2);
  });

  test("a page turns past a quarter of the width or on a fling, never past the ends", () => {
    expect(pageTarget(1, 3, -90, 0, 416)).toBe(1);
    expect(pageTarget(1, 3, -110, 0, 416)).toBe(2);
    expect(pageTarget(1, 3, 30, 900, 416)).toBe(0);
    expect(pageTarget(2, 3, -300, -900, 416)).toBe(2);
  });

  test("a vertical swipe closes past 120px or on a fling", () => {
    expect(shouldClose(80, 0)).toBe(false);
    expect(shouldClose(-130, 0)).toBe(true);
    expect(shouldClose(40, 1200)).toBe(true);
  });
});

describe("M3PhotoBrowser", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("opens at the chosen photo, loads only its neighbours, and closes", async () => {
    const open = ref(false);
    const photos = Array.from({ length: 5 }, (_, i) => ({ src: `p${i}.jpg`, alt: `Photo ${i}` }));
    mount(
      defineComponent({
        setup: () => () =>
          h(M3PhotoBrowser, {
            photos,
            label: "Photos",
            open: open.value,
            "onUpdate:open": (value: boolean) => (open.value = value),
            index: 2,
          }),
      }),
      { global: { plugins: [createM3e({ reducedMotion: true })] }, attachTo: document.body },
    );
    open.value = true;
    await nextTick();
    await nextTick();
    const dialog = document.body.querySelector("[role=dialog]")!;
    expect(dialog.getAttribute("aria-label")).toBe("Photos");
    expect(dialog.querySelector(".m3-photo-browser__counter")?.textContent).toBe("3 / 5");
    const sources = [...dialog.querySelectorAll("img")].map((image) => image.getAttribute("src"));
    expect(sources).toEqual(["p1.jpg", "p2.jpg", "p3.jpg"]);
    dialog.querySelector<HTMLButtonElement>(".m3-photo-browser__close")!.click();
    await nextTick();
    expect(open.value).toBe(false);
  });
});
