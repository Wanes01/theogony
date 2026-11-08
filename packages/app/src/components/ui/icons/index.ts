import type { Icon } from "./types";
import Plus from "@assets/icons/plus.svg?react";

export const icons = {
  plus: Plus,
} satisfies Record<string, Icon>;

export type IconName = keyof typeof icons;
