import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Tooltip } from './Tooltip';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ label, icon, ...props }, ref) {
    return (
      <Tooltip content={label}>
        <button
          ref={ref}
          type="button"
          className="icon-button"
          aria-label={label}
          {...props}
        >
          {icon}
        </button>
      </Tooltip>
    );
  },
);
