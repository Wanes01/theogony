import type { PopoverPosition } from "./usePopover";

interface Size {
  width: number;
  height: number;
}

/** moves the requested point so that a menu of the given size stays inside the viewport */
export function clampToViewport(
  point: PopoverPosition,
  menu: Size,
  viewport: Size,
): PopoverPosition {
  return {
    x: Math.max(0, Math.min(point.x, viewport.width - menu.width)),
    y: Math.max(0, Math.min(point.y, viewport.height - menu.height)),
  };
}
