type ButtonVariant = "styleless"; // | ...;

const buttonVariants: Record<ButtonVariant, string> = {
  styleless: "",
};

interface ButtonProps {
  readonly text: string;
  readonly onClick: () => void;
  readonly variant?: ButtonVariant;
  readonly className?: string;
}

export default function Button({
  text,
  onClick,
  variant = "styleless",
  className = "",
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`${buttonVariants[variant]} ${className}`}
    >
      {text}
    </button>
  );
}
