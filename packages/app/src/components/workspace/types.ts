import type { ReactNode } from "react";

export interface WorkSpaceTab {
  readonly id: string;
  readonly tabTitle: string;
  readonly content: ReactNode;
}
