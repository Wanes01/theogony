import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import PanelLayoutTree from "@core/domain/layout/PanelLayoutTree";
import type { Axis, PanelId } from "@core/domain/layout/types";
import { LayoutNodeView } from "./LayoutNodeView";

/** actions that can be performed on a LayoutNode */
interface LayoutActions {
  split(id: PanelId, axis: Axis): void;
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
  const actions = useMemo(() => ({ split }), [split]);

  return (
    <LayoutActionsContext.Provider value={actions}>
      <LayoutNodeView node={tree.toJSON()} />
    </LayoutActionsContext.Provider>
  );
}
