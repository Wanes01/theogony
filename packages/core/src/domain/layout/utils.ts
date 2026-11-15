import type { PanelId, PanelNode } from "@core/domain/layout/types";
import { IllegalArgumentError } from "@core/errors";
import { newPanelId } from "@core/ids";

/**
 * @throws `IllegalArgumentError` if `size` is not a finite number in the range (0, 100].
 */
export const throwOnIllegalSize = (size: number): void => {
  if (!Number.isFinite(size) || size <= 0 || size > 100) {
    throw new IllegalArgumentError(
      `Size must be a number in the range (0, 100], got ${size}`,
    );
  }
};

/**
 * Returns a new empty `PanelNode`.
 * @param size the size of the panel; defaults to 100.
 * @param id the id of the panel; defaults to a newly generated one.
 * @throws `IllegalArgumentError` on an illegal `size`.
 */
export const emptyPanel = (
  size: number = 100,
  id: PanelId = newPanelId(),
): PanelNode => {
  throwOnIllegalSize(size);
  return { kind: "panel", id, size, view: { type: "empty" } };
};
