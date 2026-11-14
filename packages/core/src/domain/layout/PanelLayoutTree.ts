import type { LayoutNode, PanelId, PanelNode } from "@core/domain/layout/types";

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

class PanelLayoutTreeImpl implements PanelLayoutTree {
  private root: LayoutNode;

  constructor(root: LayoutNode) {
    this.root = root;
  }

  find(_: PanelId): PanelNode | undefined {
    throw new Error("Method not implemented.");
  }
}
