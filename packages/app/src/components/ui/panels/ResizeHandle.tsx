import { Separator as RRPSeparator } from "react-resizable-panels";
import type { Axis } from "@core/domain/layout/types";

interface ResizeHandleProps {
  /** The axis of the group that contains the handle. */
  readonly axis: Axis;
}

/** The draggable separator between two panels of the same group */
export function ResizeHandle({ axis }: ResizeHandleProps) {
  // axis "horizontal" = panels side by side, so the separator is a vertical bar
  const isRow = axis === "horizontal";

  return (
    <RRPSeparator
      className={[
        "group relative flex shrink-0 items-center justify-center",
        "rounded-full outline-none",
        "focus-visible:ring-2 focus-visible:ring-sky-300",
        isRow ? "w-3 cursor-col-resize" : "h-3 cursor-row-resize",
      ].join(" ")}
    >
      {/* grip: a small pill that grows and changes color on hover/drag */}
      <div
        className={[
          "rounded-full bg-slate-300 transition-all duration-150",
          "group-hover:bg-sky-300 group-data-[separator=active]:bg-sky-400",
          isRow
            ? "h-8 w-1 group-hover:h-12 group-data-[separator=active]:h-12"
            : "h-1 w-8 group-hover:w-12 group-data-[separator=active]:w-12",
        ].join(" ")}
      />
    </RRPSeparator>
  );
}
