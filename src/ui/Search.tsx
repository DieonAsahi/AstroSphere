import type { InputHTMLAttributes } from 'react';

export function Search(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="search"
      className="rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-white"
      {...props}
    />
  );
}
