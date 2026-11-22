import type { PanelNode } from "@core/domain/layout/types";
import { useLayoutActions } from "@components/ui/panels/PanelLayout";
import Card from "@components/ui/cards/Card";
import type { MenuAction } from "@components/menu/types";
import { usePopover } from "@components/menu/usePopover";
import DropdownMenu from "@components/menu/DropdownMenu";

interface PanelContainerProps {
  readonly panel: PanelNode;
}

/** A single panel (a leaf in a LayoutPanelTree) */
export function PanelContainer({ panel }: PanelContainerProps) {
  const popover = usePopover();
  const { split } = useLayoutActions();

  const panelMenuActions: MenuAction[] = [
    {
      label: "Dividi verticalmente il pannello",
      onClick: () => split(panel.id, "horizontal"),
    },
    {
      label: "Dividi orizzontalmente il pannello",
      onClick: () => split(panel.id, "vertical"),
    },
  ];

  return (
    <Card ref={popover.ref} className="h-full">
      <div
        className="flex h-full w-full flex-col"
        onContextMenu={(e) => {
          e.preventDefault();
          popover.openAt(e.clientX, e.clientY);
        }}
      ></div>
      <DropdownMenu
        open={popover.isOpen}
        onClose={popover.close}
        actions={panelMenuActions}
        position={popover.position}
      />
    </Card>
  );
}
