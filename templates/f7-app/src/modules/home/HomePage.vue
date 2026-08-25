<template>
  <f7-page>
    <f7-navbar :title="t('home.title')" large />

    <f7-block v-if="loading && !notes.length" class="text-align-center">
      <f7-preloader />
    </f7-block>

    <f7-list v-else-if="notes.length" dividers-ios strong-ios outline-ios>
      <f7-list-item v-for="note in notes" :key="note.id" :title="note.title" :after="note.body" />
    </f7-list>

    <f7-block v-else class="text-align-center">{{ t("home.empty") }}</f7-block>

    <f7-block>
      <f7-button fill large @click="addNote">{{ t("home.add") }}</f7-button>
    </f7-block>
  </f7-page>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { rdb, uniqueQueryKey, useReactiveQuery } from "@/shared/database";
import { listNotes, createNote } from "./note.repository";

const { t } = useI18n();

/**
 * The list re-runs itself whenever anything writes to `note` - `createNote` does not tell it to.
 * That is the whole point of routing writes through `rdb`.
 */
const { data, loading } = useReactiveQuery(listNotes, {
  tables: ["note"],
  queryKey: uniqueQueryKey("note:list"),
});

const notes = computed(() => data.value ?? []);

async function addNote() {
  await createNote(rdb, {
    title: `Note ${String(notes.value.length + 1)}`,
    body: t("home.sample"),
  });
}
</script>
