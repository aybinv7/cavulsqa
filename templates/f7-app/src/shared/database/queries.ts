import { createReactiveQuery, createVueQueryMetrics } from "@cavulsqa/reactive-vue";
import { usePageVisibility } from "@cavulsqa/reactive-vue/framework7";
import { changeBus } from "./database";

const metrics = createVueQueryMetrics({
  exposeOnWindowAs: import.meta.env.DEV ? "__appMetrics" : undefined,
});

/**
 * The composables every screen uses. They are built once, here, because the change bus and the
 * metrics recorder are app-wide singletons - a query created with a different bus would never hear
 * about a write.
 */
export const { useReactiveQuery, useStructuralQuery, useStaticQuery } = createReactiveQuery({
  onTableChange: changeBus.on,
  metrics: metrics.recorder,
  // Without this a tab the user cannot see keeps refetching in the background.
  useVisibility: usePageVisibility,
});

export const { useQueryMetrics } = metrics;
export { uniqueQueryKey } from "@cavulsqa/reactive-vue";
