import type { ButtonHTMLAttributes } from 'react';

export function Button({
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`rounded-lg border border-white/15 px-3 py-2 text-sm transition hover:bg-white/10 ${className}`}
      {...props}
    />
  );
}
