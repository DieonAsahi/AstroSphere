import type { ReactNode } from 'react';

interface KbdProps {
  children?: ReactNode;
  className?: string;
}

export function Kbd({ children, className }: KbdProps) {
  return <kbd className={`kbd ${className ?? ''}`.trim()}>{children}</kbd>;
}
