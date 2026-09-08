import type { ReactNode } from "react";

interface BadgeProps {
  color?: string;
  className?: string;
  children: ReactNode;
}

export function Badge({ color = "", className = "", children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${color} ${className}`}
    >
      {children}
    </span>
  );
}
