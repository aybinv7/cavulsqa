<template>
  <M3BottomSheet v-model:open="open" :title="t('gallery.chat.poll.title')">
    <div class="flex flex-col gap-3 px-4 pb-2">
      <M3TextField
        v-model="question"
        :label="t('gallery.chat.poll.question')"
        :maxlength="QUESTION_MAX"
        autocomplete="off"
      />
      <TransitionGroup tag="div" name="poll-option" class="relative flex flex-col gap-3">
        <div v-for="(option, index) in options" :key="option.key" class="flex items-center gap-1">
          <div class="min-w-0 flex-1">
            <M3TextField
              v-model="option.label"
              :label="t('gallery.chat.poll.option', { number: index + 1 })"
              :error="repeated.has(index) ? t('gallery.chat.poll.repeated') : undefined"
              autocomplete="off"
            />
          </div>
          <M3IconButton
            v-if="options.length > MIN_OPTIONS"
            :label="t('gallery.chat.poll.remove', { number: index + 1 })"
            @click="remove(index)"
          >
            <i-ms-close-rounded />
          </M3IconButton>
        </div>
      </TransitionGroup>
      <M3Button v-if="options.length < MAX_OPTIONS" variant="text" class="self-start" @click="add">
        <template #icon><i-ms-add-rounded /></template>
        {{ t("gallery.chat.poll.add") }}
      </M3Button>
      <div class="flex items-center gap-4 py-2">
        <div class="flex min-w-0 flex-1 flex-col">
          <span class="type-body-large text-on-surface">{{ t("gallery.chat.poll.multiple") }}</span>
          <span class="type-body-medium text-on-surface-variant">
            {{ t("gallery.chat.poll.multipleHint") }}
          </span>
        </div>
        <M3Switch v-model="multiple" :label="t('gallery.chat.poll.multiple')" />
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <M3Button size="m" :disabled="!ready" @click="submit">
          <template #icon><i-ms-send-rounded class="rtl:-scale-x-100" /></template>
          {{ t("gallery.chat.send") }}
        </M3Button>
      </div>
    </template>
  </M3BottomSheet>
</template>

<script setup lang="ts">
import type { MessagePoll } from "@cavulsqa/m3e-vue";

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;
const QUESTION_MAX = 140;

const open = defineModel<boolean>("open", { default: false });
const emit = defineEmits<{ send: [poll: MessagePoll] }>();
const { t } = useI18n();

let keys = 0;
const blankOption = () => ({ key: (keys += 1), label: "" });

const question = ref("");
const options = ref([blankOption(), blankOption()]);
const multiple = ref(false);

const normalised = computed(() =>
  options.value.map((option) => option.label.trim().toLocaleLowerCase()),
);

/** Indexes of answers that repeat an earlier one: two identical answers split one opinion in two. */
const repeated = computed(() => {
  const seen = new Set<string>();
  const indexes = new Set<number>();
  normalised.value.forEach((label, index) => {
    if (!label) return;
    if (seen.has(label)) indexes.add(index);
    seen.add(label);
  });
  return indexes;
});

const filled = computed(() => options.value.filter((option) => option.label.trim()));
const ready = computed(
  () =>
    Boolean(question.value.trim()) && filled.value.length >= MIN_OPTIONS && !repeated.value.size,
);

function add() {
  if (options.value.length < MAX_OPTIONS) options.value.push(blankOption());
}

function remove(index: number) {
  if (options.value.length > MIN_OPTIONS) options.value.splice(index, 1);
}

function submit() {
  if (!ready.value) return;
  emit("send", {
    question: question.value.trim(),
    multiple: multiple.value,
    options: filled.value.map((option, index) => ({
      id: `o${index + 1}`,
      label: option.label.trim(),
      votes: 0,
    })),
  });
  question.value = "";
  options.value = [blankOption(), blankOption()];
  multiple.value = false;
  open.value = false;
}
</script>

<style scoped>
.poll-option-enter-active,
.poll-option-leave-active {
  transition:
    opacity var(--md-sys-motion-spring-fast-effects-duration)
      var(--md-sys-motion-spring-fast-effects),
    translate var(--md-sys-motion-spring-fast-spatial-duration)
      var(--md-sys-motion-spring-fast-spatial);
}

.poll-option-enter-from,
.poll-option-leave-to {
  opacity: 0;
  translate: 0 -8px;
}

.poll-option-leave-active {
  position: absolute;
  inset-inline: 0;
}

@media (prefers-reduced-motion: reduce) {
  .poll-option-enter-active,
  .poll-option-leave-active {
    transition: none;
  }
}
</style>
