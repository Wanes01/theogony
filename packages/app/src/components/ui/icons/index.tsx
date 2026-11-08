import type { Icon } from "./types";
import { twMerge } from "tailwind-merge";
import Plus from "@assets/icons/plus.svg?react";

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

export const Icons = {
  Plus: withDefaults(Plus),
} satisfies Record<string, Icon>;

export type IconName = keyof typeof Icons;
