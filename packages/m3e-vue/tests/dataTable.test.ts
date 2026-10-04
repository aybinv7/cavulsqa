import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, test } from "vite-plus/test";
import { defineComponent, h, nextTick, ref } from "vue";
import { M3DataTable, createM3e } from "../src/index.js";
import {
  groupRows,
  nextSort,
  orderColumns,
  sortRows,
  summarize,
  type DataColumn,
  type DataSort,
} from "../src/utils/dataTable.js";

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
            columnMenu: false,
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

interface Line {
  ref: string;
  city: string;
  cases: number;
}

const LINES: Line[] = [
  { ref: "A", city: "Oran", cases: 4 },
  { ref: "B", city: "Blida", cases: 10 },
  { ref: "C", city: "Oran", cases: 6 },
  { ref: "D", city: "", cases: 1 },
];

const LINE_COLUMNS: DataColumn<Line>[] = [
  { key: "ref", label: "Order", sortable: true },
  { key: "city", label: "City", sortable: true },
  { key: "cases", label: "Cases", numeric: true, sortable: true, summary: "sum" },
];

describe("column layout helpers", () => {
  test("hidden columns drop out and pinned ones come first in pin order", () => {
    const keys = orderColumns(LINE_COLUMNS, ["city"], ["cases"]).map((column) => column.key);
    expect(keys).toEqual(["cases", "ref"]);
  });

  test("groups keep first-appearance order; empty values get their own group; summaries add up", () => {
    const groups = groupRows(LINES, LINE_COLUMNS[1]!, "en", "No city");
    expect(groups.map((group) => [group.label, group.rows.map((row) => row.ref)])).toEqual([
      ["Oran", ["A", "C"]],
      ["Blida", ["B"]],
      ["No city", ["D"]],
    ]);
    expect(summarize(groups[0]!.rows, LINE_COLUMNS[2]!)).toBe(10);
    expect(summarize(groups[0]!.rows, { key: "cases", label: "", summary: "average" })).toBe(5);
    expect(summarize(groups[0]!.rows, LINE_COLUMNS[0]!)).toBeNull();
  });
});

describe("M3DataTable column menu", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  function table() {
    const state = {
      sort: ref<DataSort | null>(null),
      group: ref<string | null>(null),
      pinned: ref<string[]>([]),
      hidden: ref<string[]>([]),
    };
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(M3DataTable, {
            rows: LINES,
            columns: LINE_COLUMNS as unknown as DataColumn<unknown>[],
            rowKey: (row: unknown) => (row as Line).ref,
            label: "Lines",
            emptyGroupLabel: "No city",
            sort: state.sort.value,
            "onUpdate:sort": (value: DataSort | null) => (state.sort.value = value),
            group: state.group.value,
            "onUpdate:group": (value: string | null) => (state.group.value = value),
            pinned: state.pinned.value,
            "onUpdate:pinned": (value: string[]) => (state.pinned.value = value),
            hidden: state.hidden.value,
            "onUpdate:hidden": (value: string[]) => (state.hidden.value = value),
          }),
      }),
      { attachTo: document.body, global: { plugins: [createM3e({ reducedMotion: true })] } },
    );
    const openMenu = async (index: number) => {
      await wrapper.findAll("thead th")[index]!.get("button").trigger("click");
      await nextTick();
      await nextTick();
    };
    const choose = async (label: string) => {
      const item = [...document.querySelectorAll<HTMLElement>("[role^=menuitem]")].find((entry) =>
        entry.textContent?.includes(label),
      );
      item!.click();
      await nextTick();
      await nextTick();
    };
    return { wrapper, state, openMenu, choose };
  }

  test("a header opens its menu, and sorting from it sets the model", async () => {
    const { state, openMenu, choose } = table();
    await openMenu(2);
    expect(document.querySelector("[role=menu]")).not.toBeNull();
    await choose("Sort descending");
    expect(state.sort.value).toEqual({ key: "cases", direction: "descending" });
  });

  test("grouping draws a header per group with its count and summary, and collapses it", async () => {
    const { wrapper, state, openMenu, choose } = table();
    await openMenu(1);
    await choose("Group by this column");
    expect(state.group.value).toBe("city");
    const groups = () => wrapper.findAll(".m3-data-table__group");
    expect(
      groups().map((row) =>
        row
          .get("th")
          .findAll("button > span")
          .map((span) => span.text()),
      ),
    ).toEqual([
      ["Oran", "2 rows"],
      ["Blida", "1 row"],
      ["No city", "1 row"],
    ]);
    expect(groups()[0]!.findAll("td").at(-1)!.text()).toBe("10");
    expect(wrapper.findAll("tbody tr")).toHaveLength(7);
    await groups()[0]!.trigger("click");
    expect(wrapper.findAll("tbody tr")).toHaveLength(5);
    expect(groups()[0]!.get("button").attributes("aria-expanded")).toBe("false");
  });

  test("pinning moves a column first and makes it stick; hiding takes it out", async () => {
    const { wrapper, state, openMenu, choose } = table();
    await openMenu(2);
    await choose("Pin to start");
    expect(state.pinned.value).toEqual(["cases"]);
    const headers = () => wrapper.findAll("thead th").map((cell) => cell.text());
    expect(headers()[0]).toContain("Cases");
    expect(wrapper.findAll("thead th")[0]!.classes()).toContain("m3-data-table__pinned");
    await openMenu(2);
    await choose("Hide column");
    expect(state.hidden.value).toEqual(["city"]);
    expect(headers().some((text) => text.includes("City"))).toBe(false);
  });
});
