import type { ReactNode } from "react";

interface CardProps {
  readonly children: ReactNode;
  readonly className?: string;
}

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`flex flex-col transition-colors rounded-lg border border-zinc-300 bg-white font-medium shadow-sm px-2 py-1 ${className}`}
    >
      {children}
    </div>
  );
}
