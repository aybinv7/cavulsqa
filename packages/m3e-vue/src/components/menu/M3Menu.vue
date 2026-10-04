<script setup lang="ts">
import { nextTick, onScopeDispose, provide, shallowRef, useTemplateRef, watch } from "vue";
import { useOverlay } from "../../composables/useOverlay.js";
import { placeSubmenu } from "../../utils/menuPlacement.js";
import { MENU, useParentMenu, type MenuContext, type SubmenuHandle } from "./context.js";

/**
 * The Expressive vertical menu, anchored to an element: it opens below (or above, when there is
 * no room) and springs open from that edge. Items take the arrow keys; Escape, Android back, a tap
 * outside or choosing an item close it. Wrap items in `M3MenuGroup` for the segmented layout.
 *
 * `placement="end"` opens it beside its anchor instead - how an `M3MenuItem` with a `#submenu`
 * cascades. A submenu closes alone on Escape, Android back or the arrow toward its parent; choosing
 * an item in it closes the whole chain.
 *
 * @see https://m3.material.io/components/menus/specs
 */
const props = withDefaults(
  defineProps<{
    anchor: HTMLElement | null | undefined;
    variant?: "standard" | "vibrant";
    align?: "start" | "end";
    label?: string;
    teleport?: string | HTMLElement;
    placement?: "below" | "end";
  }>(),
  { variant: "standard", align: "start", teleport: "body", placement: "below" },
);

const open = defineModel<boolean>("open", { default: false });
const panel = useTemplateRef<HTMLElement>("panel");
const position = shallowRef({ top: 0, left: 0, maxHeight: 0, origin: "top" as "top" | "bottom" });
const MARGIN = 8;
const GAP = 4;
const SUBMENU_GAP = 2;

const parent = useParentMenu();
const children = new Set<SubmenuHandle>();

const { layer: overlayLayer } = useOverlay({
  open,
  dismissible: true,
  onClose: () => (open.value = false),
});

function contains(node: Node): boolean {
  if (panel.value?.contains(node)) return true;
  for (const child of children) if (child.contains(node)) return true;
  return false;
}

const self: SubmenuHandle = { contains, close: () => (open.value = false) };
const detachFromParent = parent?.attach(self);

const context: MenuContext = {
  closeAll() {
    open.value = false;
    parent?.closeAll();
  },
  variant: () => props.variant,
  contains,
  attach(child) {
    children.add(child);
    return () => children.delete(child);
  },
  opened(child) {
    for (const other of children) if (other !== child) other.close();
  },
};

provide(MENU, context);

const items = () => [
  ...(panel.value?.querySelectorAll<HTMLElement>("[role^=menuitem]:not([disabled])") ?? []),
];

function place() {
  const anchor = props.anchor;
  const menu = panel.value;
  if (!anchor || !menu) return;
  const rect = anchor.getBoundingClientRect();
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  if (props.placement === "end") {
    const surface = anchor.closest(".m3-menu-group, .m3-menu")?.getBoundingClientRect() ?? rect;
    const item = { left: surface.left, top: rect.top, right: surface.right, bottom: rect.bottom };
    const rtl = getComputedStyle(anchor).direction === "rtl";
    const size = {
      width: menu.offsetWidth,
      height: Math.min(menu.scrollHeight, viewport.height - 16),
    };
    const spot = placeSubmenu(item, size, viewport, rtl, SUBMENU_GAP);
    position.value = { ...spot, maxHeight: viewport.height - 16, origin: "top" };
    return;
  }
  const below = viewport.height - rect.bottom - GAP - MARGIN;
  const above = rect.top - GAP - MARGIN;
  const height = menu.scrollHeight;
  const downward = below >= Math.min(height, 240) || below >= above;
  const width = menu.offsetWidth;
  const rtl = getComputedStyle(anchor).direction === "rtl";
  const alignEnd = (props.align === "end") !== rtl;
  const rawLeft = alignEnd ? rect.right - width : rect.left;
  position.value = {
    top: downward ? rect.bottom + GAP : Math.max(MARGIN, rect.top - GAP - Math.min(height, above)),
    left: Math.min(viewport.width - width - MARGIN, Math.max(MARGIN, rawLeft)),
    maxHeight: Math.max(120, downward ? below : above),
    origin: downward ? "top" : "bottom",
  };
}

function onPointerDown(event: PointerEvent) {
  const target = event.target as Node;
  if (contains(target) || props.anchor?.contains(target)) return;
  if (parent?.contains(target)) return;
  open.value = false;
}

function onKeydown(event: KeyboardEvent) {
  const list = items();
  if (list.length === 0) return;
  const index = list.indexOf(document.activeElement as HTMLElement);
  const moves: Record<string, number> = {
    ArrowDown: index + 1,
    ArrowUp: index - 1,
    Home: 0,
    End: list.length - 1,
  };
  if (event.key === "Tab") {
    context.closeAll();
    return;
  }
  const rtl = getComputedStyle(event.currentTarget as Element).direction === "rtl";
  if (parent && event.key === (rtl ? "ArrowRight" : "ArrowLeft")) {
    event.preventDefault();
    open.value = false;
    return;
  }
  if (!(event.key in moves)) return;
  event.preventDefault();
  list[(moves[event.key]! + list.length) % list.length]!.focus();
}

const detach = () => {
  document.removeEventListener("pointerdown", onPointerDown, true);
  window.removeEventListener("resize", place);
};

watch(open, async (value) => {
  if (!value) {
    detach();
    for (const child of children) child.close();
    if (props.anchor?.isConnected && panel.value?.contains(document.activeElement))
      props.anchor.focus();
    return;
  }
  parent?.opened(self);
  await nextTick();
  place();
  items()[0]?.focus({ preventScroll: true });
  document.addEventListener("pointerdown", onPointerDown, true);
  window.addEventListener("resize", place);
});

onScopeDispose(() => {
  detach();
  detachFromParent?.();
});
</script>

<template>
  <Teleport :to="props.teleport">
    <Transition name="m3-menu">
      <div
        v-if="open"
        ref="panel"
        class="m3-menu"
        :class="[`m3-menu--${props.variant}`, `m3-menu--from-${position.origin}`]"
        role="menu"
        :aria-label="props.label"
        :style="[
          overlayLayer,
          {
            top: `${position.top}px`,
            left: `${position.left}px`,
            maxHeight: `${position.maxHeight}px`,
          },
        ]"
        @keydown="onKeydown"
      >
        <slot />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.m3-menu {
  position: fixed;
  z-index: calc(var(--m3-overlay-z, 12000) + 5);
  display: flex;
  flex-direction: column;
  gap: 2px;
  box-sizing: border-box;
  min-width: 112px;
  max-width: 280px;
  padding: 4px;
  overflow-y: auto;
  overscroll-behavior: contain;
  border-radius: 16px;
  box-shadow: var(--md-sys-elevation-level2);
  transform-origin: 50% 0;
}

.m3-menu--from-bottom {
  transform-origin: 50% 100%;
}

.m3-menu--standard {
  background: var(--md-sys-color-surface-container-low);
  color: var(--md-sys-color-on-surface);
}

.m3-menu--vibrant {
  background: var(--md-sys-color-tertiary-container);
  color: var(--md-sys-color-on-tertiary-container);
}

.m3-menu:has(> .m3-menu-group) {
  padding: 0;
  overflow: visible;
  background: transparent;
  box-shadow: none;
}

.m3-menu-enter-active {
  transition:
    transform var(--md-sys-motion-spring-fast-spatial-duration)
      var(--md-sys-motion-spring-fast-spatial),
    opacity var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects);
}

.m3-menu-leave-active {
  transition:
    transform var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-emphasized-accelerate),
    opacity var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-emphasized-accelerate);
}

.m3-menu-enter-from,
.m3-menu-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

@media (prefers-reduced-motion: reduce) {
  .m3-menu-enter-from,
  .m3-menu-leave-to {
    transform: none;
  }
}
</style>
