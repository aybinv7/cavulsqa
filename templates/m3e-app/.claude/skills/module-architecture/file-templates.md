# File templates

Copy these shapes. They encode decisions that are easy to get wrong once and then repeat everywhere.

## Route file

`modules/<feature>/router/routes/<feature>.routes.ts`

```ts
import type { Router } from "framework7/types";

const featureRoutes: Router.RouteParameters[] = [
  {
    name: "feature",
    path: "/feature/",
    // `async` is Framework7's route hook, not an async function - resolve from the promise.
    async({ resolve }) {
      void import("@/modules/feature/views/FeatureView.vue").then((view) => {
        resolve({ component: view.default });
      });
    },
  },
  {
    name: "feature-detail",
    path: "/feature/:id/",
    async({ resolve }) {
      void import("@/modules/feature/views/FeatureDetailView.vue").then((view) => {
        resolve({ component: view.default });
      });
    },
  },
];

export default featureRoutes;
```

`await` inside that hook does not compile — the property is literally named `async`.

## Repository

`domains/<domain>/<domain>.repository.ts`

```ts
import type { Kysely } from "kysely";
import { nowISO } from "@cavulsqa/mobile-db";
import type { Database } from "@/shared/database/schema";

export interface ThingRow {
  id: number;
  name: string;
  totalCents: number;
}

/** Reads take the database as a parameter - that is what makes them testable. */
export function listThings(db: Kysely<Database>, term: string): Promise<ThingRow[]> {
  let query = db.selectFrom("thing").select(["id", "name", "total_cents as totalCents"]);
  if (term.trim()) query = query.where("name", "like", `%${term.trim()}%`);
  return query.orderBy("id", "desc").limit(40).execute();
}

/** All-or-nothing work goes in one transaction. */
export async function saveThing(
  db: Kysely<Database>,
  input: { name: string; lines: Array<{ productId: number; quantity: number }> },
): Promise<void> {
  await db.transaction().execute(async (trx) => {
    const thing = await trx
      .insertInto("thing")
      .values({ created_at: nowISO(), name: input.name })
      .returning("id")
      .executeTakeFirstOrThrow();

    for (const line of input.lines) {
      await trx
        .insertInto("thing_line")
        .values({ thing_id: thing.id, ...line })
        .execute();
    }
  });
}
```

No `ref`, no lifecycle, no Framework7, no imports from `modules/`.

## Composable

`modules/<feature>/composables/useFeature.ts`

```ts
import { listThings, saveThing, type ThingRow } from "@/domains/thing/thing.repository";
import { getDatabase, rdb } from "@/shared/database/database";
import { useReactiveQuery } from "@/shared/database/queries";

export function useFeature() {
  const term = ref("");
  const busy = ref(false);

  const query = useReactiveQuery(() => listThings(getDatabase().db, term.value), {
    // Every table the SQL touches. A join means each joined table.
    tables: ["thing"],
    // The term is part of the identity, so the query re-runs (debounced) as it moves.
    queryKey: ["feature:things", term],
    debounce: 250,
  });

  const things = computed<ThingRow[]>(() => query.data.value ?? []);

  // Writes go through `rdb`, which announces the tables they touched.
  async function save(input: Parameters<typeof saveThing>[1]) {
    busy.value = true;
    try {
      await saveThing(rdb, input);
    } finally {
      busy.value = false;
    }
  }

  return { term, things, loading: query.loading, busy, save };
}
```

`ref`, `computed` and the composable itself are auto-imported. Repositories are not.

## View

`modules/<feature>/views/FeatureView.vue`

```vue
<template>
  <AppPage :title="t('feature.title')" name="feature">
    <SectionHeader :title="t('feature.section')" />
    <M3List v-if="things.length" variant="segmented" inset>
      <M3ListItem
        v-for="thing in things"
        :key="thing.id"
        clickable
        :headline="thing.name"
        :supporting="formatMoney(thing.totalCents)"
        @click="f7router.navigate(`/feature/${String(thing.id)}/`)"
      >
        <template #leading><i-ms-inventory-2-outline-rounded /></template>
      </M3ListItem>
    </M3List>
    <EmptyState v-else :headline="t('feature.emptyTitle')" :text="t('feature.empty')" />
  </AppPage>
</template>

<script setup lang="ts">
import type { Router } from "framework7/types";
import { useFeature } from "@/modules/feature/composables/useFeature";

defineProps<{ f7router: Router.Router }>();
const { t } = useI18n();
const { things } = useFeature();
</script>
```

Components, icons and composables resolve themselves; colours and type come from tokens. The
`m3-expressive` skill decides which component and which role.

## Pushed detail view

```vue
<AppPage :title="thing?.name ?? t('feature.title')" back>…</AppPage>
```

```ts
const props = defineProps<{ f7route: Router.Route; f7router: Router.Router }>();
const id = Number(props.f7route.params.id ?? 0);
```

`back` gives the small app bar with a back button and hides the navigation bar. A detail screen's
state changes go in an `M3DockedToolbar` in `AppPage`'s `#fixed` slot.

## Test

`tests/<domain>.repository.test.ts` — see the reactive-data skill's testing guide for the harness.
Assert the arithmetic, the empty state and the idempotence, not just that rows come back.
