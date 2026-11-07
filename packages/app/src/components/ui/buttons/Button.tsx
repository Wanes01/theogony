type ButtonVariant = "flat"; // | ...;

const buttonVariants: Record<ButtonVariant, string> = {
  flat: "",
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
  variant = "flat",
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
