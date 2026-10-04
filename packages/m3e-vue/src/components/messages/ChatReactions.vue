<script setup lang="ts">
import M3Shape from "../shape/M3Shape.vue";
import { computed, watch } from "vue";
import { useHaptics } from "../../composables/services.js";
import { reactionTotal, toDate, type MessageReaction } from "../../utils/messages.js";

/** A reaction chosen less than this long ago springs in; reopening a conversation does not replay older ones. */
const FRESH_MS = 4000;
const SHOWN = 3;

/**
 * A message's reactions on small cookies at the bubble's edge, each cut out of the bubble by a ring
 * of the surface behind it, the way Google Messages sets them. Three at most, then the total. A
 * reaction chosen moments ago pops in with a turn and a ring bursting off it, and a haptic tick -
 * a reaction you only see is half a reaction.
 */
const props = defineProps<{ reactions: readonly MessageReaction[]; label: string }>();

const haptics = useHaptics();
const shown = computed(() =>
  [...props.reactions]
    .sort((a, b) => Math.max(1, b.count ?? 1) - Math.max(1, a.count ?? 1))
    .slice(0, SHOWN),
);
const total = computed(() => reactionTotal(props.reactions));

function key(reaction: MessageReaction): string {
  return `${reaction.emoji}|${reaction.at === undefined ? "" : toDate(reaction.at).getTime()}`;
}

function fresh(reaction: MessageReaction): boolean {
  return reaction.at !== undefined && Date.now() - toDate(reaction.at).getTime() < FRESH_MS;
}

watch(
  () => props.reactions.filter(fresh).map(key).join(),
  (now, before) => {
    if (now && now !== before) haptics.tick();
  },
  { immediate: true },
);
</script>

<template>
  <span class="m3-chat-reactions" role="img" :aria-label="props.label">
    <span
      v-for="reaction in shown"
      :key="key(reaction)"
      class="m3-chat-reactions__badge"
      :class="{
        'm3-chat-reactions__badge--mine': reaction.mine,
        'm3-chat-reactions__badge--fresh': fresh(reaction),
      }"
      aria-hidden="true"
    >
      <span class="m3-chat-reactions__ring" />
      <M3Shape shape="cookie9Sided" class="m3-chat-reactions__cutout">
        <M3Shape shape="cookie9Sided" class="m3-chat-reactions__shape">
          <span class="m3-chat-reactions__emoji">{{ reaction.emoji }}</span>
        </M3Shape>
      </M3Shape>
    </span>
    <span v-if="total > 1" class="m3-chat-reactions__count" aria-hidden="true">{{ total }}</span>
  </span>
</template>

<style scoped>
.m3-chat-reactions {
  display: inline-flex;
  align-items: center;
  pointer-events: none;
}

.m3-chat-reactions__badge {
  position: relative;
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
}

.m3-chat-reactions__badge + .m3-chat-reactions__badge {
  margin-inline-start: -9px;
}

.m3-chat-reactions__cutout {
  width: 30px;
  height: 30px;
  background: var(--m3-chat-reaction-cutout, var(--md-sys-color-surface));
}

.m3-chat-reactions__shape {
  width: 25px;
  height: 25px;
  background: var(--md-sys-color-surface-container-highest);
}

.m3-chat-reactions__badge--mine .m3-chat-reactions__shape {
  background: var(--md-sys-color-tertiary-container);
}

.m3-chat-reactions__emoji {
  font-size: 14px;
  line-height: 1;
}

.m3-chat-reactions__ring {
  position: absolute;
  inset: 2px;
  border-radius: 50%;
  box-shadow: 0 0 0 1.5px var(--md-sys-color-tertiary);
  opacity: 0;
}

.m3-chat-reactions__count {
  display: grid;
  min-width: 22px;
  height: 22px;
  margin-inline-start: -2px;
  padding: 0 6px;
  box-sizing: border-box;
  place-items: center;
  border: 2px solid var(--m3-chat-reaction-cutout, var(--md-sys-color-surface));
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-label-small-weight) var(--md-sys-typescale-label-small-size) / 1
    var(--md-sys-typescale-label-small-font);
  font-variant-numeric: tabular-nums;
}

@media (prefers-reduced-motion: no-preference) {
  .m3-chat-reactions__badge--fresh {
    animation: m3-chat-reaction-pop 620ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }

  .m3-chat-reactions__badge--fresh .m3-chat-reactions__shape {
    animation: m3-chat-reaction-turn 900ms var(--md-sys-motion-easing-emphasized-decelerate) both;
  }

  .m3-chat-reactions__badge--fresh .m3-chat-reactions__ring {
    animation: m3-chat-reaction-ring 700ms 120ms ease-out both;
  }
}

@keyframes m3-chat-reaction-pop {
  0% {
    transform: scale(0) rotate(-40deg);
  }
  55% {
    transform: scale(1.3) rotate(10deg);
  }
  78% {
    transform: scale(0.92) rotate(-4deg);
  }
  100% {
    transform: none;
  }
}

@keyframes m3-chat-reaction-turn {
  from {
    transform: rotate(-80deg);
  }
}

@keyframes m3-chat-reaction-ring {
  from {
    opacity: 0.8;
    transform: scale(0.8);
  }
  to {
    opacity: 0;
    transform: scale(1.9);
  }
}
</style>
