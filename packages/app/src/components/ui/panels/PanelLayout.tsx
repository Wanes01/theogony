import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import PanelLayoutTree from "@core/domain/layout/PanelLayoutTree";
import type { GroupId, PanelId } from "@core/domain/layout/types";
import { LayoutNodeView } from "./LayoutNodeView";

/** actions that can be performed on a LayoutNode */
interface LayoutActions {
  split(id: PanelId): void;
  addPanel(groupId: GroupId): void;
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
    (id: PanelId) => setTree((t) => t.splitPanel(id)),
    [],
  );
  const addPanel = useCallback(
    (groupId: GroupId) => setTree((t) => t.addPanelToGroup(groupId)),
    [],
  );
  const actions = useMemo(() => ({ split, addPanel }), [split, addPanel]);

  return (
    <LayoutActionsContext.Provider value={actions}>
      <LayoutNodeView node={tree.toJSON()} />
    </LayoutActionsContext.Provider>
  );
}
