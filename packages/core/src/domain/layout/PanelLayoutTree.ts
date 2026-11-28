import type {
  Axis,
  GroupId,
  GroupNode,
  LayoutNode,
  PanelId,
  PanelNode,
  PanelView,
} from "@core/domain/layout/types";
import { IllegalArgumentError, IllegalStateError } from "@core/errors";
import { newGroupId, newPanelId } from "@core/ids";
import {
  clearSlaveReferences,
  collapseGroup,
  emptyPanel,
  fitSizes,
  mapShared,
  parentOf,
  replaceChild,
  replaceNode,
  sumSizes,
  type NodeLocation,
} from "@core/domain/layout/utils";

/** Generators of the ids of the nodes created by a `PanelLayoutTree`. */
export interface IdGenerators {
  newPanelId(): PanelId;
  newGroupId(): GroupId;
}

/**
 * An immutable tree of panels: operations never modify the tree on which they
 * are called, but return a new one, so that React can detect component changes.
 * Branches that did not change are shared between the old and the new tree.
 */
export interface PanelLayoutTree {
  /**
   * Splits a panel in two along the given axis. If the parent group already
   * follows `axis` (or the panel is the root and has no parent), the behaviour
   * differs:
   * - same axis as the parent: a new sibling is inserted right after the panel
   *   and the panel's space is split in half between the two;
   * - different axis, or panel is the root: the panel is replaced by a new
   *   group following `axis`, containing the old and the new panel.
   * @param panelId the id of the panel to split.
   * @param axis the axis along which the panels will be laid out.
   * @returns a new tree with the panel split; this tree is left untouched.
   * @throws `IllegalArgumentError` if no panel with `panelId` exists in this tree.
   */
  splitPanel(panelId: PanelId, axis: Axis): PanelLayoutTree;

  /**
   * Removes a panel. The space it occupied is given to its siblings, in
   * proportion to their current size. If a single sibling remains, the parent
   * group is replaced by that sibling; if that sibling is a group following the
   * same axis as the grandparent, its children are merged into the grandparent.
   * Any `slavePanelId` pointing to the removed panel is cleared.
   * @param panelId the id of the panel to remove.
   * @returns a new tree without the panel; this tree is left untouched.
   * @throws `IllegalArgumentError` if no panel with `panelId` exists in this
   * tree, or if it is the only panel of the tree.
   */
  removePanel(panelId: PanelId): PanelLayoutTree;

  /**
   * Updates the sizes of the children of a group.
   * @param groupId the id of the group whose children are resized.
   * @param sizes the new size of each child, keyed by child id; children not
   * listed keep their size.
   * @returns a new tree with the updated sizes, or this same tree if nothing changed.
   * @throws `IllegalArgumentError` if no group with `groupId` exists in this tree.
   */
  resizeGroup(
    groupId: GroupId,
    sizes: Readonly<Record<PanelId | GroupId, number>>,
  ): PanelLayoutTree;

  /**
   * @returns the root node of this tree, as a JSON serializable object.
   */
  toJSON(): LayoutNode;
}

interface PanelLayoutTreeDeps {
  /** The root of the tree; defaults to a single empty panel. */
  root?: LayoutNode;
  /** The id generators; override them in tests to get predictable ids. */
  ids?: IdGenerators;
}

export default function PanelLayoutTree({
  root,
  ids = { newPanelId, newGroupId },
}: PanelLayoutTreeDeps = {}): PanelLayoutTree {
  return new PanelLayoutTreeImpl(
    root ?? emptyPanel(100, ids.newPanelId()),
    ids,
  );
}

type Position = "before" | "after";

/**
 * An implementation of `PanelLayoutTree`. It performs searches starting from
 * the root node, without using internal indexes, since the maximum number of
 * allowed panels is small.
 */
class PanelLayoutTreeImpl implements PanelLayoutTree {
  private static readonly NEW_PANEL_DEFAULT_SIZE = 50;

  private readonly _root: LayoutNode;
  private readonly _ids: IdGenerators;

  constructor(root: LayoutNode, ids: IdGenerators) {
    this._root = root;
    this._ids = ids;
  }

  splitPanel(panelId: PanelId, axis: Axis): PanelLayoutTree {
    const panel = this.find<PanelNode>(panelId, "panel");
    const parent = parentOf(panel);

    // Same axis as the parent: no need for a nested group, add a sibling.
    if (parent?.node.axis === axis) {
      return this.withRoot(
        replaceNode(parent, this.splitIntoSiblings(parent.node, panel.node)),
      );
    }
    return this.withRoot(
      replaceNode(panel, this.generateGroup(axis, panel.node)),
    );
  }

  removePanel(panelId: PanelId): PanelLayoutTree {
    const panel = this.find<PanelNode>(panelId, "panel");
    const parent = parentOf(panel);
    if (!parent) {
      throw new IllegalArgumentError(
        "Cannot remove the only panel of the tree.",
      );
    }

    const { children: remaining } = replaceChild(parent.node, panel.node);
    const [first, ...others] = remaining;
    if (!first) {
      throw new IllegalStateError(
        `Group "${parent.node.id}" had a single child.`,
      );
    }

    const newRoot =
      others.length === 0
        ? collapseGroup(parent, first) // the group is no longer needed
        : replaceNode(parent, {
            ...parent.node,
            // the freed space goes to the siblings, proportionally
            children: fitSizes(remaining, sumSizes(parent.node.children)),
          });

    return this.withRoot(clearSlaveReferences(newRoot, panelId));
  }

  resizeGroup(
    groupId: GroupId,
    sizes: Readonly<Record<PanelId | GroupId, number>>,
  ): PanelLayoutTree {
    const group = this.find<GroupNode>(groupId, "group");

    const children = mapShared(group.node.children, (child): LayoutNode => {
      const size = sizes[child.id];
      return size === undefined || size === child.size
        ? child
        : { ...child, size };
    });
    if (children === group.node.children) return this; // to avoid a useless re-render

    return this.withRoot(replaceNode(group, { ...group.node, children }));
  }

  toJSON(): LayoutNode {
    return this._root;
  }

  private withRoot(root: LayoutNode): PanelLayoutTree {
    return new PanelLayoutTreeImpl(root, this._ids);
  }

  /**
   * Finds the node with id `id` and checks that it is of the expected kind.
   * @throws `IllegalArgumentError` if there is no such node, or it is of another kind.
   */
  private find<N extends LayoutNode>(
    id: N["id"],
    kind: N["kind"],
  ): NodeLocation<N> {
    const location = this.locate(id);
    if (!location) {
      throw new IllegalArgumentError(
        `No ${kind} with id "${id}" exists in this tree.`,
      );
    }
    if (location.node.kind !== kind) {
      throw new IllegalArgumentError(`Node with id "${id}" is not a ${kind}.`);
    }
    return location as NodeLocation<N>;
  }

  /**
   * Looks for the node with id `id`, starting from `from`.
   * @param ancestors the groups between the root and `from`, used by recursion.
   * @returns the location of the node, or `undefined` if no node under `from`
   * has such id.
   */
  private locate(
    id: PanelId | GroupId,
    from: LayoutNode = this._root,
    ancestors: GroupNode[] = [],
  ): NodeLocation | undefined {
    if (from.id === id) return { node: from, ancestors };
    if (from.kind !== "group") return undefined;

    const path = [...ancestors, from];
    for (const child of from.children) {
      const found = this.locate(id, child, path);
      if (found) return found;
    }
    return undefined;
  }

  private createPanel(
    size: number,
    view: PanelView = { type: "empty" },
  ): PanelNode {
    return { kind: "panel", id: this._ids.newPanelId(), view, size };
  }

  /**
   * Inserts a new empty panel right after `target` in `parent`, splitting the
   * target's size in half between the two.
   * @returns the updated parent group.
   */
  private splitIntoSiblings(parent: GroupNode, target: PanelNode): GroupNode {
    const halfSize = target.size / 2;
    return replaceChild(
      parent,
      target,
      { ...target, size: halfSize },
      this.createPanel(halfSize),
    );
  }

  /**
   * Generates a new `GroupNode` out of a panel that gets split.
   * @param axis the axis that the new group must follow.
   * @param oldPanel the `PanelNode` that gets split.
   * @param newPanelPosition where the new panel is placed respect to `oldPanel`.
   * @param newPanelView the view of the new panel; defaults to an empty one.
   * @returns a group containing the old and the new panel, in the specified order.
   */
  private generateGroup(
    axis: Axis,
    oldPanel: PanelNode,
    newPanelPosition: Position = "after",
    newPanelView?: PanelView,
  ): GroupNode {
    const newPanelSize = PanelLayoutTreeImpl.NEW_PANEL_DEFAULT_SIZE;
    const newPanel = this.createPanel(newPanelSize, newPanelView);
    const updatedOldPanel: PanelNode = {
      ...oldPanel,
      size: 100 - newPanelSize,
    };
    return {
      kind: "group",
      id: this._ids.newGroupId(),
      axis,
      size: oldPanel.size,
      children:
        newPanelPosition === "before"
          ? [newPanel, updatedOldPanel]
          : [updatedOldPanel, newPanel],
    };
  }
}
