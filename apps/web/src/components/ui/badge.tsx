import type { ReactNode } from "react";

interface BadgeProps {
  color?: string;
  className?: string;
  children: ReactNode;
}

export function Badge({ color = "", className = "", children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium transition-colors shrink-0 ${color} ${className}`}
    >
      {children}
    </span>
  );
}
