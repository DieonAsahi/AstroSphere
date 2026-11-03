import type { InputHTMLAttributes } from 'react';

interface ToggleProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
> {
  label: string;
}

export function Toggle({ label, ...props }: ToggleProps) {
  return (
    <label className="toggle">
      <input type="checkbox" {...props} />
      <span className="toggle-track" aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}
