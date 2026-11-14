import type {
  GroupId,
  LayoutNode,
  PanelId,
  PanelNode,
} from "@core/domain/layout/types";

export interface PanelLayoutTree {
  /**
   * Finds and returns the `PanelNode` associated with `panelId`.
   * @param panelId the id of the panel to find.
   * @returns a `PanelNode` if `panelId` is under this tree, `undefined` otherwise.
   */
  find(panelId: PanelId): PanelNode | undefined;
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
  private readonly _root: LayoutNode;

  constructor(root: LayoutNode) {
    this._root = root;
  }

  private findById(
    from: LayoutNode,
    id: PanelId | GroupId,
  ): LayoutNode | undefined {
    if (from.id === id) return from;
    if (from.kind === "group") {
      for (const child of from.children) {
        const found = this.findById(child, id);
        if (found) return found;
      }
    }
    return undefined;
  }

  find(_: PanelId): PanelNode | undefined {
    throw new Error("Method not implemented.");
  }
}
