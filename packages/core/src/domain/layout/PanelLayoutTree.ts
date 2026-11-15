import type {
  Axis,
  GroupId,
  GroupNode,
  LayoutNode,
  PanelId,
} from "@core/domain/layout/types";
import { IllegalArgumentError, IllegalStateError } from "@core/errors";
import { emptyPanel, generateGroup, replaceNodeInGroup } from "./utils";

export interface PanelLayoutTree {
  /**
   * Splits a panel into a group of subpanels.
   * @param panelId the id of the panel to split.
   * @param rootGroupAxis the direction of the group of panels to be used if the panel
   * is the root of the tree.
   * @throws `IllegalArgumentError` if no panel with `panelId` exists in this tree.
   */
  splitPanel(panelId: PanelId, rootGroupAxis: Axis): void;
}

interface PanelLayoutTreeDeps {
  root: LayoutNode;
}

export default function PanelLayoutTree({ root }: PanelLayoutTreeDeps) {
  return new PanelLayoutTreeImpl(root);
}

/**
 * An implementation of `PanelLayoutTree`. It performs searches and insertions
 * starting from the `root` node, without using internal indexes, since the maximum
 * number of allowed panels is small.
 */
class PanelLayoutTreeImpl implements PanelLayoutTree {
  private _root: LayoutNode;

  constructor(root?: LayoutNode) {
    this._root = root ?? emptyPanel();
  }

  splitPanel(panelId: PanelId, rootGroupAxis: Axis = "horizontal"): void {
    const panelPath = this.pathTo(this._root, panelId);
    if (!panelPath) {
      throw new IllegalArgumentError(
        `No panel with id "${panelId} exists in this tree."`,
      );
    }
    const targetPanel = panelPath[panelPath.length - 1];
    const parentGroup = panelPath[panelPath.length - 2];
    if (!targetPanel || targetPanel.kind !== "panel") {
      throw new IllegalStateError(
        `PanelGroup with id "${targetPanel?.id}" cannot be a leaf.`,
      );
    }
    const newGroup = generateGroup(
      parentGroup && parentGroup.kind === "group"
        ? parentGroup.axis === "horizontal"
          ? "vertical"
          : "horizontal"
        : rootGroupAxis,
      targetPanel,
    );
    // the new group is the new root node
    if (!parentGroup) {
      this._root = newGroup;
    } else {
      replaceNodeInGroup(parentGroup as GroupNode, targetPanel.id, newGroup);
    }
  }

  /**
   * Computes the path of `LayoutNode`s from `from` to the LayoutNode with id `id`.
   * @param from the `LayoutNode` from which to start the search.
   * @param id the id of the target `LayoutNode`.
   * @returns a list containing the path from `LayoutNode` to the node with ID id;
   * otherwise, returns undefined
   */
  private pathTo(
    from: LayoutNode,
    id: PanelId | GroupId,
  ): LayoutNode[] | undefined {
    if (from.id === id) return [from];
    if (from.kind === "group") {
      for (const child of from.children) {
        const subTree = this.pathTo(child, id);
        if (subTree) return [from, ...subTree];
      }
    }
    return undefined;
  }
}
