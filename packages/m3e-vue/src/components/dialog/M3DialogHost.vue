<script setup lang="ts">
import { shallowRef, watch } from "vue";
import M3Dialog from "./M3Dialog.vue";
import M3Button from "../button/M3Button.vue";
import { useM3eConfig } from "../../services/config.js";
import type { DialogRequest } from "../../services/dialog.js";

/** Renders the requests of `useDialog().confirm(...)`, one at a time. Mount it once, near the app root. */
const { dialog } = useM3eConfig();
const open = shallowRef(false);
const request = shallowRef<DialogRequest | null>(null);
let answered = false;

watch(
  dialog.current,
  (current) => {
    if (current) {
      request.value = current;
      answered = false;
      open.value = true;
    }
  },
  { immediate: true },
);

watch(open, (value) => {
  if (!value && !answered && request.value) answer(false);
});

function answer(confirmed: boolean) {
  answered = true;
  open.value = false;
  dialog.settle(confirmed);
}
</script>

<template>
  <M3Dialog
    v-model:open="open"
    :headline="request?.headline"
    :dismissible="request?.dismissible ?? true"
    :role="request?.destructive ? 'alertdialog' : 'dialog'"
  >
    <template v-if="request?.icon" #icon><component :is="request.icon" /></template>
    <p v-if="request?.text" class="m3-dialog-host__text">{{ request.text }}</p>
    <template #actions>
      <M3Button v-if="request?.dismissLabel" variant="text" @click="answer(false)">{{
        request.dismissLabel
      }}</M3Button>
      <M3Button
        variant="text"
        :class="{ 'm3-dialog-host__destructive': request?.destructive }"
        @click="answer(true)"
      >
        {{ request?.confirmLabel }}
      </M3Button>
    </template>
  </M3Dialog>
</template>

<style scoped>
.m3-dialog-host__text {
  margin: 0;
}

.m3-dialog-host__destructive {
  color: var(--md-sys-color-error);
}
</style>
