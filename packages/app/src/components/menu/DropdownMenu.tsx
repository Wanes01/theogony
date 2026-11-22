import { useLayoutEffect, useRef, useState } from "react";
import type { MenuAction } from "./types";
import type { PopoverPosition } from "./usePopover";
import { clampToViewport } from "./clampToViewport";

type DropdownMenuProps = {
  open: boolean;
  onClose: () => void;
  actions: MenuAction[];
  position?: PopoverPosition | null;
  className?: string;
};

export default function DropdownMenu({
  open,
  onClose,
  actions,
  position,
  className = "",
}: DropdownMenuProps) {
  const menuRef = useRef<HTMLUListElement>(null);
  const [placed, setPlaced] = useState<PopoverPosition | null>(null);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!open || !position || !menu) return;
    const { width, height } = menu.getBoundingClientRect();
    setPlaced(
      clampToViewport(
        position,
        { width, height },
        { width: window.innerWidth, height: window.innerHeight },
      ),
    );
  }, [open, position]);

  if (!open) return null;

  const placement = position ? "fixed" : "absolute left-0 top-full";
  const coords = position ? (placed ?? position) : null;

  return (
    <ul
      ref={menuRef}
      style={coords ? { left: coords.x, top: coords.y } : undefined}
      onContextMenu={(e) => e.preventDefault()}
      className={`${placement} z-50 w-max min-w-40 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white shadow-lg ${className}`}
    >
      {actions.map((action) => (
        <li key={action.label}>
          <button
            type="button"
            onClick={() => {
              action.onClick();
              onClose();
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
          >
            {action.label}
          </button>
        </li>
      ))}
    </ul>
  );
}
