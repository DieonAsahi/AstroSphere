interface HudLabelProps {
  label: string;
  value: string | number;
  unit?: string;
}

export function HudLabel({ label, value, unit }: HudLabelProps) {
  return (
    <span className="hud-label">
      <span>{label}</span>
      <span className="hud-label-value">
        {value}
        {unit ? ` ${unit}` : ''}
      </span>
    </span>
  );
}
