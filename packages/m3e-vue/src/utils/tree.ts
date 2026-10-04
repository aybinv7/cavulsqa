/** A treeview's data and the arithmetic over it, pure so expansion and tri-state checks are testable. */
export interface TreeNode {
  id: string;
  label: string;
  supporting?: string;
  children?: readonly TreeNode[];
  /** Children come from `load()` the first time the node opens. */
  lazy?: boolean;
  disabled?: boolean;
}

export interface TreeRow {
  node: TreeNode;
  level: number;
  parentId: string | null;
  branch: boolean;
  /** 1-based position among its siblings, and their count - `aria-posinset` / `aria-setsize`. */
  position: number;
  siblings: number;
}

export type CheckState = "checked" | "mixed" | "unchecked";

const childrenOf = (node: TreeNode, loaded: ReadonlyMap<string, readonly TreeNode[]>) =>
  node.children ?? loaded.get(node.id) ?? [];

/** The rows a person can see: every root, and the children of every open node, depth first. */
export function visibleRows(
  roots: readonly TreeNode[],
  expanded: ReadonlySet<string>,
  loaded: ReadonlyMap<string, readonly TreeNode[]> = new Map(),
): TreeRow[] {
  const rows: TreeRow[] = [];
  const walk = (nodes: readonly TreeNode[], level: number, parentId: string | null) => {
    nodes.forEach((node, index) => {
      const children = childrenOf(node, loaded);
      rows.push({
        node,
        level,
        parentId,
        branch: children.length > 0 || Boolean(node.lazy),
        position: index + 1,
        siblings: nodes.length,
      });
      if (expanded.has(node.id) && children.length > 0) walk(children, level + 1, node.id);
    });
  };
  walk(roots, 1, null);
  return rows;
}

/** Every leaf under a node - the ids a check on it stands for. */
export function leafIds(
  node: TreeNode,
  loaded: ReadonlyMap<string, readonly TreeNode[]> = new Map(),
): string[] {
  const children = childrenOf(node, loaded);
  if (children.length === 0) return [node.id];
  return children.flatMap((child) => leafIds(child, loaded));
}

/** Checked when all its leaves are, mixed when some are. */
export function checkState(
  node: TreeNode,
  checked: ReadonlySet<string>,
  loaded: ReadonlyMap<string, readonly TreeNode[]> = new Map(),
): CheckState {
  const leaves = leafIds(node, loaded);
  const count = leaves.filter((id) => checked.has(id)).length;
  if (count === 0) return "unchecked";
  return count === leaves.length ? "checked" : "mixed";
}

/** Checking a branch checks every leaf under it; a fully checked one clears them all. */
export function toggleCheck(
  node: TreeNode,
  checked: ReadonlySet<string>,
  loaded: ReadonlyMap<string, readonly TreeNode[]> = new Map(),
): Set<string> {
  const next = new Set(checked);
  const leaves = leafIds(node, loaded);
  const clear = checkState(node, checked, loaded) === "checked";
  for (const id of leaves) {
    if (clear) next.delete(id);
    else next.add(id);
  }
  return next;
}
