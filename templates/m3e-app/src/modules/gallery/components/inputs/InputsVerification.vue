<template>
  <GalleryBlock
    :title="t('gallery.inputs.verification')"
    :note="t('gallery.inputs.verificationNote', { code: DEMO_CODE })"
    stack
  >
    <M3CodeField
      ref="field"
      v-model="code"
      :label="t('gallery.inputs.codeLabel')"
      :error="error"
      :supporting="verified ? t('gallery.inputs.codeVerified') : t('gallery.inputs.codeSent')"
      :success="verified"
      @complete="check"
    />
    <div class="flex flex-wrap items-center gap-2">
      <M3Button v-if="verified" variant="tonal" size="s" @click="reset">
        {{ t("gallery.inputs.codeAgain") }}
      </M3Button>
      <M3Button v-else variant="text" size="s" :disabled="wait > 0" @click="resend">
        <template #icon><i-ms-sms-outline-rounded /></template>
        {{ wait > 0 ? t("gallery.inputs.resendIn", { s: wait }) : t("gallery.inputs.resend") }}
      </M3Button>
    </div>
  </GalleryBlock>
</template>

<script setup lang="ts">
import type { M3CodeField } from "@cavulsqa/m3e-vue";
import GalleryBlock from "@/modules/gallery/components/GalleryBlock.vue";

const DEMO_CODE = "246810";
const RESEND_AFTER = 30;

const { t } = useI18n();
const snackbar = useSnackbar();
const field = useTemplateRef<InstanceType<typeof M3CodeField>>("field");
const code = ref("");
const error = ref<string>();
const verified = ref(false);
const wait = ref(RESEND_AFTER);

const { pause, resume } = useIntervalFn(() => {
  wait.value = Math.max(0, wait.value - 1);
  if (wait.value === 0) pause();
}, 1000);

watch(code, (value) => {
  if (value.length < DEMO_CODE.length) error.value = undefined;
});

function check(value: string) {
  if (value === DEMO_CODE) {
    verified.value = true;
    pause();
    return;
  }
  error.value = t("gallery.inputs.codeWrong");
}

function resend() {
  code.value = "";
  wait.value = RESEND_AFTER;
  resume();
  void snackbar.show(t("gallery.inputs.codeResent"));
  field.value?.focus();
}

function reset() {
  verified.value = false;
  resend();
}
</script>
