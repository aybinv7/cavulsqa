import type { TreeNode } from "@cavulsqa/m3e-vue";

/** A catalogue and a permission set to show the treeview with, labelled in the current language. */
export function useTreeDemo() {
  const { t } = useI18n();
  const label = (key: string) => t(`gallery.tree.nodes.${key}`);

  const categories = computed<TreeNode[]>(() => [
    {
      id: "drinks",
      label: label("drinks"),
      supporting: t("gallery.tree.products", { count: 42 }),
      children: [
        { id: "water", label: label("water") },
        {
          id: "juice",
          label: label("juice"),
          children: [
            { id: "orange", label: label("orange") },
            { id: "apple", label: label("apple") },
          ],
        },
        { id: "soda", label: label("soda") },
      ],
    },
    { id: "dairy", label: label("dairy"), supporting: t("gallery.tree.loadsLater"), lazy: true },
    {
      id: "grocery",
      label: label("grocery"),
      children: [
        { id: "pasta", label: label("pasta") },
        { id: "oil", label: label("oil") },
      ],
    },
  ]);

  const permissions = computed<TreeNode[]>(() => [
    {
      id: "sales",
      label: label("sales"),
      children: [
        { id: "sales.read", label: label("read") },
        { id: "sales.create", label: label("create") },
        { id: "sales.cancel", label: label("cancel") },
      ],
    },
    {
      id: "stock",
      label: label("stock"),
      children: [
        { id: "stock.read", label: label("read") },
        { id: "stock.adjust", label: label("adjust") },
      ],
    },
  ]);

  async function loadChildren(): Promise<TreeNode[]> {
    await new Promise((resolve) => setTimeout(resolve, 900));
    return [
      { id: "milk", label: label("milk") },
      { id: "yoghurt", label: label("yoghurt") },
      { id: "cheese", label: label("cheese") },
    ];
  }

  return { categories, permissions, loadChildren };
}
