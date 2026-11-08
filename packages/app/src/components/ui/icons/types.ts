import type { ComponentType, SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
  title?: string;
};

export type Icon = ComponentType<IconProps>;
