<script setup lang="ts" generic="T">
import M3Glyph from "../icon/M3Glyph.vue";
import M3Menu from "../menu/M3Menu.vue";
import M3MenuGroup from "../menu/M3MenuGroup.vue";
import M3MenuItem from "../menu/M3MenuItem.vue";
import { computed } from "vue";
import type { ColumnMenuLabels, DataColumn, DataSort } from "../../utils/dataTable.js";

const props = defineProps<{
  column: DataColumn<T> | null;
  anchor: HTMLElement | null;
  columns: readonly DataColumn<T>[];
  sort: DataSort | null;
  group: string | null;
  pinned: readonly string[];
  hidden: readonly string[];
  labels: ColumnMenuLabels;
}>();

const open = defineModel<boolean>("open", { default: false });

const emit = defineEmits<{
  sort: [sort: DataSort | null];
  group: [key: string | null];
  pin: [key: string, on: boolean];
  hide: [key: string, on: boolean];
}>();

const key = computed(() => props.column?.key ?? "");
const sorted = computed(() => (props.sort?.key === key.value ? props.sort.direction : null));
const groupable = computed(() => props.column?.groupable ?? !props.column?.numeric);
const isPinned = computed(() => props.pinned.includes(key.value));
const visibleCount = computed(() => props.columns.length - props.hidden.length);
</script>

<template>
  <M3Menu v-model:open="open" :anchor="props.anchor" :label="props.column?.label">
    <M3MenuGroup v-if="props.column?.sortable">
      <M3MenuItem
        checkable
        :selected="sorted === 'ascending'"
        :label="props.labels.sortAscending"
        @select="emit('sort', { key, direction: 'ascending' })"
      >
        <template #icon><M3Glyph name="arrowUp" /></template>
      </M3MenuItem>
      <M3MenuItem
        checkable
        :selected="sorted === 'descending'"
        :label="props.labels.sortDescending"
        @select="emit('sort', { key, direction: 'descending' })"
      >
        <template #icon><M3Glyph name="arrowDown" /></template>
      </M3MenuItem>
      <M3MenuItem v-if="sorted" :label="props.labels.clearSort" @select="emit('sort', null)">
        <template #icon><M3Glyph name="sortOff" /></template>
      </M3MenuItem>
    </M3MenuGroup>
    <M3MenuGroup>
      <M3MenuItem
        v-if="groupable"
        :label="props.group === key ? props.labels.ungroup : props.labels.groupBy"
        @select="emit('group', props.group === key ? null : key)"
      >
        <template #icon><M3Glyph name="groupRows" /></template>
      </M3MenuItem>
      <M3MenuItem
        :label="isPinned ? props.labels.unpin : props.labels.pin"
        @select="emit('pin', key, !isPinned)"
      >
        <template #icon><M3Glyph name="pin" /></template>
      </M3MenuItem>
      <M3MenuItem
        v-if="props.column?.hideable !== false && visibleCount > 1"
        :label="props.labels.hide"
        @select="emit('hide', key, true)"
      >
        <template #icon><M3Glyph name="visibilityOff" /></template>
      </M3MenuItem>
      <M3MenuItem :label="props.labels.columns">
        <template #icon><M3Glyph name="columns" /></template>
        <template #submenu>
          <M3MenuItem
            v-for="entry in props.columns"
            :key="entry.key"
            checkable
            keep-open
            :selected="!props.hidden.includes(entry.key)"
            :disabled="
              entry.hideable === false || (!props.hidden.includes(entry.key) && visibleCount <= 1)
            "
            :label="entry.label"
            @select="emit('hide', entry.key, !props.hidden.includes(entry.key))"
          />
        </template>
      </M3MenuItem>
    </M3MenuGroup>
  </M3Menu>
</template>
