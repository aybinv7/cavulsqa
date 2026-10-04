import { mount } from "@vue/test-utils";
import { describe, expect, test } from "vite-plus/test";
import { defineComponent, h, nextTick, ref } from "vue";
import { M3DataTable, createM3e } from "../src/index.js";
import { nextSort, sortRows, type DataColumn, type DataSort } from "../src/utils/dataTable.js";

interface Order {
  ref: string;
  customer: string;
  total: number | null;
}

const ORDERS: Order[] = [
  { ref: "SO-10", customer: "Oran Market", total: 4800 },
  { ref: "SO-9", customer: "épicerie Saïd", total: null },
  { ref: "SO-11", customer: "Blida Gros", total: 12000 },
  { ref: "SO-2", customer: "Annaba Fresh", total: 4800 },
];

const COLUMNS: DataColumn<Order>[] = [
  { key: "ref", label: "Order", sortable: true },
  { key: "customer", label: "Customer", sortable: true },
  {
    key: "total",
    label: "Total",
    numeric: true,
    sortable: true,
    format: (v) => (typeof v === "number" ? `${v} DA` : "-"),
  },
];

describe("data table sorting", () => {
  test("text reads numbers inside it; accents and case do not matter", () => {
    const byRef = sortRows(ORDERS, COLUMNS, { key: "ref", direction: "ascending" }, "fr");
    expect(byRef.map((o) => o.ref)).toEqual(["SO-2", "SO-9", "SO-10", "SO-11"]);
    const byCustomer = sortRows(ORDERS, COLUMNS, { key: "customer", direction: "ascending" }, "fr");
    expect(byCustomer.map((o) => o.customer)).toEqual([
      "Annaba Fresh",
      "Blida Gros",
      "épicerie Saïd",
      "Oran Market",
    ]);
  });

  test("numbers as numbers, empty values last either way, ties keep their order", () => {
    const up = sortRows(ORDERS, COLUMNS, { key: "total", direction: "ascending" });
    expect(up.map((o) => o.ref)).toEqual(["SO-10", "SO-2", "SO-11", "SO-9"]);
    const down = sortRows(ORDERS, COLUMNS, { key: "total", direction: "descending" });
    expect(down.map((o) => o.ref)).toEqual(["SO-11", "SO-10", "SO-2", "SO-9"]);
  });

  test("pressing a header cycles ascending, descending, off", () => {
    const first = nextSort(null, "ref");
    expect(first).toEqual({ key: "ref", direction: "ascending" });
    expect(nextSort(first, "ref")).toEqual({ key: "ref", direction: "descending" });
    expect(nextSort({ key: "ref", direction: "descending" }, "ref")).toBeNull();
    expect(nextSort(first, "total")).toEqual({ key: "total", direction: "ascending" });
  });
});

describe("M3DataTable", () => {
  test("headers announce their sort; select-all selects every row", async () => {
    const sort = ref<DataSort | null>(null);
    const selected = ref<(string | number)[]>([]);
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(M3DataTable, {
            rows: ORDERS,
            columns: COLUMNS as unknown as DataColumn<unknown>[],
            rowKey: (row: unknown) => (row as Order).ref,
            label: "Orders",
            selectable: true,
            sort: sort.value,
            "onUpdate:sort": (value: DataSort | null) => (sort.value = value),
            selected: selected.value,
            "onUpdate:selected": (value: (string | number)[]) => (selected.value = value),
          }),
      }),
      { global: { plugins: [createM3e({ reducedMotion: true })] } },
    );
    const headers = wrapper.findAll("th[scope=col]");
    expect(headers[1]!.attributes("aria-sort")).toBe("none");
    await headers[3]!.get("button").trigger("click");
    await nextTick();
    expect(sort.value).toEqual({ key: "total", direction: "ascending" });
    expect(wrapper.findAll("th[scope=col]")[3]!.attributes("aria-sort")).toBe("ascending");
    expect(wrapper.findAll("tbody tr td:nth-child(2)").map((cell) => cell.text())).toEqual([
      "SO-10",
      "SO-2",
      "SO-11",
      "SO-9",
    ]);
    expect(wrapper.findAll("tbody tr td:last-child").map((cell) => cell.text())[3]).toBe("-");
    await wrapper.get("thead [role=checkbox]").trigger("click");
    await nextTick();
    expect(selected.value.map(String).toSorted()).toEqual(["SO-10", "SO-11", "SO-2", "SO-9"]);
  });
});
