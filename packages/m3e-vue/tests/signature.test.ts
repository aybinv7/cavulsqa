import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { defineComponent, h, nextTick, shallowRef } from "vue";
import { M3SignaturePad, createM3e, type SignatureStroke } from "../src/index.js";
import { strokesToSvg, strokeWidth } from "../src/utils/signature.js";

const SIZE = { width: 300, height: 200 };
const WIDTH = { min: 1, max: 4 };
const point = (x: number, y: number, t: number, pressure = 0.5) => ({ x, y, t, pressure });

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("signature maths", () => {
  test("slow lines are heavier than quick ones, and a pen's pressure wins", () => {
    const slow = strokeWidth(point(0, 0, 0), point(0.01, 0, 100), SIZE, WIDTH);
    const quick = strokeWidth(point(0, 0, 0), point(0.5, 0, 10), SIZE, WIDTH);
    expect(slow).toBeGreaterThan(quick);
    expect(quick).toBeGreaterThanOrEqual(WIDTH.min);
    expect(strokeWidth(point(0, 0, 0), point(0.5, 0, 10, 1), SIZE, WIDTH)).toBe(WIDTH.max);
  });

  test("the width eases toward its target instead of stepping", () => {
    const target = strokeWidth(point(0, 0, 0), point(0.01, 0, 100), SIZE, WIDTH);
    const eased = strokeWidth(point(0, 0, 0), point(0.01, 0, 100), SIZE, WIDTH, 1);
    expect(eased).toBeGreaterThan(1);
    expect(eased).toBeLessThan(target);
  });

  test("exports smoothed paths at the pad's size, and a tap as a dot", () => {
    const svg = strokesToSvg(
      [[point(0, 0, 0), point(0.5, 0.5, 10), point(1, 1, 20)], [point(0.5, 0.1, 30)]],
      SIZE,
      { color: "#123456", width: 2 },
    );
    expect(svg).toContain('viewBox="0 0 300 200"');
    expect(svg).toContain('<path d="M0 0 Q150 100 225 150 L300 200"/>');
    expect(svg).toContain('<circle cx="150" cy="20" r="1" fill="#123456"/>');
    expect(svg).toContain('stroke="#123456"');
  });
});

describe("M3SignaturePad", () => {
  function pad() {
    const strokes = shallowRef<SignatureStroke[]>([]);
    const ctx = new Proxy(
      {},
      { get: (target, key) => (key in target ? target[key as never] : vi.fn()), set: () => true },
    );
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as never);
    vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 300, 200),
    );
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(M3SignaturePad, {
            label: "Customer signature",
            strokes: strokes.value,
            "onUpdate:strokes": (value: SignatureStroke[]) => (strokes.value = value),
          }),
      }),
      { attachTo: document.body, global: { plugins: [createM3e({ reducedMotion: true })] } },
    );
    const canvas = wrapper.get("canvas").element as HTMLCanvasElement;
    canvas.setPointerCapture = vi.fn();
    const fire = (type: string, x: number, y: number, timeStamp = 0) => {
      const event = new PointerEvent(type, {
        clientX: x,
        clientY: y,
        pointerId: 1,
        button: 0,
        bubbles: true,
      });
      Object.defineProperty(event, "timeStamp", { value: timeStamp });
      canvas.dispatchEvent(event);
    };
    return { wrapper, strokes, fire };
  }

  test("a drag becomes one stroke in fractions of the pad, committed once on lift", async () => {
    const { wrapper, strokes, fire } = pad();
    expect(wrapper.text()).toContain("Sign here");
    fire("pointerdown", 30, 100, 0);
    fire("pointermove", 90, 120, 16);
    fire("pointermove", 150, 140, 32);
    expect(strokes.value).toHaveLength(0);
    fire("pointerup", 150, 140, 48);
    await nextTick();
    expect(strokes.value).toHaveLength(1);
    expect(strokes.value[0]!.map((p) => [p.x, p.y])).toEqual([
      [0.1, 0.5],
      [0.3, 0.6],
      [0.5, 0.7],
    ]);
    expect(wrapper.text()).not.toContain("Sign here");
    expect(wrapper.get("canvas").attributes("aria-label")).toBe("Customer signature");
    wrapper.unmount();
  });

  test("undo removes the last stroke, clear removes all, and the SVG follows", async () => {
    const { wrapper, strokes, fire } = pad();
    for (const y of [50, 150]) {
      fire("pointerdown", 30, y);
      fire("pointermove", 200, y, 20);
      fire("pointerup", 200, y, 40);
    }
    await nextTick();
    const exposed = wrapper.findComponent(M3SignaturePad).vm as unknown as {
      undo: () => void;
      clear: () => void;
      toSvg: (color?: string) => string;
      isEmpty: () => boolean;
    };
    expect(strokes.value).toHaveLength(2);
    expect(exposed.toSvg("#000").match(/<path/g)).toHaveLength(2);
    exposed.undo();
    await nextTick();
    expect(strokes.value).toHaveLength(1);
    exposed.clear();
    await nextTick();
    expect(exposed.isEmpty()).toBe(true);
    wrapper.unmount();
  });
});
