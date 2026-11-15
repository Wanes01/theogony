import type { PanelNode } from "@core/domain/layout/types";
import { IllegalArgumentError } from "@core/errors";
import { newPanelId } from "@core/ids";

/** Returns a new and empty `PanelNode` */
export function emptyPanel(size: number = 100): PanelNode {
  throwOnIllegalSize(size);
  return {
    kind: "panel",
    id: newPanelId(),
    size,
    view: { type: "empty" },
  };
}

export function throwOnIllegalSize(size: number) {
  if (size < 0) {
    throw new IllegalArgumentError(`${size} cannot be negative`);
  } else if (size > 100) {
    throw new IllegalArgumentError(`${size} cannot be greater than 100%`);
  }
}
