<template>
  <div class="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-2 px-4">
    <div
      v-for="role in ROLES"
      :key="role.name"
      class="flex min-h-18 flex-col justify-between rounded-md p-3"
      :style="{
        background: `var(--md-sys-color-${role.name})`,
        color: `var(--md-sys-color-${role.on})`,
      }"
    >
      <span class="type-label-large">{{ role.name }}</span>
      <span class="type-label-small opacity-80">{{ role.on }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * The generated roles in pairs - each container with the content colour that must stay legible on
 * it. A pair that reads poorly here reads poorly everywhere; raise the contrast level, not the
 * individual colour.
 */
const ROLES = [
  { name: "primary", on: "on-primary" },
  { name: "primary-container", on: "on-primary-container" },
  { name: "secondary", on: "on-secondary" },
  { name: "secondary-container", on: "on-secondary-container" },
  { name: "tertiary", on: "on-tertiary" },
  { name: "tertiary-container", on: "on-tertiary-container" },
  { name: "error-container", on: "on-error-container" },
  { name: "success-container", on: "on-success-container" },
  { name: "surface-container-low", on: "on-surface" },
  { name: "surface-container-highest", on: "on-surface-variant" },
  { name: "inverse-surface", on: "inverse-on-surface" },
  { name: "primary-fixed", on: "on-primary-fixed" },
] as const;
</script>
