import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import PanelLayoutTree from "@core/domain/layout/PanelLayoutTree";
import type { Axis, GroupId, PanelId } from "@core/domain/layout/types";
import { LayoutNodeView } from "./LayoutNodeView";

/** actions that can be performed on a LayoutNode */
interface LayoutActions {
  split(id: PanelId, axis: Axis): void;
  resizeGroup(
    groupId: GroupId,
    sizes: Readonly<Record<PanelId | GroupId, number>>,
  ): void;
  deletePanel(id: PanelId): void;
}

const LayoutActionsContext = createContext<LayoutActions | null>(null);

export function useLayoutActions(): LayoutActions {
  const ctx = useContext(LayoutActionsContext);
  if (!ctx)
    throw new Error("useLayoutActions must be used inside a <PanelLayout>");
  return ctx;
}

export default function PanelLayout() {
  const [tree, setTree] = useState(() => PanelLayoutTree());

  const split = useCallback(
    (id: PanelId, axis: Axis) => setTree((t) => t.splitPanel(id, axis)),
    [],
  );
  const resizeGroup = useCallback(
    (groupId: GroupId, sizes: Readonly<Record<string, number>>) =>
      setTree((t) => t.resizeGroup(groupId, sizes)),
    [],
  );
  const deletePanel = useCallback(
    (panelId: PanelId) => setTree((t) => t.removePanel(panelId)),
    [],
  );
  const actions = useMemo(
    () => ({ split, resizeGroup, deletePanel }),
    [split, resizeGroup, deletePanel],
  );

  return (
    <LayoutActionsContext.Provider value={actions}>
      <LayoutNodeView node={tree.toJSON()} />
    </LayoutActionsContext.Provider>
  );
}
