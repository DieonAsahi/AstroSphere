import type { PropsWithChildren } from 'react';

interface TooltipProps extends PropsWithChildren {
  content: string;
}

export function Tooltip({ content, children }: TooltipProps) {
  const tooltipId = `tooltip-${content.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}`;

  return (
    <span className="tooltip-wrap">
      {children}
      <span className="tooltip" role="tooltip" id={tooltipId}>
        {content}
      </span>
    </span>
  );
}
