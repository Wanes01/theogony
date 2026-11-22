import type { Icon } from "@components/ui/icons/types";

export interface MenuAction {
  readonly label: string;
  readonly onClick: () => void;
}

export interface IconMenuAction extends MenuAction {
  readonly icon: Icon;
  readonly showLabel?: boolean;
}
