import type { GroupNode } from "@core/domain/layout/types";
import { LayoutNodeView } from "@components/ui/panels/LayoutNodeView";

interface GroupViewProps {
  readonly group: GroupNode;
}

/** Renders a group of LayoutNode, all in the same axis */
export function GroupView({ group }: GroupViewProps) {
  const direction = group.axis === "horizontal" ? "flex-row" : "flex-col";

  return (
    <div className={`flex h-full w-full ${direction}`}>
      {group.children.map((child) => (
        <div
          key={child.id}
          className="min-h-0 min-w-0"
          style={{ flexBasis: `${child.size}%` }}
        >
          <LayoutNodeView node={child} />
        </div>
      ))}
    </div>
  );
}
