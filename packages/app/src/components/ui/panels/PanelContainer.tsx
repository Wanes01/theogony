import type { PanelNode } from "@core/domain/layout/types";
import { useLayoutActions } from "@components/ui/panels/PanelLayout";
import Card from "@components/ui/cards/Card";

interface PanelContainerProps {
  readonly panel: PanelNode;
}

/** A single panel (a leaf in a LayoutPanelTree) */
export function PanelContainer({ panel }: PanelContainerProps) {
  const { split } = useLayoutActions();

  return (
    <Card className="h-full">
      <div className="flex h-full w-full flex-col">
        <button onClick={() => split(panel.id)}>Split</button>
      </div>
    </Card>
  );
}
