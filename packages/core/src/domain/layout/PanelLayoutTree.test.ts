import { describe, expect, it } from "vitest";
import type {
  Axis,
  GroupId,
  GroupNode,
  LayoutNode,
  PanelId,
  PanelNode,
} from "@core/domain/layout/types";
import { IllegalArgumentError, IllegalStateError } from "@core/errors";
import PanelLayoutTree, { type IdGenerators } from "./PanelLayoutTree";

// -- Fixtures --

type PanelExtras = Partial<Pick<PanelNode, "view" | "slavePanelId">>;

const panel = (
  name: string,
  size: number,
  extras: PanelExtras = {},
): PanelNode => ({
  kind: "panel",
  id: `panel-${name}`,
  size,
  view: { type: "empty" },
  ...extras,
});

const group = (
  name: string,
  axis: Axis,
  size: number,
  children: LayoutNode[],
): GroupNode => ({
  kind: "group",
  id: `group-${name}`,
  axis,
  size,
  children,
});

const panelId = (name: string) => `panel-${name}` as PanelId;
const groupId = (name: string) => `group-${name}` as GroupId;
/** Lets a test pass an id of the wrong kind to a method. */
const asPanelId = (id: string) => id as PanelId;
const asGroupId = (id: string) => id as GroupId;

const asGroup = (node: LayoutNode): GroupNode => {
  if (node.kind !== "group")
    throw new Error(`Expected a group, got "${node.id}"`);
  return node;
};

const totalSize = (nodes: readonly LayoutNode[]) =>
  nodes.reduce((sum, node) => sum + node.size, 0);

/** Predictable ids: `panel-1`, `panel-2`, ... and `group-1`, `group-2`, ... */
function sequentialIds(): IdGenerators {
  let panels = 0;
  let groups = 0;
  return {
    newPanelId: () => `panel-${++panels}`,
    newGroupId: () => `group-${++groups}`,
  };
}

/** Freezes a value deeply: any in-place mutation throws a `TypeError`. */
function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

const treeOf = (root: LayoutNode) =>
  PanelLayoutTree({ root, ids: sequentialIds() });

/**
 * root (horizontal, 100)
 * ├─ a (40)
 * └─ g (vertical, 60)
 *    ├─ b (50)
 *    └─ c (50)
 */
function makeTree() {
  const a = panel("a", 40);
  const b = panel("b", 50);
  const c = panel("c", 50);
  const g = group("g", "vertical", 60, [b, c]);
  const root = deepFreeze(group("root", "horizontal", 100, [a, g]));
  return { a, b, c, g, root, tree: treeOf(root) };
}

// -- Tests --

describe("PanelLayoutTree factory", () => {
  it("starts from a single empty panel taking all the space by default", () => {
    expect(PanelLayoutTree().toJSON()).toMatchObject({
      kind: "panel",
      size: 100,
      view: { type: "empty" },
    });
  });

  it("uses the id generator for the default panel", () => {
    const tree = PanelLayoutTree({ ids: sequentialIds() });
    expect(tree.toJSON().id).toBe("panel-1");
  });

  it("uses the given root as is", () => {
    const { root } = makeTree();
    expect(PanelLayoutTree({ root }).toJSON()).toBe(root);
  });
});

describe("toJSON", () => {
  it("makes the tree serialize as its root node", () => {
    const { root, tree } = makeTree();
    expect(JSON.parse(JSON.stringify(tree))).toEqual(root);
  });
});

describe("splitPanel", () => {
  describe("on the root panel", () => {
    it.each<Axis>(["horizontal", "vertical"])(
      "replaces it with a %s group of two halves",
      (axis) => {
        const tree = treeOf(panel("root", 100));

        const result = tree.splitPanel(panelId("root"), axis);

        expect(result.toJSON()).toEqual(
          group("1", axis, 100, [panel("root", 50), panel("1", 50)]),
        );
      },
    );
  });

  describe("along a different axis than the parent's", () => {
    it("wraps the panel in a new group that inherits its size", () => {
      const { g, tree } = makeTree();

      const result = asGroup(
        tree.splitPanel(panelId("a"), "vertical").toJSON(),
      );

      expect(result).toEqual(
        group("root", "horizontal", 100, [
          group("1", "vertical", 40, [panel("a", 50), panel("1", 50)]),
          g,
        ]),
      );
      expect(result.children[1]).toBe(g);
    });
  });

  describe("along the same axis as the parent's", () => {
    it("inserts a sibling right after the panel, halving its size", () => {
      const { g, tree } = makeTree();

      const result = tree.splitPanel(panelId("a"), "horizontal");

      expect(result.toJSON()).toEqual(
        group("root", "horizontal", 100, [panel("a", 20), panel("1", 20), g]),
      );
    });

    it("works the same on the last child", () => {
      const { a, b, tree } = makeTree();

      const result = tree.splitPanel(panelId("c"), "vertical");

      expect(result.toJSON()).toEqual(
        group("root", "horizontal", 100, [
          a,
          group("g", "vertical", 60, [b, panel("c", 25), panel("1", 25)]),
        ]),
      );
    });

    it("does not change the total size of the group", () => {
      const { tree } = makeTree();
      const result = asGroup(
        tree.splitPanel(panelId("a"), "horizontal").toJSON(),
      );
      expect(totalSize(result.children)).toBe(100);
    });

    it("shares the branches that were not involved", () => {
      const { a, tree } = makeTree();
      const result = asGroup(
        tree.splitPanel(panelId("c"), "vertical").toJSON(),
      );
      expect(result.children[0]).toBe(a);
    });
  });

  it("keeps the view and the slave of the split panel, and creates an empty one", () => {
    const root = group("root", "horizontal", 100, [
      panel("a", 50, { view: { type: "graph" }, slavePanelId: panelId("b") }),
      panel("b", 50),
    ]);

    const result = treeOf(root).splitPanel(panelId("a"), "horizontal");

    expect(result.toJSON()).toEqual(
      group("root", "horizontal", 100, [
        panel("a", 25, { view: { type: "graph" }, slavePanelId: panelId("b") }),
        panel("1", 25),
        panel("b", 50),
      ]),
    );
  });

  it("keeps generating fresh ids across successive operations", () => {
    const result = treeOf(panel("root", 100))
      .splitPanel(panelId("root"), "horizontal")
      .splitPanel(panelId("1"), "vertical");

    expect(result.toJSON()).toEqual(
      group("1", "horizontal", 100, [
        panel("root", 50),
        group("2", "vertical", 50, [panel("1", 50), panel("2", 50)]),
      ]),
    );
  });

  it("leaves the original tree untouched", () => {
    const { root, tree } = makeTree(); // `root` is deep-frozen
    const result = tree.splitPanel(panelId("a"), "horizontal");

    expect(result).not.toBe(tree);
    expect(tree.toJSON()).toBe(root);
  });

  it("throws if the panel does not exist", () => {
    const { tree } = makeTree();
    expect(() => tree.splitPanel(panelId("zzz"), "horizontal")).toThrow(
      IllegalArgumentError,
    );
    expect(() => tree.splitPanel(panelId("zzz"), "horizontal")).toThrow(
      /No panel with id "panel-zzz"/,
    );
  });

  it("throws if the id belongs to a group", () => {
    const { tree } = makeTree();
    expect(() => tree.splitPanel(asPanelId("group-g"), "horizontal")).toThrow(
      IllegalArgumentError,
    );
    expect(() => tree.splitPanel(asPanelId("group-g"), "horizontal")).toThrow(
      /is not a panel/,
    );
  });
});

describe("removePanel", () => {
  describe("errors", () => {
    it("throws if the panel does not exist", () => {
      const { tree } = makeTree();
      expect(() => tree.removePanel(panelId("zzz"))).toThrow(
        IllegalArgumentError,
      );
      expect(() => tree.removePanel(panelId("zzz"))).toThrow(
        /No panel with id "panel-zzz"/,
      );
    });

    it("throws if the id belongs to a group", () => {
      const { tree } = makeTree();
      expect(() => tree.removePanel(asPanelId("group-g"))).toThrow(
        /is not a panel/,
      );
    });

    it("throws when removing the only panel of the tree", () => {
      const tree = treeOf(panel("root", 100));
      expect(() => tree.removePanel(panelId("root"))).toThrow(
        IllegalArgumentError,
      );
      expect(() => tree.removePanel(panelId("root"))).toThrow(/only panel/);
    });

    it("throws on a malformed group that had a single child", () => {
      const tree = treeOf(group("root", "horizontal", 100, [panel("a", 100)]));
      expect(() => tree.removePanel(panelId("a"))).toThrow(IllegalStateError);
    });
  });

  describe("when two or more siblings remain", () => {
    it("gives the freed space to the siblings, proportionally", () => {
      const root = group("root", "horizontal", 100, [
        panel("a", 20),
        panel("b", 20),
        panel("c", 60),
      ]);

      const result = treeOf(root).removePanel(panelId("a"));

      expect(result.toJSON()).toEqual(
        group("root", "horizontal", 100, [panel("b", 25), panel("c", 75)]),
      );
    });

    it("keeps the total and the ratio between siblings with awkward numbers", () => {
      const root = group("root", "horizontal", 100, [
        panel("a", 30),
        panel("b", 30),
        panel("c", 40),
      ]);

      const result = asGroup(treeOf(root).removePanel(panelId("b")).toJSON());
      const [a, c] = result.children;

      expect(totalSize(result.children)).toBeCloseTo(100, 10);
      expect(a!.size / c!.size).toBeCloseTo(30 / 40, 10);
    });

    it("works inside a nested group, leaving the group's own size alone", () => {
      const a = panel("a", 40);
      const root = deepFreeze(
        group("root", "horizontal", 100, [
          a,
          group("g", "vertical", 60, [
            panel("b", 20),
            panel("c", 30),
            panel("d", 50),
          ]),
        ]),
      );

      const result = asGroup(treeOf(root).removePanel(panelId("b")).toJSON());

      expect(result).toEqual(
        group("root", "horizontal", 100, [
          a,
          group("g", "vertical", 60, [panel("c", 37.5), panel("d", 62.5)]),
        ]),
      );
      expect(result.children[0]).toBe(a);
    });

    it("shares the branches that were not involved", () => {
      const top = panel("top", 50);
      const root = deepFreeze(
        group("root", "vertical", 100, [
          top,
          group("mid", "horizontal", 50, [
            panel("p", 30),
            panel("q", 30),
            panel("r", 40),
          ]),
        ]),
      );

      const result = asGroup(treeOf(root).removePanel(panelId("q")).toJSON());

      expect(result.children[0]).toBe(top);
    });
  });

  describe("when a single sibling remains", () => {
    it("promotes a sibling panel in place of the root group", () => {
      const root = group("root", "horizontal", 100, [
        panel("a", 40),
        panel("b", 60),
      ]);

      const result = treeOf(root).removePanel(panelId("b"));

      expect(result.toJSON()).toEqual(panel("a", 100));
    });

    it("promotes a sibling panel in place of a nested group, inheriting its size", () => {
      const { a, tree } = makeTree();

      const result = tree.removePanel(panelId("b"));

      expect(result.toJSON()).toEqual(
        group("root", "horizontal", 100, [a, panel("c", 60)]),
      );
    });

    it("merges a same-axis sibling group into the grandparent, rescaling its children", () => {
      const a = panel("a", 50);
      const root = deepFreeze(
        group("root", "horizontal", 100, [
          a,
          group("g", "vertical", 50, [
            group("h", "horizontal", 60, [panel("x", 30), panel("y", 70)]),
            panel("z", 40),
          ]),
        ]),
      );

      const result = asGroup(treeOf(root).removePanel(panelId("z")).toJSON());

      expect(result).toEqual(
        group("root", "horizontal", 100, [a, panel("x", 15), panel("y", 35)]),
      );
      expect(result.children[0]).toBe(a);
    });
  });

  describe("slave references", () => {
    it("clears the slave of a panel pointing to the removed one", () => {
      const root = group("root", "horizontal", 100, [
        panel("a", 30, { slavePanelId: panelId("c") }),
        panel("b", 30),
        panel("c", 40),
      ]);

      const result = treeOf(root).removePanel(panelId("c"));

      expect(result.toJSON()).toStrictEqual(
        group("root", "horizontal", 100, [panel("a", 50), panel("b", 50)]),
      );
    });

    it("also clears it when the tree collapses", () => {
      const root = group("root", "horizontal", 100, [
        panel("a", 50, { slavePanelId: panelId("b") }),
        panel("b", 50),
      ]);

      const result = treeOf(root).removePanel(panelId("b"));

      expect(result.toJSON()).toStrictEqual(panel("a", 100));
    });

    it("keeps the slaves pointing to other panels", () => {
      const root = group("root", "horizontal", 100, [
        panel("a", 30, { slavePanelId: panelId("b") }),
        panel("b", 30),
        panel("c", 40),
      ]);

      const result = asGroup(treeOf(root).removePanel(panelId("c")).toJSON());

      expect(result.children[0]).toMatchObject({ slavePanelId: "panel-b" });
    });
  });

  it("leaves the original tree untouched", () => {
    const { root, tree } = makeTree(); // `root` is deep-frozen
    const result = tree.removePanel(panelId("b"));

    expect(result).not.toBe(tree);
    expect(tree.toJSON()).toBe(root);
  });

  it("undoes a split of the root panel", () => {
    const root = panel("root", 100);
    const tree = treeOf(root);

    const result = tree
      .splitPanel(panelId("root"), "horizontal")
      .removePanel(panelId("1"));

    expect(result.toJSON()).toEqual(root);
  });

  it("returns a tree on which further operations keep working", () => {
    const { tree } = makeTree();

    const result = tree
      .removePanel(panelId("b"))
      .splitPanel(panelId("c"), "vertical");

    expect(result.toJSON()).toEqual(
      group("root", "horizontal", 100, [
        panel("a", 40),
        group("1", "vertical", 60, [panel("c", 50), panel("1", 50)]),
      ]),
    );
  });
});

describe("resizeGroup", () => {
  it("updates the sizes of the listed children", () => {
    const { g, tree } = makeTree();

    const result = tree.resizeGroup(groupId("root"), {
      [panelId("a")]: 70,
      [groupId("g")]: 30,
    });

    expect(result.toJSON()).toEqual(
      group("root", "horizontal", 100, [panel("a", 70), { ...g, size: 30 }]),
    );
  });

  it("keeps the size of the children that are not listed", () => {
    const { g, tree } = makeTree();

    const result = tree.resizeGroup(groupId("root"), { [panelId("a")]: 30 });

    expect(result.toJSON()).toEqual(
      group("root", "horizontal", 100, [panel("a", 30), g]),
    );
  });

  it("does not touch the children of the resized children", () => {
    const { b, c, tree } = makeTree();

    const result = asGroup(
      tree.resizeGroup(groupId("root"), { [groupId("g")]: 30 }).toJSON(),
    );

    expect(asGroup(result.children[1]!).children).toEqual([b, c]);
  });

  it("resizes a nested group, sharing the rest of the tree", () => {
    const { a, tree } = makeTree();

    const result = asGroup(
      tree
        .resizeGroup(groupId("g"), { [panelId("b")]: 80, [panelId("c")]: 20 })
        .toJSON(),
    );

    expect(result).toEqual(
      group("root", "horizontal", 100, [
        a,
        group("g", "vertical", 60, [panel("b", 80), panel("c", 20)]),
      ]),
    );
    expect(result.children[0]).toBe(a);
  });

  describe("when nothing changes", () => {
    it("returns the same tree if the sizes are the current ones", () => {
      const { tree } = makeTree();
      const result = tree.resizeGroup(groupId("root"), {
        [panelId("a")]: 40,
        [groupId("g")]: 60,
      });
      expect(result).toBe(tree);
    });

    it("returns the same tree if no size is given", () => {
      const { tree } = makeTree();
      expect(tree.resizeGroup(groupId("root"), {})).toBe(tree);
    });

    it("ignores ids that are not direct children of the group", () => {
      const { tree } = makeTree();
      const result = tree.resizeGroup(groupId("root"), { [panelId("b")]: 10 });
      expect(result).toBe(tree);
    });
  });

  it("leaves the original tree untouched", () => {
    const { root, tree } = makeTree(); // `root` is deep-frozen
    const result = tree.resizeGroup(groupId("root"), { [panelId("a")]: 70 });

    expect(result).not.toBe(tree);
    expect(tree.toJSON()).toBe(root);
  });

  it("throws if the group does not exist", () => {
    const { tree } = makeTree();
    expect(() => tree.resizeGroup(groupId("zzz"), {})).toThrow(
      IllegalArgumentError,
    );
    expect(() => tree.resizeGroup(groupId("zzz"), {})).toThrow(
      /No group with id "group-zzz"/,
    );
  });

  it("throws if the id belongs to a panel", () => {
    const { tree } = makeTree();
    expect(() => tree.resizeGroup(asGroupId("panel-a"), {})).toThrow(
      /is not a group/,
    );
  });
});

describe("isRoot", () => {
  describe("when the root is a group", () => {
    it("returns true for the root group", () => {
      const { tree } = makeTree();
      expect(tree.isRoot(groupId("root"))).toBe(true);
    });

    it("returns false for a panel that is a direct child of the root", () => {
      const { tree } = makeTree();
      expect(tree.isRoot(panelId("a"))).toBe(false);
    });

    it("returns false for a nested group", () => {
      const { tree } = makeTree();
      expect(tree.isRoot(groupId("g"))).toBe(false);
    });

    it("returns false for a deeply nested panel", () => {
      const { tree } = makeTree();
      expect(tree.isRoot(panelId("b"))).toBe(false);
    });
  });

  describe("when the root is a panel", () => {
    it("returns true for the root panel", () => {
      const tree = treeOf(panel("root", 100));
      expect(tree.isRoot(panelId("root"))).toBe(true);
    });

    it("returns true for the default panel of an empty tree", () => {
      const tree = PanelLayoutTree({ ids: sequentialIds() });
      expect(tree.isRoot(panelId("1"))).toBe(true);
    });
  });

  describe("after modifying the tree", () => {
    it("stops being true for the old root panel once it is split", () => {
      const tree = treeOf(panel("root", 100)).splitPanel(
        panelId("root"),
        "horizontal",
      );

      expect(tree.isRoot(panelId("root"))).toBe(false);
      expect(tree.isRoot(groupId("1"))).toBe(true);
    });

    it("becomes true for the panel that remains after the root group collapses", () => {
      const tree = treeOf(
        group("root", "horizontal", 100, [panel("a", 50), panel("b", 50)]),
      ).removePanel(panelId("b"));

      expect(tree.isRoot(panelId("a"))).toBe(true);
      // the old root group no longer exists in the tree
      expect(() => tree.isRoot(groupId("root"))).toThrow(IllegalArgumentError);
    });

    it("keeps answering true for the same root after a resize", () => {
      const { tree } = makeTree();
      const resized = tree.resizeGroup(groupId("root"), { [panelId("a")]: 70 });

      expect(resized.isRoot(groupId("root"))).toBe(true);
    });
  });

  describe("errors", () => {
    it("throws if the panel is not present in the tree", () => {
      const { tree } = makeTree();
      expect(() => tree.isRoot(panelId("not-in-this-tree"))).toThrow(
        IllegalArgumentError,
      );
      expect(() => tree.isRoot(panelId("not-in-this-tree"))).toThrow(
        /No panel with id "panel-not-in-this-tree"/,
      );
    });

    it("throws if the group is not present in the tree", () => {
      const { tree } = makeTree();
      expect(() => tree.isRoot(groupId("not-in-this-tree"))).toThrow(
        IllegalArgumentError,
      );
      expect(() => tree.isRoot(groupId("not-in-this-tree"))).toThrow(
        /No group with id "group-not-in-this-tree"/,
      );
    });
  });
});
