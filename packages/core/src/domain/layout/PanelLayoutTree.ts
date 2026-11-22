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
import { emptyPanel } from "@core/domain/layout/utils";

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
    const path = this.pathTo(panelId);
    if (!path) {
      throw new IllegalArgumentError(
        `No panel with id "${panelId}" exists in this tree.`,
      );
    }
    const target = path.at(-1);
    if (target?.kind !== "panel") {
      throw new IllegalArgumentError(
        `Node with id "${panelId}" is not a panel.`,
      );
    }
    const parent = path.at(-2);
    if (parent && parent.kind !== "group") {
      throw new IllegalStateError(
        `Node with id "${parent.id}" has children but is not a group.`,
      );
    }

    // Same axis as the parent: no need for a nested group, add a sibling.
    if (parent && parent.axis === axis) {
      const updatedParent = this.splitIntoSiblings(parent, target);
      return new PanelLayoutTreeImpl(
        PanelLayoutTreeImpl.rebuild(path.slice(0, -1), updatedParent),
        this._ids,
      );
    }

    const newGroup = this.generateGroup(axis, target);
    return new PanelLayoutTreeImpl(
      PanelLayoutTreeImpl.rebuild(path, newGroup),
      this._ids,
    );
  }

  /**
   * Inserts a new empty panel right after `target` in `parent`, splitting the
   * target's size in half between the two.
   * @returns the updated parent group.
   */
  private splitIntoSiblings(parent: GroupNode, target: PanelNode): GroupNode {
    const halfSize = target.size / 2;
    const newPanel: PanelNode = {
      kind: "panel",
      id: this._ids.newPanelId(),
      view: { type: "empty" },
      size: halfSize,
    };
    return {
      ...parent,
      children: parent.children.flatMap((child) =>
        child === target ? [{ ...target, size: halfSize }, newPanel] : [child],
      ),
    };
  }

  toJSON(): LayoutNode {
    return this._root;
  }

  /**
   * Computes the path of `LayoutNode`s from `from` to the node with id `id`.
   * @param id the id of the target node.
   * @param from the `LayoutNode` from which to start the search; defaults to
   * the root of this tree.
   * @returns the nodes from `from` (first) to the target (last), or `undefined`
   * if no node with such id exists under `from`.
   */
  private pathTo(
    id: PanelId | GroupId,
    from: LayoutNode = this._root,
  ): LayoutNode[] | undefined {
    if (from.id === id) return [from];
    if (from.kind === "group") {
      for (const child of from.children) {
        const subPath = this.pathTo(id, child);
        if (subPath) return [from, ...subPath];
      }
    }
    return undefined;
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
    newPanelView: PanelView = { type: "empty" },
  ): GroupNode {
    const newPanelSize = PanelLayoutTreeImpl.NEW_PANEL_DEFAULT_SIZE;
    const newPanel: PanelNode = {
      kind: "panel",
      id: this._ids.newPanelId(),
      view: newPanelView,
      size: newPanelSize,
    };
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

  /**
   * Replaces the last node of `path` with `replacement` and rebuilds its
   * ancestors. The branches outside the path remain the same objects.
   * @param path the nodes from the root (first) to the node to replace (last);
   * every node but the last one must be a `GroupNode`.
   * @returns the new root.
   */
  private static rebuild(
    path: LayoutNode[],
    replacement: LayoutNode,
  ): LayoutNode {
    let current = replacement;
    for (let i = path.length - 2; i >= 0; i--) {
      const ancestor = path[i] as GroupNode; // every ancestor is a group
      const replaced = path[i + 1];
      const updated = current;
      current = {
        ...ancestor,
        children: ancestor.children.map((child) =>
          child === replaced ? updated : child,
        ),
      };
    }
    return current;
  }
}
