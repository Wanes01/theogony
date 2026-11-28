import { describe, expect, it, vi } from "vitest";
import type {
  Axis,
  GroupNode,
  LayoutNode,
  PanelNode,
} from "@core/domain/layout/types";
import { IllegalArgumentError } from "@core/errors";
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
  throwOnIllegalSize,
  type NodeLocation,
} from "@core/domain/layout/utils";

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

const asGroup = (node: LayoutNode): GroupNode => {
  if (node.kind !== "group")
    throw new Error(`Expected a group, got "${node.id}"`);
  return node;
};

/**
 * Freezes a value and everything it contains: any in-place mutation done by a
 * function under test throws a `TypeError` (ES modules run in strict mode).
 */
function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

/**
 * root (horizontal, 100)
 * - a (40)
 * - g (vertical, 60)
 *    - b (50)
 *    - c (50)
 */
function makeTree() {
  const a = panel("a", 40);
  const b = panel("b", 50);
  const c = panel("c", 50);
  const g = group("g", "vertical", 60, [b, c]);
  const root = deepFreeze(group("root", "horizontal", 100, [a, g]));
  return { a, b, c, g, root };
}

describe("throwOnIllegalSize", () => {
  it.each([0.001, 1, 50, 99.9, 100])("accepts %s", (size) => {
    expect(() => throwOnIllegalSize(size)).not.toThrow();
  });

  it.each([0, -1, 100.0001, 101, NaN, Infinity, -Infinity])(
    "rejects %s",
    (size) => {
      expect(() => throwOnIllegalSize(size)).toThrow(IllegalArgumentError);
    },
  );

  it("mentions the valid range and the received value in the message", () => {
    expect(() => throwOnIllegalSize(150)).toThrow(/\(0, 100\].*150/);
  });
});

describe("emptyPanel", () => {
  it("creates a full-size empty panel by default", () => {
    const p = emptyPanel();
    expect(p).toMatchObject({
      kind: "panel",
      size: 100,
      view: { type: "empty" },
    });
  });

  it("generates a panel id by default, different at every call", () => {
    const first = emptyPanel();
    const second = emptyPanel();
    expect(first.id).toMatch(/^panel-.+/);
    expect(first.id).not.toBe(second.id);
  });

  it("uses the given size and id", () => {
    expect(emptyPanel(30, "panel-x")).toEqual(panel("x", 30));
  });

  it.each([0, -5, 101, NaN])("throws on illegal size %s", (size) => {
    expect(() => emptyPanel(size)).toThrow(IllegalArgumentError);
  });
});

describe("parentOf", () => {
  it("returns undefined for the root", () => {
    const { root } = makeTree();
    expect(parentOf({ node: root, ancestors: [] })).toBeUndefined();
  });

  it("returns the root as parent of its direct children", () => {
    const { a, root } = makeTree();
    const parent = parentOf({ node: a, ancestors: [root] });
    expect(parent?.node).toBe(root);
    expect(parent?.ancestors).toEqual([]);
  });

  it("drops the parent from the ancestors of a deep node", () => {
    const { b, g, root } = makeTree();
    const parent = parentOf({ node: b, ancestors: [root, g] });
    expect(parent?.node).toBe(g);
    expect(parent?.ancestors).toHaveLength(1);
    expect(parent?.ancestors[0]).toBe(root);
  });

  it("does not modify the ancestors of the original location", () => {
    const { b, g, root } = makeTree();
    const location: NodeLocation = { node: b, ancestors: [root, g] };
    parentOf(location);
    expect(location.ancestors).toHaveLength(2);
  });
});

describe("replaceChild", () => {
  it("swaps a child with a single replacement, keeping the order", () => {
    const { b, c, g } = makeTree();
    const x = panel("x", 50);
    expect(replaceChild(g, b, x).children).toEqual([x, c]);
  });

  it("removes the child when there are no replacements", () => {
    const { c, b, g } = makeTree();
    expect(replaceChild(g, b).children).toEqual([c]);
  });

  it("inserts several nodes in place of the child", () => {
    const { b, c, g } = makeTree();
    const x = panel("x", 25);
    const y = panel("y", 25);
    expect(replaceChild(g, b, x, y).children).toEqual([x, y, c]);
  });

  it("keeps the other properties of the group", () => {
    const { b, g } = makeTree();
    const updated = replaceChild(g, b, panel("x", 50));
    expect(updated).toMatchObject({ id: g.id, axis: g.axis, size: g.size });
  });

  it("keeps the identity of the untouched children", () => {
    const { b, c, g } = makeTree();
    expect(replaceChild(g, b, panel("x", 50)).children[1]).toBe(c);
  });

  it("matches children by reference, not by value", () => {
    const { b, c, g } = makeTree();
    const lookalike = { ...b };
    expect(replaceChild(g, lookalike, panel("x", 50)).children).toEqual([b, c]);
  });

  it("does not modify the original group", () => {
    const { b, g, root } = makeTree();
    replaceChild(g, b); // `root` is deep-frozen: a mutation would throw
    expect(root.children).toHaveLength(2);
    expect(g.children).toHaveLength(2);
  });
});

describe("replaceNode", () => {
  it("returns the replacement when the node is the root", () => {
    const { root } = makeTree();
    const replacement = panel("new", 100);
    expect(replaceNode({ node: root, ancestors: [] }, replacement)).toBe(
      replacement,
    );
  });

  it("replaces a direct child of the root", () => {
    const { a, g, root } = makeTree();
    const x = panel("x", 40);
    expect(replaceNode({ node: a, ancestors: [root] }, x)).toEqual(
      group("root", "horizontal", 100, [x, g]),
    );
  });

  it("replaces a deep node and rebuilds every ancestor", () => {
    const { a, b, c, g, root } = makeTree();
    const x = panel("x", 50);
    expect(replaceNode({ node: b, ancestors: [root, g] }, x)).toEqual(
      group("root", "horizontal", 100, [a, group("g", "vertical", 60, [x, c])]),
    );
  });

  it("shares the branches outside the modified path", () => {
    const { a, b, c, g, root } = makeTree();
    const result = asGroup(
      replaceNode({ node: b, ancestors: [root, g] }, panel("x", 50)),
    );
    const newG = asGroup(result.children[1]!);

    expect(result).not.toBe(root);
    expect(newG).not.toBe(g);
    expect(result.children[0]).toBe(a);
    expect(newG.children[1]).toBe(c);
  });

  it("can replace a group", () => {
    const { a, g, root } = makeTree();
    const x = panel("x", 60);
    expect(replaceNode({ node: g, ancestors: [root] }, x)).toEqual(
      group("root", "horizontal", 100, [a, x]),
    );
  });
});

describe("collapseGroup", () => {
  it("promotes a panel to the root, giving it the group's size", () => {
    const remaining = panel("a", 50);
    const root = group("root", "horizontal", 100, [
      remaining,
      panel("gone", 50),
    ]);

    const result = collapseGroup({ node: root, ancestors: [] }, remaining);

    expect(result).toEqual({ ...remaining, size: 100 });
  });

  it("promotes a nested panel in place of its group", () => {
    const a = panel("a", 40);
    const remaining = panel("b", 50);
    const g = group("g", "vertical", 60, [remaining, panel("gone", 50)]);
    const root = deepFreeze(group("root", "horizontal", 100, [a, g]));

    const result = collapseGroup({ node: g, ancestors: [root] }, remaining);

    expect(result).toEqual(
      group("root", "horizontal", 100, [a, { ...remaining, size: 60 }]),
    );
  });

  it("keeps the other properties of the promoted child", () => {
    const remaining = panel("b", 100, {
      view: { type: "gallery" },
      slavePanelId: "panel-z",
    });
    const g = group("g", "vertical", 60, [remaining, panel("gone", 50)]);
    const root = group("root", "horizontal", 100, [panel("a", 40), g]);

    const result = asGroup(
      collapseGroup({ node: g, ancestors: [root] }, remaining),
    );

    expect(result.children[1]).toEqual({ ...remaining, size: 60 });
  });

  it("promotes a group to the root when the collapsing group has no parent", () => {
    const remaining = group("h", "vertical", 50, [
      panel("x", 50),
      panel("y", 50),
    ]);
    const root = group("root", "horizontal", 80, [
      remaining,
      panel("gone", 50),
    ]);

    const result = collapseGroup({ node: root, ancestors: [] }, remaining);

    expect(result).toEqual({ ...remaining, size: 80 });
  });

  it("keeps the child group when its axis differs from the grandparent's", () => {
    // Not reachable in a tree whose axes alternate, but the behaviour is defined.
    const x = panel("x", 50);
    const y = panel("y", 50);
    const remaining = group("v", "vertical", 100, [x, y]);
    const g = group("g", "vertical", 60, [remaining, panel("gone", 50)]);
    const a = panel("a", 40);
    const root = deepFreeze(group("root", "horizontal", 100, [a, g]));

    const result = collapseGroup({ node: g, ancestors: [root] }, remaining);

    expect(result).toEqual(
      group("root", "horizontal", 100, [a, { ...remaining, size: 60 }]),
    );
  });

  it("merges a same-axis child group into the grandparent, rescaling its children", () => {
    const a = panel("a", 50);
    const x = panel("x", 30);
    const y = panel("y", 70);
    const remaining = group("h", "horizontal", 100, [x, y]);
    const g = group("g", "vertical", 50, [remaining, panel("gone", 50)]);
    const root = deepFreeze(group("root", "horizontal", 100, [a, g]));

    const result = collapseGroup({ node: g, ancestors: [root] }, remaining);

    expect(result).toEqual(
      group("root", "horizontal", 100, [
        a,
        { ...x, size: 15 },
        { ...y, size: 35 },
      ]),
    );
  });

  it("rescales the merged children by their actual sum, not by 100", () => {
    const x = panel("x", 20);
    const y = panel("y", 20);
    const remaining = group("h", "horizontal", 100, [x, y]);
    const g = group("g", "vertical", 50, [remaining, panel("gone", 50)]);
    const root = deepFreeze(
      group("root", "horizontal", 100, [panel("a", 50), g]),
    );

    const result = asGroup(
      collapseGroup({ node: g, ancestors: [root] }, remaining),
    );

    expect(result.children.map((c) => c.size)).toEqual([50, 25, 25]);
  });

  it("merges into a grandparent that is not the root, sharing the rest of the tree", () => {
    const top = panel("top", 50);
    const p = panel("p", 40);
    const x = panel("x", 50);
    const y = panel("y", 50);
    const remaining = group("h", "horizontal", 100, [x, y]);
    const g = group("g", "vertical", 60, [remaining, panel("gone", 50)]);
    const mid = group("mid", "horizontal", 50, [p, g]);
    const root = deepFreeze(group("root", "vertical", 100, [top, mid]));

    const result = collapseGroup(
      { node: g, ancestors: [root, mid] },
      remaining,
    );

    expect(result).toEqual(
      group("root", "vertical", 100, [
        top,
        group("mid", "horizontal", 50, [
          p,
          { ...x, size: 30 },
          { ...y, size: 30 },
        ]),
      ]),
    );
    expect(asGroup(result).children[0]).toBe(top);
  });
});

describe("clearSlaveReferences", () => {
  it("returns the same panel if it has no slave", () => {
    const p = panel("a", 100);
    expect(clearSlaveReferences(p, "panel-b")).toBe(p);
  });

  it("returns the same panel if its slave is another one", () => {
    const p = panel("a", 100, { slavePanelId: "panel-c" });
    expect(clearSlaveReferences(p, "panel-b")).toBe(p);
  });

  it("removes the slavePanelId key from a panel pointing to the removed one", () => {
    const p = panel("a", 100, {
      slavePanelId: "panel-b",
      view: { type: "graph" },
    });

    const result = clearSlaveReferences(p, "panel-b");

    expect(result).toStrictEqual(panel("a", 100, { view: { type: "graph" } }));
    expect("slavePanelId" in result).toBe(false);
  });

  it("clears every reference in the tree", () => {
    const root = deepFreeze(
      group("root", "horizontal", 100, [
        panel("a", 40, { slavePanelId: "panel-b" }),
        group("g", "vertical", 60, [
          panel("b", 50),
          panel("c", 50, { slavePanelId: "panel-b" }),
        ]),
      ]),
    );

    expect(clearSlaveReferences(root, "panel-b")).toStrictEqual(
      group("root", "horizontal", 100, [
        panel("a", 40),
        group("g", "vertical", 60, [panel("b", 50), panel("c", 50)]),
      ]),
    );
  });

  it("keeps references to other panels", () => {
    const root = group("root", "horizontal", 100, [
      panel("a", 50, { slavePanelId: "panel-b" }),
      panel("b", 50, { slavePanelId: "panel-a" }),
    ]);

    const result = asGroup(clearSlaveReferences(root, "panel-b"));

    expect(result.children[1]).toBe(root.children[1]);
    expect(result.children[0]).toStrictEqual(panel("a", 50));
  });

  it("returns the same root when nothing changes", () => {
    const { root } = makeTree();
    expect(clearSlaveReferences(root, "panel-zzz")).toBe(root);
  });

  it("shares the branches that did not change", () => {
    const g1 = group("g1", "vertical", 50, [
      panel("a", 50, { slavePanelId: "panel-x" }),
      panel("b", 50),
    ]);
    const g2 = group("g2", "vertical", 50, [panel("c", 50), panel("d", 50)]);
    const root = deepFreeze(group("root", "horizontal", 100, [g1, g2]));

    const result = asGroup(clearSlaveReferences(root, "panel-x"));

    expect(result).not.toBe(root);
    expect(result.children[0]).not.toBe(g1);
    expect(result.children[1]).toBe(g2);
  });
});

describe("mapShared", () => {
  it("returns the same array when every element is unchanged", () => {
    const items = [1, 2, 3];
    expect(mapShared(items, (x) => x)).toBe(items);
  });

  it("returns the same array when it is empty", () => {
    const items: number[] = [];
    expect(mapShared(items, (x) => x)).toBe(items);
  });

  it("returns a new array when at least one element changes", () => {
    const items = [1, 2, 3];
    const result = mapShared(items, (x) => (x === 2 ? 20 : x));
    expect(result).not.toBe(items);
    expect(result).toEqual([1, 20, 3]);
  });

  it("keeps the identity of the unchanged elements", () => {
    const a = { id: 1 };
    const b = { id: 2 };
    const result = mapShared([a, b], (item) => (item === b ? { id: 3 } : item));
    expect(result[0]).toBe(a);
  });

  it("calls the function once per element", () => {
    const fn = vi.fn((x: number) => x);
    mapShared([1, 2, 3], fn);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not modify the original array", () => {
    const items = Object.freeze([1, 2, 3]) as number[];
    expect(() => mapShared(items, (x) => x * 2)).not.toThrow();
    expect(items).toEqual([1, 2, 3]);
  });
});

describe("sumSizes", () => {
  it("returns 0 for no nodes", () => {
    expect(sumSizes([])).toBe(0);
  });

  it("sums the sizes of the given nodes", () => {
    expect(sumSizes([panel("a", 20), panel("b", 30), panel("c", 50)])).toBe(
      100,
    );
  });

  it("uses the size of a group, not the size of its children", () => {
    const g = group("g", "vertical", 40, [panel("a", 50), panel("b", 50)]);
    expect(sumSizes([g, panel("c", 10)])).toBe(50);
  });
});

describe("fitSizes", () => {
  it("returns an empty array for no nodes", () => {
    expect(fitSizes([], 100)).toEqual([]);
  });

  it("scales the sizes keeping their proportions", () => {
    const result = fitSizes(
      [panel("a", 20), panel("b", 30), panel("c", 50)],
      50,
    );
    expect(result.map((n) => n.size)).toEqual([10, 15, 25]);
  });

  it("scales up as well as down", () => {
    const result = fitSizes([panel("a", 10), panel("b", 30)], 100);
    expect(result.map((n) => n.size)).toEqual([25, 75]);
  });

  it("keeps the sizes when they already add up to the total", () => {
    const result = fitSizes([panel("a", 40), panel("b", 60)], 100);
    expect(result.map((n) => n.size)).toEqual([40, 60]);
  });

  it("makes the sizes add up to the total even with awkward numbers", () => {
    const result = fitSizes(
      [panel("a", 33), panel("b", 33), panel("c", 34)],
      70,
    );
    expect(sumSizes(result)).toBeCloseTo(70, 10);
  });

  it("splits the total equally when every size is zero", () => {
    const result = fitSizes(
      [panel("a", 0), panel("b", 0), panel("c", 0), panel("d", 0)],
      100,
    );
    expect(result.map((n) => n.size)).toEqual([25, 25, 25, 25]);
  });

  it("keeps a zero-sized node at zero when the others are not", () => {
    const result = fitSizes([panel("a", 0), panel("b", 100)], 50);
    expect(result.map((n) => n.size)).toEqual([0, 50]);
  });

  it("keeps every other property of the nodes", () => {
    const p = panel("a", 20, {
      view: { type: "timeline" },
      slavePanelId: "panel-b",
    });
    const [result] = fitSizes([p], 100);
    expect(result).toEqual({ ...p, size: 100 });
  });

  it("only rescales the nodes themselves, not the children of a group", () => {
    const g = group("g", "vertical", 25, [panel("a", 50), panel("b", 50)]);
    const [result] = fitSizes([g, panel("c", 75)], 50);
    expect(result).toEqual({ ...g, size: 12.5 });
  });

  it("does not modify the original nodes", () => {
    const nodes = deepFreeze([panel("a", 20), panel("b", 30)]);
    expect(() => fitSizes(nodes, 100)).not.toThrow();
    expect(nodes.map((n) => n.size)).toEqual([20, 30]);
  });
});
