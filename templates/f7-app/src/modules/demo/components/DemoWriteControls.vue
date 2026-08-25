<template>
  <f7-block-title>{{ t("demo.writes") }}</f7-block-title>
  <f7-block strong inset class="rounded-2xl!">
    <p class="mt-0 text-sm opacity-70">{{ t("demo.writesHint") }}</p>
    <f7-segmented strong>
      <f7-button :disabled="writing" @click="$emit('addOne')">{{ t("demo.addOne") }}</f7-button>
      <f7-button :disabled="writing" @click="$emit('addMany')">{{ t("demo.addMany") }}</f7-button>
      <f7-button :disabled="writing" color="red" @click="$emit('clear')">
        {{ t("demo.clear") }}
      </f7-button>
    </f7-segmented>
  </f7-block>
</template>

<script setup lang="ts">
defineProps<{ writing: boolean }>();
defineEmits<{ addOne: []; addMany: []; clear: [] }>();

const { t } = useI18n();
</script>
