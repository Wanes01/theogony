import { memo } from "react";
import type { LayoutNode } from "@core/domain/layout/types";
import { GroupView } from "./GroupView";
import { PanelContainer } from "./PanelContainer";

interface LayoutNodeViewProps {
  node: LayoutNode;
}

/** A general representation of a single panel or a group of panels */
export const LayoutNodeView = memo(function LayoutNodeView({
  node,
}: LayoutNodeViewProps) {
  return node.kind === "group" ? (
    <GroupView group={node} />
  ) : (
    <PanelContainer panel={node} />
  );
});
