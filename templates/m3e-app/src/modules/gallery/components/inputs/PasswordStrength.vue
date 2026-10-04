<template>
  <div class="flex items-center gap-3" :class="TONE[score]">
    <div class="flex flex-1 gap-1" aria-hidden="true">
      <span
        v-for="step in 4"
        :key="step"
        class="password-strength__step h-1.5 flex-1 rounded-full"
        :class="{ 'password-strength__step--on': step <= score }"
      />
    </div>
    <span class="type-label-medium min-w-14 text-end" role="status">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ score: 0 | 1 | 2 | 3 | 4; label: string }>();

const TONE = [
  "text-on-surface-variant",
  "text-error",
  "text-tertiary",
  "text-primary",
  "text-primary",
] as const;
</script>

<style scoped>
.password-strength__step {
  background: var(--md-sys-color-surface-container-highest);
  transition: background-color var(--md-sys-motion-spring-default-effects-duration)
    var(--md-sys-motion-spring-default-effects);
}

.password-strength__step--on {
  background: currentColor;
}
</style>
