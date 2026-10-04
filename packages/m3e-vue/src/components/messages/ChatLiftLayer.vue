<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, shallowRef, useTemplateRef, watch } from "vue";
import type { MessageAction } from "./types.js";
import { useHaptics } from "../../composables/services.js";
import { useFocusTrap } from "../../composables/useFocusTrap.js";
import { useOverlay } from "../../composables/useOverlay.js";
import { liftPlacement } from "../../utils/messageLift.js";
import { ownReaction, type ChatMessage } from "../../utils/messages.js";

const EDGE = 12;
const GAP = 8;

/**
 * What a long-pressed message opens, as in Google Messages and WhatsApp: the screen dims, the bubble
 * lifts out of it, a pill of reactions springs from its top edge and the message's actions sit
 * under it. The bubble moves only as far as it must for all three to fit. Choosing the reaction
 * already there takes it off.
 *
 * A bubble cannot rise above a layer on `<body>` from inside its page, so a copy is drawn in the
 * layer where the bubble is, with the colours and corners it had in place.
 */
const props = defineProps<{
  reactions: readonly string[];
  actions: readonly MessageAction[];
  reactLabel: string;
  menuLabel: string;
}>();

const emit = defineEmits<{
  react: [message: ChatMessage, emoji: string | null];
  action: [message: ChatMessage, id: string];
}>();

const open = shallowRef(false);
const placed = shallowRef(false);
const message = shallowRef<ChatMessage | null>(null);
const placement = shallowRef({
  ghost: {} as Record<string, string>,
  pill: {} as Record<string, string>,
  menu: {} as Record<string, string>,
});

const root = useTemplateRef<HTMLElement>("root");
const ghost = useTemplateRef<HTMLElement>("ghost");
const pill = useTemplateRef<HTMLElement>("pill");
const menu = useTemplateRef<HTMLElement>("menu");
const haptics = useHaptics();
let target: HTMLElement | null = null;

const current = computed(() => ownReaction(message.value?.reactions));
const items = computed(() =>
  message.value ? props.actions.filter((action) => action.when?.(message.value!) ?? true) : [],
);

const { layer } = useOverlay({ open, dismissible: () => true, onClose: () => close() });
useFocusTrap(root, open);

function insets(element: HTMLElement) {
  const style = getComputedStyle(element);
  return { top: parseFloat(style.paddingTop) || 0, bottom: parseFloat(style.paddingBottom) || 0 };
}

function copyBubble(bubble: HTMLElement) {
  const style = getComputedStyle(bubble);
  const copy = bubble.cloneNode(true) as HTMLElement;
  copy.removeAttribute("id");
  for (const element of copy.querySelectorAll("[id]")) element.removeAttribute("id");
  Object.assign(copy.style, {
    margin: "0",
    width: "100%",
    height: "100%",
    maxWidth: "none",
    background: style.background,
    color: style.color,
    borderRadius: style.borderRadius,
    outline: style.outline,
    outlineOffset: style.outlineOffset,
  });
  ghost.value?.replaceChildren(copy);
}

function place() {
  const layerElement = root.value;
  if (!target || !layerElement) return;
  const rect = target.getBoundingClientRect();
  const viewport = window.visualViewport?.height ?? window.innerHeight;
  const safe = insets(layerElement);
  const result = liftPlacement(
    { top: rect.top, height: rect.height },
    {
      pill: pill.value?.offsetHeight ?? 0,
      menu: menu.value?.offsetHeight ?? 0,
      gap: GAP,
    },
    { top: safe.top + EDGE, bottom: viewport - safe.bottom - EDGE },
  );
  const rtl = getComputedStyle(target).direction === "rtl";
  const toRight = (message.value?.sent ?? false) !== rtl;
  const side: Record<string, string> = toRight
    ? { right: `${Math.max(EDGE, window.innerWidth - rect.right)}px` }
    : { left: `${Math.max(EDGE, rect.left)}px` };
  placement.value = {
    ghost: {
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${result.height}px`,
      "--m3-chat-lift-shift": `${result.shift}px`,
      transformOrigin: toRight ? "right center" : "left center",
    },
    pill: {
      top: `${result.pillTop}px`,
      ...side,
      transformOrigin: toRight ? "bottom right" : "bottom left",
    },
    menu: {
      top: `${result.menuTop}px`,
      ...side,
      transformOrigin: toRight ? "top right" : "top left",
    },
  };
}

function onResize() {
  if (open.value) place();
}

/** Opens the layer over `bubble`, the pressed message's bubble element. */
async function show(bubble: HTMLElement, chosen: ChatMessage) {
  target = bubble;
  message.value = chosen;
  placed.value = false;
  open.value = true;
  await nextTick();
  copyBubble(bubble);
  place();
  placed.value = true;
  window.addEventListener("resize", onResize);
  window.visualViewport?.addEventListener("resize", onResize);
  await nextTick();
  const first =
    pill.value?.querySelector<HTMLElement>("[aria-checked='true']") ??
    pill.value?.querySelector<HTMLElement>("button") ??
    menu.value?.querySelector<HTMLElement>("button");
  first?.focus({ preventScroll: true });
  if (first && pill.value?.contains(first))
    first.scrollIntoView({ inline: "center", block: "nearest" });
}

function detach() {
  window.removeEventListener("resize", onResize);
  window.visualViewport?.removeEventListener("resize", onResize);
}

function close() {
  if (!open.value) return;
  open.value = false;
  target = null;
  detach();
}

function react(emoji: string) {
  const chosen = message.value;
  close();
  if (!chosen) return;
  haptics.tick();
  emit("react", chosen, emoji === current.value ? null : emoji);
}

function act(id: string) {
  const chosen = message.value;
  close();
  if (chosen) emit("action", chosen, id);
}

watch(open, (value) => {
  if (!value) ghost.value?.replaceChildren();
});

onBeforeUnmount(detach);

defineExpose({ open: show, close });
</script>

<template>
  <Teleport to="body">
    <Transition name="m3-chat-lift">
      <div
        v-if="open"
        ref="root"
        class="m3-chat-lift"
        :class="{ 'm3-chat-lift--placed': placed }"
        :style="layer"
        role="presentation"
        @click.self="close"
        @contextmenu.prevent
      >
        <div
          ref="ghost"
          class="m3-chat-lift__ghost"
          :style="placement.ghost"
          aria-hidden="true"
          @click="close"
        />
        <div
          v-if="props.reactions.length"
          ref="pill"
          class="m3-chat-lift__pill"
          role="menu"
          :aria-label="props.reactLabel"
          :style="placement.pill"
        >
          <button
            v-for="(emoji, index) in props.reactions"
            :key="emoji"
            type="button"
            role="menuitemradio"
            class="m3-chat-lift__emoji m3-focus-ring"
            :class="{ 'm3-chat-lift__emoji--chosen': emoji === current }"
            :style="{ '--m3-chat-lift-index': index }"
            :aria-checked="emoji === current"
            :aria-label="emoji"
            @click="react(emoji)"
          >
            {{ emoji }}
          </button>
        </div>
        <div
          v-if="items.length"
          ref="menu"
          class="m3-chat-lift__menu"
          role="menu"
          :aria-label="props.menuLabel"
          :style="placement.menu"
        >
          <button
            v-for="action in items"
            :key="action.id"
            type="button"
            role="menuitem"
            class="m3-chat-lift__item m3-state m3-focus-ring"
            :class="{ 'm3-chat-lift__item--destructive': action.tone === 'destructive' }"
            @click="act(action.id)"
          >
            <component :is="action.icon" v-if="action.icon" class="m3-chat-lift__icon" />
            <span>{{ action.label }}</span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.m3-chat-lift {
  position: fixed;
  inset: 0;
  z-index: var(--m3-overlay-z, 12000);
  padding: env(safe-area-inset-top) 0 env(safe-area-inset-bottom);
  background: color-mix(in srgb, var(--md-sys-color-surface) 62%, transparent);
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  visibility: hidden;
  -webkit-tap-highlight-color: transparent;
}

.m3-chat-lift--placed {
  visibility: visible;
}

.m3-chat-lift__ghost {
  position: fixed;
  overflow: hidden;
  filter: drop-shadow(0 10px 24px color-mix(in srgb, var(--md-sys-color-shadow) 24%, transparent));
  animation: m3-chat-lift-up var(--md-sys-motion-spring-default-spatial-duration)
    var(--md-sys-motion-spring-default-spatial) both;
}

.m3-chat-lift__pill {
  position: fixed;
  display: flex;
  max-width: calc(100vw - 24px);
  gap: 2px;
  padding: 6px;
  box-sizing: border-box;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-surface-container-high);
  box-shadow: var(--md-sys-elevation-level3, 0 4px 12px rgb(0 0 0 / 0.2));
  animation: m3-chat-lift-pop 340ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.m3-chat-lift__emoji {
  display: grid;
  flex: none;
  width: 42px;
  height: 42px;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: none;
  font-size: 26px;
  line-height: 1;
  cursor: pointer;
  transition:
    transform var(--md-sys-motion-spring-fast-spatial-duration)
      var(--md-sys-motion-spring-fast-spatial),
    background-color var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects);
  animation: m3-chat-lift-emoji 400ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
  animation-delay: calc(var(--m3-chat-lift-index) * 24ms);
}

.m3-chat-lift__emoji:active {
  transform: scale(1.25);
}

.m3-chat-lift__emoji--chosen {
  background: var(--md-sys-color-tertiary-container);
}

.m3-chat-lift__menu {
  position: fixed;
  display: flex;
  min-width: 196px;
  flex-direction: column;
  padding: 8px 0;
  overflow: hidden;
  border-radius: var(--md-sys-shape-corner-large);
  background: var(--md-sys-color-surface-container);
  box-shadow: var(--md-sys-elevation-level2, 0 2px 6px rgb(0 0 0 / 0.2));
  animation: m3-chat-lift-menu var(--md-sys-motion-spring-default-spatial-duration)
    var(--md-sys-motion-spring-default-spatial) both;
}

.m3-chat-lift__item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  height: 48px;
  padding: 0 16px;
  border: 0;
  background: none;
  color: var(--md-sys-color-on-surface);
  text-align: start;
  font: var(--md-sys-typescale-label-large-weight) var(--md-sys-typescale-label-large-size) /
    var(--md-sys-typescale-label-large-line-height) var(--md-sys-typescale-label-large-font);
  cursor: pointer;
}

.m3-chat-lift__item--destructive {
  color: var(--md-sys-color-error);
}

.m3-chat-lift__icon {
  width: 24px;
  height: 24px;
  flex: none;
  color: var(--md-sys-color-on-surface-variant);
}

.m3-chat-lift__item--destructive .m3-chat-lift__icon {
  color: inherit;
}

.m3-chat-lift-enter-active {
  transition: opacity 200ms var(--md-sys-motion-easing-emphasized-decelerate);
}

.m3-chat-lift-leave-active {
  transition: opacity 150ms var(--md-sys-motion-easing-emphasized-accelerate);
}

.m3-chat-lift-enter-from,
.m3-chat-lift-leave-to {
  opacity: 0;
}

@keyframes m3-chat-lift-up {
  to {
    transform: translateY(var(--m3-chat-lift-shift, 0px)) scale(1.03);
  }
}

@keyframes m3-chat-lift-pop {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
}

@keyframes m3-chat-lift-emoji {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.3);
  }
}

@keyframes m3-chat-lift-menu {
  from {
    opacity: 0;
    transform: scale(0.85);
  }
}

@media (prefers-reduced-motion: reduce) {
  .m3-chat-lift__pill,
  .m3-chat-lift__emoji,
  .m3-chat-lift__menu {
    animation: none;
  }

  .m3-chat-lift__ghost {
    animation-duration: 1ms;
  }
}
</style>
