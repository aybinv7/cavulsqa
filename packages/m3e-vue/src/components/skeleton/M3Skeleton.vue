<script setup lang="ts">
/**
 * Framework7's skeleton loading in Material colours: placeholders shaped like the content that is
 * on its way, so the layout does not jump when it lands. Wrap `M3SkeletonBlock` and
 * `M3SkeletonText` in it - its own class lays them out - and it announces `label` once to assistive
 * technology; the shapes themselves carry nothing to read.
 *
 * `effect="wave"` sweeps one highlight across the whole group - a single composited layer moving
 * by transform, painted in the colour behind the group (`--m3-skeleton-surface`), so it lightens the
 * shapes and vanishes over the gaps. `pulse` breathes the group's opacity. Reduced motion stills
 * both.
 */
const props = withDefaults(
  defineProps<{
    label?: string;
    effect?: "wave" | "pulse" | "none";
  }>(),
  { label: "Loading", effect: "wave" },
);
</script>

<template>
  <div class="m3-skeleton" :class="`m3-skeleton--${props.effect}`" role="status" aria-busy="true">
    <span class="m3-visually-hidden">{{ props.label }}</span>
    <slot />
  </div>
</template>

<style scoped>
.m3-skeleton {
  position: relative;
  overflow: hidden;
  isolation: isolate;
}

.m3-skeleton--wave::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(
    100deg,
    transparent 20%,
    color-mix(in srgb, var(--m3-skeleton-surface, var(--md-sys-color-surface)) 55%, transparent) 50%,
    transparent 80%
  );
  transform: translate3d(-100%, 0, 0);
  animation: m3-skeleton-wave 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  pointer-events: none;
  will-change: transform;
}

:global([dir="rtl"] .m3-skeleton--wave::after) {
  animation-direction: reverse;
}

.m3-skeleton--pulse {
  animation: m3-skeleton-pulse 1.8s ease-in-out infinite;
}

@keyframes m3-skeleton-wave {
  to {
    transform: translate3d(100%, 0, 0);
  }
}

@keyframes m3-skeleton-pulse {
  50% {
    opacity: 0.45;
  }
}

@media (prefers-reduced-motion: reduce) {
  .m3-skeleton--wave::after {
    content: none;
  }

  .m3-skeleton--pulse {
    animation: none;
  }
}
</style>
