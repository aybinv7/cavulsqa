<script setup lang="ts">
import M3Glyph from "../icon/M3Glyph.vue";
import { computed } from "vue";
import { pollVotes, type MessagePoll } from "../../utils/messages.js";

/**
 * A poll in a bubble: the question, then each option as a button whose fill shows its share of the
 * votes. The owner's choice is marked; tapping it again takes it back, and in a single-answer poll
 * tapping another moves it (`applyVote`).
 */
const props = defineProps<{
  poll: MessagePoll;
  hint: string;
  votesLabel: (count: number) => string;
}>();
const emit = defineEmits<{ vote: [optionId: string] }>();

const total = computed(() => pollVotes(props.poll));
const share = (votes: number) => (total.value === 0 ? 0 : Math.round((votes / total.value) * 100));
</script>

<template>
  <div class="m3-chat-poll" role="group" :aria-label="props.poll.question">
    <p class="m3-chat-poll__question">
      <span dir="auto">{{ props.poll.question }}</span>
    </p>
    <p class="m3-chat-poll__hint">{{ props.hint }}</p>
    <button
      v-for="option in props.poll.options"
      :key="option.id"
      type="button"
      class="m3-chat-poll__option m3-focus-ring"
      :class="{ 'm3-chat-poll__option--mine': option.mine }"
      :role="props.poll.multiple ? 'checkbox' : 'radio'"
      :aria-checked="Boolean(option.mine)"
      :aria-label="`${option.label}, ${props.votesLabel(option.votes)}`"
      :style="{ '--m3-chat-poll-share': `${share(option.votes)}%` }"
      @click.stop="emit('vote', option.id)"
    >
      <span class="m3-chat-poll__mark" aria-hidden="true">
        <M3Glyph v-if="option.mine" name="check" :size="16" />
      </span>
      <span class="m3-chat-poll__label"
        ><span dir="auto">{{ option.label }}</span></span
      >
      <span class="m3-chat-poll__share" aria-hidden="true">{{ share(option.votes) }}%</span>
    </button>
    <p class="m3-chat-poll__total">{{ props.votesLabel(total) }}</p>
  </div>
</template>

<style scoped>
.m3-chat-poll {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 12px 10px;
}

.m3-chat-poll__question {
  margin: 0;
  padding: 0 2px;
  font: var(--md-sys-typescale-title-small-weight) var(--md-sys-typescale-title-small-size) /
    var(--md-sys-typescale-title-small-line-height) var(--md-sys-typescale-title-small-font);
}

.m3-chat-poll__hint,
.m3-chat-poll__total {
  margin: 0;
  padding: 0 2px;
  opacity: 0.8;
  font: var(--md-sys-typescale-label-small-weight) var(--md-sys-typescale-label-small-size) /
    var(--md-sys-typescale-label-small-line-height) var(--md-sys-typescale-label-small-font);
}

.m3-chat-poll__option {
  position: relative;
  display: flex;
  width: 100%;
  min-height: 44px;
  align-items: center;
  gap: 10px;
  padding: 0 12px 0 10px;
  overflow: hidden;
  border: 0;
  border-radius: var(--md-sys-shape-corner-medium);
  background: color-mix(in srgb, currentColor 8%, transparent);
  color: inherit;
  text-align: start;
  cursor: pointer;
  isolation: isolate;
}

.m3-chat-poll__option::before {
  content: "";
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  z-index: -1;
  width: var(--m3-chat-poll-share);
  background: color-mix(in srgb, currentColor 14%, transparent);
  transition: width var(--md-sys-motion-spring-default-spatial-duration)
    var(--md-sys-motion-spring-default-spatial);
}

.m3-chat-poll__option--mine::before {
  background: color-mix(in srgb, var(--md-sys-color-tertiary) 30%, transparent);
}

.m3-chat-poll__mark {
  display: grid;
  width: 20px;
  height: 20px;
  flex: none;
  place-items: center;
  border: 2px solid currentColor;
  border-radius: 50%;
  opacity: 0.7;
}

.m3-chat-poll__option--mine .m3-chat-poll__mark {
  border-color: var(--md-sys-color-tertiary);
  background: var(--md-sys-color-tertiary);
  color: var(--md-sys-color-on-tertiary);
  opacity: 1;
}

.m3-chat-poll__label {
  min-width: 0;
  flex: 1;
  overflow-wrap: anywhere;
  font: var(--md-sys-typescale-body-medium-weight) var(--md-sys-typescale-body-medium-size) /
    var(--md-sys-typescale-body-medium-line-height) var(--md-sys-typescale-body-medium-font);
}

.m3-chat-poll__share {
  flex: none;
  font: var(--md-sys-typescale-label-medium-weight) var(--md-sys-typescale-label-medium-size) /
    var(--md-sys-typescale-label-medium-line-height) var(--md-sys-typescale-label-medium-font);
  font-variant-numeric: tabular-nums;
}
</style>
