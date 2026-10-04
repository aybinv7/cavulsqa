<template>
  <GalleryBlock :title="t('gallery.inputs.account')" :note="t('gallery.inputs.accountNote')" stack>
    <div class="flex flex-col gap-2">
      <M3TextField
        v-model="password"
        variant="outlined"
        :label="t('gallery.inputs.password')"
        :type="revealed ? 'text' : 'password'"
        autocomplete="new-password"
        autocapitalize="off"
        spellcheck="false"
      >
        <template #leading><i-ms-lock-outline-rounded /></template>
        <template #trailing>
          <M3IconButton
            :label="t(revealed ? 'gallery.inputs.hidePassword' : 'gallery.inputs.showPassword')"
            :aria-pressed="revealed"
            @pointerdown.prevent
            @click="revealed = !revealed"
          >
            <i-ms-visibility-off-outline-rounded v-if="revealed" />
            <i-ms-visibility-outline-rounded v-else />
          </M3IconButton>
        </template>
      </M3TextField>
      <PasswordStrength
        :score="score"
        :label="score ? t(`gallery.inputs.strength.${STRENGTH[score]}`) : ''"
        class="px-1"
      />
    </div>
    <M3TextField
      v-model="phone"
      variant="outlined"
      :label="t('gallery.inputs.phone')"
      prefix="+213"
      inputmode="tel"
      autocomplete="tel-national"
      :supporting="t('gallery.inputs.phoneHint')"
      :error="phoneError"
      @blur="touched = true"
    >
      <template #leading><i-ms-call-outline-rounded /></template>
    </M3TextField>
  </GalleryBlock>
</template>

<script setup lang="ts">
import GalleryBlock from "@/modules/gallery/components/GalleryBlock.vue";
import PasswordStrength from "@/modules/gallery/components/inputs/PasswordStrength.vue";
import {
  formatMobile,
  isMobile,
  mobileDigits,
  passwordScore,
} from "@/modules/gallery/composables/fieldFormats";

const STRENGTH = [null, "weak", "fair", "good", "strong"] as const;

const { t } = useI18n();
const password = ref("");
const revealed = ref(false);
const digits = ref("");
const touched = ref(false);

const score = computed(() => (password.value ? passwordScore(password.value) : 0));
const phone = computed({
  get: () => formatMobile(digits.value),
  set: (raw: string) => {
    digits.value = mobileDigits(raw);
  },
});
const phoneError = computed(() => {
  const complete = digits.value.length === 9;
  if (complete && !isMobile(digits.value)) return t("gallery.inputs.phoneInvalid");
  if (touched.value && digits.value.length > 0 && !complete) return t("gallery.inputs.phoneShort");
  return undefined;
});
</script>
