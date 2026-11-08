import type { ComponentPropsWithoutRef } from "react";

type ButtonVariant = "styleless"; // | ...;

const buttonVariants: Record<ButtonVariant, string> = {
  styleless: "",
};

interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
  readonly variant?: ButtonVariant;
}

export default function Button({
  variant = "styleless",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${buttonVariants[variant]} ${className}`.trim()}
      {...props}
    />
  );
}
