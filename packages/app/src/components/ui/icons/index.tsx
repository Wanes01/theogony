import type { Icon } from "./types";
import { twMerge } from "tailwind-merge";
import Plus from "@assets/icons/plus.svg?react";
import Cross from "@assets/icons/cross.svg?react";

/**
 * Decorates an `Icon` component by applying a default styling on it.
 *
 * @param MyIcon the icon component to decorate
 * @returns the decorated icon
 */
function withDefaults(MyIcon: Icon): Icon {
  return ({ className, ...props }) => (
    <MyIcon className={twMerge("h-5 w-5", className)} {...props} />
  );
}

/**
 * Centralized `Icon` wrapper. Access different icons as
 * this object properties.
 */
export const Icons = {
  Plus: withDefaults(Plus),
  Cross: withDefaults(Cross),
} satisfies Record<string, Icon>;

export type IconName = keyof typeof Icons;
