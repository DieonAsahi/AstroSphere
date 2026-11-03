import type { InputHTMLAttributes } from 'react';

export function Slider(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      type="range"
      className={`control-slider ${props.className ?? ''}`}
    />
  );
}
