<template>
  <F7BlockTitle>{{ t("demo.writes") }}</F7BlockTitle>
  <F7Block strong inset class="rounded-2xl!">
    <p class="mt-0 text-sm opacity-70">{{ t("demo.writesHint") }}</p>
    <F7Segmented strong>
      <F7Button :disabled="writing" @click="$emit('addOne')">{{ t("demo.addOne") }}</F7Button>
      <F7Button :disabled="writing" @click="$emit('addMany')">{{ t("demo.addMany") }}</F7Button>
      <F7Button :disabled="writing" color="red" @click="$emit('clear')">
        {{ t("demo.clear") }}
      </F7Button>
    </F7Segmented>
  </F7Block>
</template>

<script setup lang="ts">
defineProps<{ writing: boolean }>();
defineEmits<{ addOne: []; addMany: []; clear: [] }>();

const { t } = useI18n();
</script>
