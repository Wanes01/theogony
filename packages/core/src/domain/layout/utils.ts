import type {
  Axis,
  GroupNode,
  PanelNode,
  PanelView,
} from "@core/domain/layout/types";
import { IllegalArgumentError } from "@core/errors";
import { newGroupId, newPanelId } from "@core/ids";

/** Returns a new empty `PanelNode` of optional `size` (defaults to 100). */
export const emptyPanel = (size: number = 100): PanelNode => {
  throwOnIllegalSize(size);
  return {
    kind: "panel",
    id: newPanelId(),
    size,
    view: { type: "empty" },
  };
};

/**
 * @throws `IllegalArgumentError` on a size outside the range [0, 100]
 */
export const throwOnIllegalSize = (size: number) => {
  if (size < 0) {
    throw new IllegalArgumentError(`${size} cannot be negative`);
  } else if (size > 100) {
    throw new IllegalArgumentError(`${size} cannot be greater than 100%`);
  }
};

type Position = "before" | "after";
const NEW_PANEL_DEFAULT_SIZE = 50;

/**
 * Generates a new `GroupNode`.
 *
 * @param axis the axis that the new group must follow.
 * @param groupSize the size of the new group respect to its father.
 * @param oldPanel the `PanelNode` that got split to generate this group.
 * @param newPanelPosition where the new panel must be inserted respect to the `oldPanel`; default to `after`.
 * @param newPanelView the `PanelView` used to populate the new panel; default to an empty one.
 * @returns a new `GroupNode` with the old and newly created panel, in the specified order.
 * @throws `IllegalArgumentException` if `groupSize` is outside the interval [0, 100].
 */
export const generateGroup = (
  axis: Axis,
  groupSize: number,
  oldPanel: PanelNode,
  newPanelPosition: Position = "after",
  newPanelView?: PanelView,
): GroupNode => {
  throwOnIllegalSize(groupSize);
  const newPanel: PanelNode = newPanelView
    ? {
        kind: "panel",
        id: newPanelId(),
        view: newPanelView,
        size: NEW_PANEL_DEFAULT_SIZE,
      }
    : emptyPanel(NEW_PANEL_DEFAULT_SIZE);
  const updatedOldPanel: PanelNode = {
    ...oldPanel,
    size: 100 - NEW_PANEL_DEFAULT_SIZE,
  };
  const children: PanelNode[] =
    newPanelPosition === "before"
      ? [newPanel, updatedOldPanel]
      : [updatedOldPanel, newPanel];
  return {
    kind: "group",
    id: newGroupId(),
    axis,
    size: groupSize,
    children,
  };
};
