<template>
  <AppPage :title="t('studio.title')" variant="medium" back>
    <template #actions>
      <M3IconButton :label="t('studio.reset')" @click="reset">
        <i-ms-restart-alt-rounded />
      </M3IconButton>
    </template>

    <StudioPreview />

    <SectionHeader :title="t('studio.seed')" />
    <SeedSwatches :selected="settings.seed" @select="(seed) => theme.update({ seed })" />

    <div class="flex items-start gap-2 px-4 pt-4">
      <M3TextField
        v-model="hex"
        class="flex-1"
        :label="t('studio.custom')"
        :error="hexError"
        :supporting="t('studio.customHint')"
        autocapitalize="off"
        autocomplete="off"
        spellcheck="false"
      >
        <template #leading>
          <span
            class="block size-6 rounded-full"
            :style="{ background: hexValid ? normalizedHex : 'transparent' }"
          />
        </template>
      </M3TextField>
      <M3IconButton
        variant="tonal"
        size="m"
        class="mt-2"
        :label="t('studio.pick')"
        @click="openPicker"
      >
        <i-ms-tune-rounded />
      </M3IconButton>
    </div>

    <template #fixed>
      <M3BottomSheet v-model:open="pickerOpen" :title="t('studio.pick')">
        <div class="flex flex-col gap-6 px-6 pb-6">
          <M3ColorPicker
            v-model="draftSeed"
            :label="t('studio.pick')"
            :hue-label="t('studio.hue')"
            :chroma-label="t('studio.chroma')"
            :tone-label="t('studio.tone')"
            :hex-label="t('studio.hex')"
            :invalid-text="t('studio.customInvalid')"
          />
          <p class="type-body-small m-0 text-on-surface-variant">{{ t("studio.pickNote") }}</p>
          <div class="flex justify-end gap-2">
            <M3Button variant="text" @click="pickerOpen = false">{{ t("studio.cancel") }}</M3Button>
            <M3Button @click="applyPicked">{{ t("studio.apply") }}</M3Button>
          </div>
        </div>
      </M3BottomSheet>
    </template>

    <SectionHeader :title="t('studio.variant')" />
    <div class="flex flex-wrap gap-2 px-4" role="radiogroup" :aria-label="t('studio.variant')">
      <M3Chip
        v-for="variant in STUDIO_VARIANTS"
        :key="variant"
        kind="filter"
        :label="t(`studio.variants.${variant}`)"
        :selected="settings.variant === variant"
        @update:selected="theme.update({ variant })"
      />
    </div>
    <p class="type-body-small m-0 px-6 pt-2 text-on-surface-variant">
      {{ effectiveSpec(settings.variant) === "2025" ? t("studio.spec2025") : t("studio.spec2021") }}
    </p>

    <div class="mx-4 mt-6">
      <SettingsChoice
        :model-value="settings.contrast"
        :label="t('studio.contrast')"
        :supporting="t('studio.contrastNote')"
        :options="contrastOptions"
        @update:model-value="(contrast) => theme.update({ contrast })"
      >
        <template #icon><i-ms-contrast-rounded /></template>
      </SettingsChoice>
    </div>

    <SectionHeader :title="t('studio.roles')" />
    <RolePalette />
  </AppPage>
</template>

<script setup lang="ts">
import { effectiveSpec, isHexColor } from "@cavulsqa/m3e";
import { STUDIO_VARIANTS } from "@/app/theme.config";
import RolePalette from "@/modules/settings/components/RolePalette.vue";
import SeedSwatches from "@/modules/settings/components/SeedSwatches.vue";
import SettingsChoice from "@/modules/settings/components/SettingsChoice.vue";
import StudioPreview from "@/modules/settings/components/StudioPreview.vue";
import type { ChoiceOption } from "@/modules/settings/types";
import type { ContrastChoice } from "@/shared/utils/theme/themeSettings";

/**
 * The colour studio: one seed, a scheme variant and a contrast level, and Material's 2025 colour
 * system generates every role from them in both modes. Changes apply live and persist.
 *
 * @see https://m3.material.io/styles/color/choosing-a-scheme
 */
const { t } = useI18n();
const theme = useThemeSettings();
const settings = computed(() => theme.settings.value);
const snackbar = useSnackbar();

const hex = ref(settings.value.seed);
const normalizedHex = computed(() => (hex.value.startsWith("#") ? hex.value : `#${hex.value}`));
const hexValid = computed(() => isHexColor(hex.value));
const hexError = computed(() =>
  hex.value.length >= 4 && !hexValid.value ? t("studio.customInvalid") : undefined,
);

watch(normalizedHex, (value) => {
  if (hexValid.value && value.toLowerCase() !== settings.value.seed.toLowerCase()) {
    theme.update({ seed: value });
  }
});

watch(
  () => settings.value.seed,
  (seed) => {
    if (seed.toLowerCase() !== normalizedHex.value.toLowerCase()) hex.value = seed;
  },
);

const contrastOptions = computed<ChoiceOption<ContrastChoice>[]>(() => [
  { value: "standard", label: t("studio.contrastStandard") },
  { value: "medium", label: t("studio.contrastMedium") },
  { value: "high", label: t("studio.contrastHigh") },
]);

const pickerOpen = ref(false);
const draftSeed = ref(settings.value.seed);

function openPicker() {
  draftSeed.value = settings.value.seed;
  pickerOpen.value = true;
}

function applyPicked() {
  hex.value = draftSeed.value;
  pickerOpen.value = false;
}

async function reset() {
  const previous = { ...settings.value };
  theme.reset();
  const result = await snackbar.show({
    message: t("studio.resetDone"),
    action: t("studio.undo"),
    duration: "long",
  });
  if (result === "action") theme.update(previous);
}
</script>
