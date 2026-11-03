import { forwardRef } from 'react';
import type { HTMLAttributes, PropsWithChildren } from 'react';

export const GlassPanel = forwardRef<
  HTMLDivElement,
  PropsWithChildren<HTMLAttributes<HTMLDivElement>>
>(function GlassPanel({ children, className = '', ...props }, ref) {
  return (
    <div ref={ref} className={`glass-panel ${className}`} {...props}>
      {children}
    </div>
  );
});
