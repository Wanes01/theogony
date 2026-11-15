import { describe, expect, it } from "vitest";
import type {
  Axis,
  GroupId,
  GroupNode,
  LayoutNode,
  PanelId,
  PanelNode,
  PanelView,
} from "@core/domain/layout/types";
import { IllegalArgumentError } from "@core/errors";
import PanelLayoutTree, {
  type IdGenerators,
  type PanelLayoutTree as Tree,
} from "./PanelLayoutTree";

// helpers
const panel = (
  id: PanelId,
  size = 50,
  view: PanelView = { type: "empty" },
): PanelNode => ({ kind: "panel", id, size, view });

const group = (
  id: GroupId,
  axis: Axis,
  children: LayoutNode[],
  size = 100,
): GroupNode => ({ kind: "group", id, axis, size, children });

/** Predictable ids for the nodes created by a tree: `panel-new-1`, `group-new-1`, and so on */
const sequentialIds = (): IdGenerators => {
  let panels = 0;
  let groups = 0;
  return {
    newPanelId: () => `panel-new-${++panels}`,
    newGroupId: () => `group-new-${++groups}`,
  };
};

/**
 * Freezes a node and everything under it: any attempt to modify it throws
 * (ES modules are strict), so the tests also check that nothing is mutated.
 */
function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

/** Builds a tree over `root` (frozen, so any mutation throws) with predictable ids. */
const treeOf = (root: LayoutNode): Tree =>
  PanelLayoutTree({ root: deepFreeze(root), ids: sequentialIds() });

function asGroup(node: LayoutNode | undefined): GroupNode {
  if (node?.kind !== "group") throw new Error("Expected a group node");
  return node;
}

const allIds = (node: LayoutNode): string[] =>
  node.kind === "panel"
    ? [node.id]
    : [node.id, ...node.children.flatMap(allIds)];

// tests
describe("PanelLayoutTree", () => {
  describe("factory", () => {
    it("starts from a single empty panel when no root is given", () => {
      const root = PanelLayoutTree({ ids: sequentialIds() }).toJSON();
      expect(root).toEqual({
        kind: "panel",
        id: "panel-new-1",
        size: 100,
        view: { type: "empty" },
      });
    });

    it("uses the given root as it is", () => {
      const root = panel("panel-a", 100);
      expect(treeOf(root).toJSON()).toBe(root);
    });

    it("generates real ids when no generators are given", () => {
      expect(PanelLayoutTree().toJSON().id).toMatch(/^panel-.+/);
    });
  });

  describe("splitPanel", () => {
    describe("when the panel is the root", () => {
      const view: PanelView = { type: "document", documentId: "doc-1" };

      it.each([
        [undefined, "horizontal"],
        ["horizontal", "horizontal"],
        ["vertical", "vertical"],
      ] as const)(
        "wraps it in a group with rootGroupAxis %s (axis: %s)",
        (rootGroupAxis, expectedAxis) => {
          const root = panel("panel-a", 100, view);
          const next = asGroup(
            treeOf(root).splitPanel("panel-a", rootGroupAxis).toJSON(),
          );

          expect(next).toMatchObject({
            kind: "group",
            id: "group-new-1",
            axis: expectedAxis,
            size: 100,
          });
          expect(next.children.map((c) => c.id)).toEqual([
            "panel-a",
            "panel-new-1",
          ]);
          expect(next.children.map((c) => c.size)).toEqual([50, 50]);
        },
      );

      it("keeps the view of the split panel and gives the new one an empty view", () => {
        const next = asGroup(
          treeOf(panel("panel-a", 100, view))
            .splitPanel("panel-a")
            .toJSON(),
        );
        expect(next.children[0]).toMatchObject({ id: "panel-a", view });
        expect(next.children[1]).toMatchObject({
          id: "panel-new-1",
          view: { type: "empty" },
        });
      });

      it("keeps the other properties of the split panel, such as its link", () => {
        const root: PanelNode = {
          ...panel("panel-a", 100),
          slavePanelId: "panel-b",
        };
        const next = asGroup(treeOf(root).splitPanel("panel-a").toJSON());
        expect(next.children[0]).toMatchObject({
          id: "panel-a",
          slavePanelId: "panel-b",
        });
      });
    });

    describe("when the panel is inside a group", () => {
      it.each([
        ["horizontal", "vertical"],
        ["vertical", "horizontal"],
      ] as const)(
        "in a %s group it creates a %s group in place of the panel",
        (parentAxis, expectedAxis) => {
          const a = panel("panel-a", 30);
          const b = panel("panel-b", 70);
          const next = asGroup(
            treeOf(group("group-r", parentAxis, [a, b]))
              .splitPanel("panel-a")
              .toJSON(),
          );

          expect(next.id).toBe("group-r");
          const created = asGroup(next.children[0]);
          expect(created).toMatchObject({
            id: "group-new-1",
            axis: expectedAxis,
            size: 30,
          });
          expect(created.children.map((c) => c.id)).toEqual([
            "panel-a",
            "panel-new-1",
          ]);
          expect(next.children[1]).toBe(b);
        },
      );

      it("ignores rootGroupAxis", () => {
        const root = group("group-r", "horizontal", [
          panel("panel-a"),
          panel("panel-b"),
        ]);
        const next = asGroup(
          treeOf(root).splitPanel("panel-a", "horizontal").toJSON(),
        );
        expect(asGroup(next.children[0]).axis).toBe("vertical");
      });

      it("rebuilds only the ancestors and shares every other branch", () => {
        const sibling = panel("panel-s1");
        const cousin = panel("panel-s2");
        const inner = group("group-i", "vertical", [
          panel("panel-leaf"),
          cousin,
        ]);
        const root = group("group-r", "horizontal", [sibling, inner]);

        const next = asGroup(treeOf(root).splitPanel("panel-leaf").toJSON());
        const nextInner = asGroup(next.children[1]);

        expect(next).not.toBe(root);
        expect(nextInner).not.toBe(inner);
        expect([next.id, nextInner.id]).toEqual(["group-r", "group-i"]);
        expect(next.children[0]).toBe(sibling);
        expect(nextInner.children[1]).toBe(cousin);
      });
    });

    it("generates unique ids across consecutive splits", () => {
      const tree = treeOf(panel("panel-a", 100))
        .splitPanel("panel-a")
        .splitPanel("panel-new-1")
        .splitPanel("panel-new-2");

      const ids = allIds(tree.toJSON());
      expect(ids).toHaveLength(7); // 4 panels and 3 groups
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("throws IllegalArgumentError if the panel does not exist", () => {
      const tree = treeOf(
        group("group-r", "horizontal", [panel("panel-a"), panel("panel-b")]),
      );
      expect(() => tree.splitPanel("panel-zzz")).toThrow(IllegalArgumentError);
      expect(() => tree.splitPanel("panel-zzz")).toThrow(/panel-zzz/);
    });

    it("throws IllegalArgumentError if the id belongs to a group", () => {
      const tree = treeOf(
        group("group-r", "horizontal", [panel("panel-a"), panel("panel-b")]),
      );
      expect(() => tree.splitPanel("group-r" as PanelId)).toThrow(
        IllegalArgumentError,
      );
    });
  });

  describe("addPanelToGroup", () => {
    const a = panel("panel-a");
    const b = panel("panel-b");
    const tree = () => treeOf(group("group-r", "horizontal", [a, b]));
    const childrenIds = (t: Tree) =>
      asGroup(t.toJSON()).children.map((c) => c.id);

    it("appends an empty panel with a generated id by default", () => {
      const next = asGroup(tree().addPanelToGroup("group-r").toJSON());
      expect(next.children.map((c) => c.id)).toEqual([
        "panel-a",
        "panel-b",
        "panel-new-1",
      ]);
      expect(next.children[2]).toMatchObject({
        kind: "panel",
        view: { type: "empty" },
      });
    });

    it("uses the given id and view", () => {
      const view: PanelView = { type: "gallery" };
      const next = asGroup(
        tree().addPanelToGroup("group-r", "panel-x", undefined, view).toJSON(),
      );
      expect(next.children[2]).toMatchObject({ id: "panel-x", view });
    });

    it.each([
      [0, ["panel-x", "panel-a", "panel-b"]],
      [1, ["panel-a", "panel-x", "panel-b"]],
      [2, ["panel-a", "panel-b", "panel-x"]], // index === children.length appends
    ])("inserts at index %i", (index, expected) => {
      expect(
        childrenIds(tree().addPanelToGroup("group-r", "panel-x", index)),
      ).toEqual(expected);
    });

    it("works on a nested group, rebuilding only the ancestors", () => {
      const sibling = panel("panel-s");
      const inner = group("group-i", "vertical", [panel("panel-c")]);
      const root = group("group-r", "horizontal", [sibling, inner]);

      const next = asGroup(treeOf(root).addPanelToGroup("group-i").toJSON());
      const nextInner = asGroup(next.children[1]);

      expect(next.children[0]).toBe(sibling);
      expect(nextInner.id).toBe("group-i");
      expect(nextInner.children.map((c) => c.id)).toEqual([
        "panel-c",
        "panel-new-1",
      ]);
    });

    it("does not modify the tree and shares the other children", () => {
      const original = tree(); // the root is frozen: a mutation would throw
      const next = original.addPanelToGroup("group-r");

      expect(next).not.toBe(original);
      expect(asGroup(original.toJSON()).children).toHaveLength(2);
      const nextChildren = asGroup(next.toJSON()).children;
      expect(nextChildren[0]).toBe(a);
      expect(nextChildren[1]).toBe(b);
    });

    it("throws IllegalArgumentError if the group does not exist", () => {
      expect(() => tree().addPanelToGroup("group-zzz")).toThrow(
        IllegalArgumentError,
      );
      expect(() => tree().addPanelToGroup("group-zzz")).toThrow(/group-zzz/);
    });

    it("throws IllegalArgumentError if the id belongs to a panel", () => {
      expect(() => tree().addPanelToGroup("panel-a" as GroupId)).toThrow(
        IllegalArgumentError,
      );
    });

    it.each([-1, 3, 0.5, NaN])(
      "throws IllegalArgumentError on the illegal index %s",
      (index) => {
        expect(() =>
          tree().addPanelToGroup("group-r", undefined, index),
        ).toThrow(IllegalArgumentError);
      },
    );

    it("throws IllegalArgumentError if a node with the given id already exists", () => {
      expect(() => tree().addPanelToGroup("group-r", "panel-a")).toThrow(
        IllegalArgumentError,
      );
    });
  });
});
