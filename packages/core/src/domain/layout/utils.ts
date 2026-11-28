import type {
  GroupNode,
  LayoutNode,
  PanelId,
  PanelNode,
} from "@core/domain/layout/types";
import { IllegalArgumentError } from "@core/errors";
import { newPanelId } from "@core/ids";

/**
 * @throws `IllegalArgumentError` if `size` is not a finite number in the range (0, 100].
 */
export const throwOnIllegalSize = (size: number): void => {
  if (!Number.isFinite(size) || size <= 0 || size > 100) {
    throw new IllegalArgumentError(
      `Size must be a number in the range (0, 100], got ${size}`,
    );
  }
};

/**
 * Returns a new empty `PanelNode`.
 * @param size the size of the panel; defaults to 100.
 * @param id the id of the panel; defaults to a newly generated one.
 * @throws `IllegalArgumentError` on an illegal `size`.
 */
export const emptyPanel = (
  size: number = 100,
  id: PanelId = newPanelId(),
): PanelNode => {
  throwOnIllegalSize(size);
  return { kind: "panel", id, size, view: { type: "empty" } };
};

// -- Pure helpers (they never touch `this`, so they could live in utils) --

/**
 * Where a node sits in the tree. Since only groups have children, every
 * ancestor is necessarily a `GroupNode`.
 */
export interface NodeLocation<N extends LayoutNode = LayoutNode> {
  node: N;
  /** The groups containing `node`, from the root (first) to its parent (last). */
  ancestors: GroupNode[];
}

/** @returns the location of the parent of `location`, or `undefined` for the root. */
export function parentOf(
  location: NodeLocation,
): NodeLocation<GroupNode> | undefined {
  const parent = location.ancestors.at(-1);
  return parent && { node: parent, ancestors: location.ancestors.slice(0, -1) };
}

/**
 * Replaces `child` in `group` with zero or more nodes: no replacements removes
 * it, one swaps it, more insert siblings.
 * @returns the updated group.
 */
export function replaceChild(
  group: GroupNode,
  child: LayoutNode,
  ...replacements: LayoutNode[]
): GroupNode {
  return {
    ...group,
    children: group.children.flatMap((c) => (c === child ? replacements : [c])),
  };
}

/**
 * Replaces the node at `location` with `replacement` and rebuilds its
 * ancestors. The branches outside the path remain the same objects.
 * @returns the new root.
 */
export function replaceNode(
  location: NodeLocation,
  replacement: LayoutNode,
): LayoutNode {
  let oldNode: LayoutNode = location.node;
  let newNode: LayoutNode = replacement;
  for (const ancestor of [...location.ancestors].reverse()) {
    newNode = replaceChild(ancestor, oldNode, newNode);
    oldNode = ancestor;
  }
  return newNode;
}

/**
 * Replaces a group that is left with a single child by that child, which
 * inherits the group's size. If the child is itself a group following the same
 * axis as the group's parent, its children are merged into that parent to avoid
 * redundant nesting.
 * @returns the new root.
 */
export function collapseGroup(
  group: NodeLocation<GroupNode>,
  child: LayoutNode,
): LayoutNode {
  const promoted: LayoutNode = { ...child, size: group.node.size };
  const grandParent = parentOf(group);

  if (
    grandParent &&
    promoted.kind === "group" &&
    promoted.axis === grandParent.node.axis
  ) {
    const merged = replaceChild(
      grandParent.node,
      group.node,
      ...fitSizes(promoted.children, promoted.size),
    );
    return replaceNode(grandParent, merged);
  }
  return replaceNode(group, promoted);
}

/**
 * Removes every `slavePanelId` pointing to `removedId`.
 * @returns the updated node, or `node` itself if nothing changed.
 */
export function clearSlaveReferences(
  node: LayoutNode,
  removedId: PanelId,
): LayoutNode {
  if (node.kind === "panel") {
    if (node.slavePanelId !== removedId) return node;
    const { slavePanelId: _removed, ...rest } = node;
    return rest;
  }
  const children = mapShared(node.children, (child): LayoutNode =>
    clearSlaveReferences(child, removedId),
  );
  return children === node.children ? node : { ...node, children };
}

/**
 * Like `Array.map`, but returns `items` itself when `fn` leaves every element
 * unchanged, so that unchanged branches keep their identity.
 */
export function mapShared<T>(items: T[], fn: (item: T) => T): T[] {
  const mapped = items.map((item) => fn(item));
  return mapped.every((item, i) => item === items[i]) ? items : mapped;
}

export function sumSizes(nodes: readonly LayoutNode[]): number {
  return nodes.reduce((sum, node) => sum + node.size, 0);
}

/**
 * Rescales the sizes of `nodes` so that they add up to `total`, keeping their
 * proportions (or making them equal if they are all zero).
 */
export function fitSizes(
  nodes: readonly LayoutNode[],
  total: number,
): LayoutNode[] {
  const current = sumSizes(nodes);
  return nodes.map((node) => ({
    ...node,
    size: current > 0 ? (node.size * total) / current : total / nodes.length,
  }));
}
