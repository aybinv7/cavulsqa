<script setup lang="ts">
import M3Glyph from "../icon/M3Glyph.vue";
import { computed } from "vue";
import { toDate, type MessageInvite, type RsvpAnswer } from "../../utils/messages.js";

/**
 * An event to answer: a date tile, the title, when and where, then going / maybe / can't with how
 * many chose each. The owner's answer is filled; answering it again takes it back (`applyRsvp`).
 */
const props = defineProps<{
  invite: MessageInvite;
  locale?: string;
  answerLabels: Readonly<Record<RsvpAnswer, string>>;
}>();
const emit = defineEmits<{ rsvp: [answer: RsvpAnswer] }>();

const ANSWERS: readonly RsvpAnswer[] = ["going", "maybe", "no"];

const start = computed(() => toDate(props.invite.start));
const day = computed(() =>
  new Intl.DateTimeFormat(props.locale, { day: "numeric" }).format(start.value),
);
const month = computed(() =>
  new Intl.DateTimeFormat(props.locale, { month: "short" }).format(start.value),
);
const when = computed(() =>
  new Intl.DateTimeFormat(props.locale, {
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(start.value),
);
</script>

<template>
  <div class="m3-chat-invite" role="group" :aria-label="props.invite.title">
    <div class="m3-chat-invite__head">
      <span class="m3-chat-invite__date" aria-hidden="true">
        <span class="m3-chat-invite__month">{{ month }}</span>
        <span class="m3-chat-invite__day">{{ day }}</span>
      </span>
      <span class="m3-chat-invite__text">
        <span class="m3-chat-invite__title"
          ><span dir="auto">{{ props.invite.title }}</span></span
        >
        <span class="m3-chat-invite__when">{{ when }}</span>
        <span v-if="props.invite.place" class="m3-chat-invite__place">
          <M3Glyph name="locationOn" :size="14" /><span dir="auto">{{ props.invite.place }}</span>
        </span>
      </span>
    </div>
    <div class="m3-chat-invite__answers">
      <button
        v-for="answer in ANSWERS"
        :key="answer"
        type="button"
        class="m3-chat-invite__answer m3-focus-ring"
        :class="{ 'm3-chat-invite__answer--mine': props.invite.mine === answer }"
        :aria-pressed="props.invite.mine === answer"
        @click.stop="emit('rsvp', answer)"
      >
        <span>{{ props.answerLabels[answer] }}</span>
        <span class="m3-chat-invite__count">{{ props.invite.answers[answer] }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.m3-chat-invite {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
}

.m3-chat-invite__head {
  display: flex;
  gap: 12px;
}

.m3-chat-invite__date {
  display: flex;
  width: 52px;
  height: 56px;
  flex: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: var(--md-sys-shape-corner-medium);
  background: var(--md-sys-color-tertiary-container);
  color: var(--md-sys-color-on-tertiary-container);
}

.m3-chat-invite__month {
  font: var(--md-sys-typescale-label-small-weight) var(--md-sys-typescale-label-small-size) /
    var(--md-sys-typescale-label-small-line-height) var(--md-sys-typescale-label-small-font);
}

.m3-chat-invite__day {
  font: var(--md-sys-typescale-title-large-weight) var(--md-sys-typescale-title-large-size) / 1
    var(--md-sys-typescale-title-large-font);
  font-variant-numeric: tabular-nums;
}

.m3-chat-invite__text {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.m3-chat-invite__title {
  font: var(--md-sys-typescale-title-small-weight) var(--md-sys-typescale-title-small-size) /
    var(--md-sys-typescale-title-small-line-height) var(--md-sys-typescale-title-small-font);
}

.m3-chat-invite__when,
.m3-chat-invite__place {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  opacity: 0.85;
  font: var(--md-sys-typescale-body-small-weight) var(--md-sys-typescale-body-small-size) /
    var(--md-sys-typescale-body-small-line-height) var(--md-sys-typescale-body-small-font);
}

.m3-chat-invite__answers {
  display: flex;
  gap: 2px;
}

.m3-chat-invite__answer {
  display: inline-flex;
  min-width: 0;
  min-height: 40px;
  flex: 1 1 0;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 8px;
  border: 0;
  background: color-mix(in srgb, currentColor 10%, transparent);
  color: inherit;
  cursor: pointer;
  font: var(--md-sys-typescale-label-large-weight) var(--md-sys-typescale-label-large-size) /
    var(--md-sys-typescale-label-large-line-height) var(--md-sys-typescale-label-large-font);
  transition:
    background-color var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects),
    border-radius var(--md-sys-motion-spring-fast-spatial-duration)
      var(--md-sys-motion-spring-fast-spatial);
}

.m3-chat-invite__answer:first-child {
  border-start-start-radius: var(--md-sys-shape-corner-full);
  border-end-start-radius: var(--md-sys-shape-corner-full);
}

.m3-chat-invite__answer:last-child {
  border-start-end-radius: var(--md-sys-shape-corner-full);
  border-end-end-radius: var(--md-sys-shape-corner-full);
}

.m3-chat-invite__answer--mine {
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-tertiary);
  color: var(--md-sys-color-on-tertiary);
}

.m3-chat-invite__count {
  font-variant-numeric: tabular-nums;
  opacity: 0.8;
}
</style>
