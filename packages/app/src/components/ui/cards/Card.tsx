import type { ReactNode, Ref } from "react";

interface CardProps {
  readonly children: ReactNode;
  readonly className?: string;
  ref?: Ref<HTMLDivElement>;
}

export default function Card({ children, className = "", ref }: CardProps) {
  return (
    <div
      ref={ref}
      className={`flex flex-col transition-colors rounded-lg border border-zinc-300 bg-white font-medium shadow-sm px-2 py-1 ${className}`}
    >
      {children}
    </div>
  );
}
