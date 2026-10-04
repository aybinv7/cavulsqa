<script setup lang="ts">
/**
 * The chart's numbers as a table only screen readers see - the chart's picture is decoration to
 * them, and a table can be navigated cell by cell.
 */
const props = defineProps<{
  caption: string;
  columns: readonly string[];
  rows: readonly { label: string; cells: readonly string[] }[];
}>();
</script>

<template>
  <table class="m3-visually-hidden">
    <caption>
      {{
        props.caption
      }}
    </caption>
    <thead>
      <tr>
        <td />
        <th v-for="column in props.columns" :key="column" scope="col">{{ column }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in props.rows" :key="row.label">
        <th scope="row">{{ row.label }}</th>
        <td v-for="(cell, index) in row.cells" :key="index">{{ cell }}</td>
      </tr>
    </tbody>
  </table>
</template>
