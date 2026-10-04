import { MOTION_SCHEMES, animateSpring, type SpringAnimation } from "@cavulsqa/m3e";
import { onScopeDispose, watch, type Ref } from "vue";
import {
  DOUBLE_TAP_SCALE,
  MAX_SCALE,
  clampPan,
  pageTarget,
  panBounds,
  resistPan,
  resistScale,
  shouldClose,
  zoomAround,
  type Point,
  type Size,
} from "../utils/photoZoom.js";
import { createVelocityTracker } from "./useVelocity.js";

export interface PhotoView {
  /** The track's offset from the current page, in px. */
  page: number;
  scale: number;
  pan: Point;
  /** The vertical offset of a swipe-to-close, in px. */
  close: number;
}

export interface PhotoGestureOptions {
  stage: Ref<HTMLElement | null | undefined>;
  enabled: () => boolean;
  index: () => number;
  count: () => number;
  viewport: () => Size;
  /** The current photo's size at scale 1. */
  fit: () => Size;
  gap: number;
  reduced: () => boolean;
  render: (view: PhotoView) => void;
  onPage: (index: number) => void;
  onClose: () => void;
  onTap: () => void;
}

type Mode = "none" | "pending" | "page" | "pan" | "pinch" | "close";

const SLOP = 8;
const DOUBLE_TAP_MS = 260;
const DOUBLE_TAP_DISTANCE = 32;

/**
 * Framework7's photo browser gestures, with Android's feel: swipe between photos, pinch to zoom
 * around the fingers, double-tap to zoom in at the tap and back out, pan a zoomed photo within its
 * edges, and swipe a photo at rest up or down to close. A single tap, once it is clearly not the
 * first half of a double tap, toggles the chrome. Everything moves on springs from where the
 * finger let go.
 */
export function usePhotoGestures(options: PhotoGestureOptions) {
  const view: PhotoView = { page: 0, scale: 1, pan: { x: 0, y: 0 }, close: 0 };
  const pointers = new Map<number, Point>();
  const xs = createVelocityTracker();
  const ys = createVelocityTracker();
  const spatial = MOTION_SCHEMES.expressive.fastSpatial.spring;
  let mode: Mode = "none";
  let start: Point = { x: 0, y: 0 };
  let startView: PhotoView = { ...view, pan: { ...view.pan } };
  let pinchDistance = 1;
  let pinchMid: Point = { x: 0, y: 0 };
  let animation: SpringAnimation | null = null;
  let lastTap: { time: number; point: Point } | null = null;
  let tapTimer: ReturnType<typeof setTimeout> | undefined;

  const draw = () => options.render(view);
  const step = () => options.viewport().width + options.gap;
  const zoomed = () => view.scale > 1.01;

  function relative(point: Point): Point {
    const rect = options.stage.value?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: point.x - rect.left - rect.width / 2, y: point.y - rect.top - rect.height / 2 };
  }

  /** `velocity` in px per second along the move, `distance` the signed px the move covers. */
  function animate(target: Partial<PhotoView>, velocity = 0, distance = 1): Promise<boolean> {
    animation?.stop();
    const from: PhotoView = { ...view, pan: { ...view.pan } };
    const to: PhotoView = {
      page: target.page ?? view.page,
      scale: target.scale ?? view.scale,
      pan: target.pan ?? view.pan,
      close: target.close ?? view.close,
    };
    const mix = (a: number, b: number, t: number) => a + (b - a) * t;
    animation = animateSpring({
      from: 0,
      to: 1,
      spring: spatial,
      velocity: Math.abs(distance) < 1 ? 0 : velocity / distance,
      instant: options.reduced(),
      restDelta: 0.001,
      onFrame(t) {
        view.page = mix(from.page, to.page, t);
        view.scale = mix(from.scale, to.scale, t);
        view.pan = { x: mix(from.pan.x, to.pan.x, t), y: mix(from.pan.y, to.pan.y, t) };
        view.close = mix(from.close, to.close, t);
        draw();
      },
    });
    return animation.finished;
  }

  function reset() {
    animation?.stop();
    view.page = 0;
    view.scale = 1;
    view.pan = { x: 0, y: 0 };
    view.close = 0;
    draw();
  }

  function settleZoom() {
    const scale = Math.min(MAX_SCALE, Math.max(1, view.scale));
    const bounds = panBounds(options.fit(), options.viewport(), scale);
    const anchor =
      view.scale !== scale ? zoomAround(pinchMid, view.pan, view.scale, scale) : view.pan;
    void animate({ scale, pan: scale === 1 ? { x: 0, y: 0 } : clampPan(anchor, bounds) });
  }

  function toggleZoom(point: Point) {
    if (zoomed()) {
      void animate({ scale: 1, pan: { x: 0, y: 0 } });
      return;
    }
    const scale = DOUBLE_TAP_SCALE;
    const bounds = panBounds(options.fit(), options.viewport(), scale);
    void animate({ scale, pan: clampPan(zoomAround(point, view.pan, view.scale, scale), bounds) });
  }

  async function turnPage(target: number, velocity: number) {
    const index = options.index();
    if (target === index) {
      void animate({ page: 0 }, velocity, -view.page);
      return;
    }
    const offset = target > index ? -step() : step();
    if (await animate({ page: offset }, velocity, offset - view.page)) {
      options.onPage(target);
      view.page = 0;
      view.scale = 1;
      view.pan = { x: 0, y: 0 };
      draw();
    }
  }

  function tap(point: Point, raw: Point, time: number) {
    clearTimeout(tapTimer);
    if (
      lastTap &&
      time - lastTap.time < DOUBLE_TAP_MS &&
      Math.hypot(raw.x - lastTap.point.x, raw.y - lastTap.point.y) < DOUBLE_TAP_DISTANCE
    ) {
      lastTap = null;
      toggleZoom(point);
      return;
    }
    lastTap = { time, point: raw };
    tapTimer = setTimeout(() => {
      lastTap = null;
      options.onTap();
    }, DOUBLE_TAP_MS);
  }

  function beginPinch() {
    const [a, b] = [...pointers.values()];
    if (!a || !b) return;
    mode = "pinch";
    pinchDistance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
    pinchMid = relative({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    startView = { ...view, pan: { ...view.pan } };
    if (view.page !== 0 || view.close !== 0) void animate({ page: 0, close: 0 });
  }

  function onPointerDown(event: PointerEvent) {
    if (!options.enabled() || event.button !== 0) return;
    animation?.stop();
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    options.stage.value?.setPointerCapture(event.pointerId);
    if (pointers.size === 2) {
      beginPinch();
      return;
    }
    if (pointers.size > 2) return;
    mode = "pending";
    start = { x: event.clientX, y: event.clientY };
    startView = { ...view, pan: { ...view.pan } };
    xs.reset();
    ys.reset();
    xs.add(event.clientX, event.timeStamp);
    ys.add(event.clientY, event.timeStamp);
  }

  function onPointerMove(event: PointerEvent) {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (mode === "pinch") {
      const [a, b] = [...pointers.values()];
      if (!a || !b) return;
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = relative({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      const scale = resistScale(startView.scale * (distance / pinchDistance));
      const anchored = zoomAround(pinchMid, startView.pan, startView.scale, scale);
      view.scale = scale;
      view.pan = { x: anchored.x + mid.x - pinchMid.x, y: anchored.y + mid.y - pinchMid.y };
      draw();
      return;
    }
    xs.add(event.clientX, event.timeStamp);
    ys.add(event.clientY, event.timeStamp);
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (mode === "pending") {
      if (Math.hypot(dx, dy) < SLOP) return;
      if (zoomed()) mode = "pan";
      else mode = Math.abs(dx) > Math.abs(dy) ? "page" : "close";
    }
    if (mode === "pan") {
      const bounds = panBounds(options.fit(), options.viewport(), view.scale);
      view.pan = resistPan({ x: startView.pan.x + dx, y: startView.pan.y + dy }, bounds);
    } else if (mode === "page") {
      const index = options.index();
      const atEdge = (dx > 0 && index === 0) || (dx < 0 && index === options.count() - 1);
      view.page = atEdge ? dx / 3 : dx;
    } else if (mode === "close") {
      view.close = dy;
    }
    draw();
  }

  function onPointerEnd(event: PointerEvent) {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (mode === "pinch") {
      if (pointers.size === 1) {
        const [rest] = [...pointers.values()];
        mode = "pan";
        start = rest!;
        startView = { ...view, pan: { ...view.pan } };
        return;
      }
      if (pointers.size === 0) {
        mode = "none";
        settleZoom();
      }
      return;
    }
    if (pointers.size > 0) return;
    const ended = mode;
    mode = "none";
    const vx = xs.velocity();
    const vy = ys.velocity();
    const raw = { x: event.clientX, y: event.clientY };
    if (ended === "pending" && event.type === "pointerup") tap(relative(raw), raw, event.timeStamp);
    else if (ended === "page") {
      const target = pageTarget(options.index(), options.count(), view.page, vx, step());
      void turnPage(target, vx);
    } else if (ended === "pan") {
      const bounds = panBounds(options.fit(), options.viewport(), view.scale);
      void animate({ pan: clampPan(view.pan, bounds) });
    } else if (ended === "close") {
      if (shouldClose(view.close, vy)) options.onClose();
      else void animate({ close: 0 }, vy, -view.close);
    }
  }

  function onKeydown(event: KeyboardEvent) {
    if (!options.enabled()) return;
    const rtl = options.stage.value
      ? getComputedStyle(options.stage.value).direction === "rtl"
      : false;
    const next = rtl ? "ArrowLeft" : "ArrowRight";
    const previous = rtl ? "ArrowRight" : "ArrowLeft";
    if (event.key !== next && event.key !== previous) return;
    event.preventDefault();
    const index = options.index();
    const target = Math.min(
      options.count() - 1,
      Math.max(0, index + (event.key === next ? 1 : -1)),
    );
    if (target !== index) void turnPage(target, 0);
  }

  const detach = (stage: HTMLElement) => {
    stage.removeEventListener("pointerdown", onPointerDown);
    stage.removeEventListener("pointermove", onPointerMove);
    stage.removeEventListener("pointerup", onPointerEnd);
    stage.removeEventListener("pointercancel", onPointerEnd);
    stage.removeEventListener("keydown", onKeydown);
  };

  watch(
    options.stage,
    (stage, previous) => {
      if (previous) detach(previous);
      if (!stage) return;
      stage.addEventListener("pointerdown", onPointerDown);
      stage.addEventListener("pointermove", onPointerMove);
      stage.addEventListener("pointerup", onPointerEnd);
      stage.addEventListener("pointercancel", onPointerEnd);
      stage.addEventListener("keydown", onKeydown);
    },
    { flush: "post", immediate: true },
  );

  onScopeDispose(() => {
    clearTimeout(tapTimer);
    animation?.stop();
    if (options.stage.value) detach(options.stage.value);
  });

  return { view, reset, animate, turnPage };
}
