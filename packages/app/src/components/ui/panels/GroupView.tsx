import { Fragment } from "react";
import {
  Group as RRPGroup,
  Panel as RRPPanel,
  type Layout,
} from "react-resizable-panels";
import type { GroupNode } from "@core/domain/layout/types";
import { LayoutNodeView } from "@components/ui/panels/LayoutNodeView";
import { useLayoutActions } from "@components/ui/panels/PanelLayout";
import { ResizeHandle } from "@components/ui/panels/ResizeHandle";

interface GroupViewProps {
  readonly group: GroupNode;
}

/** Renders a group of LayoutNode, all in the same axis */
export function GroupView({ group }: GroupViewProps) {
  const { resizeGroup } = useLayoutActions();

  return (
    <RRPGroup
      id={group.id}
      orientation={group.axis}
      onLayoutChanged={(layout: Layout) => resizeGroup(group.id, layout)}
    >
      {group.children.map((child, i) => (
        <Fragment key={child.id}>
          {i > 0 && <ResizeHandle axis={group.axis} />}
          <RRPPanel id={child.id} defaultSize={child.size} minSize={10}>
            <LayoutNodeView node={child} />
          </RRPPanel>
        </Fragment>
      ))}
    </RRPGroup>
  );
}
