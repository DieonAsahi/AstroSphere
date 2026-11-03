import { useId } from 'react';

export interface TabOption {
  id: string;
  label: string;
}

interface TabListProps {
  label: string;
  options: TabOption[];
  value: string;
  onChange: (value: string) => void;
  baseId?: string;
}

export function TabList({
  label,
  options,
  value,
  onChange,
  baseId,
}: TabListProps) {
  const generatedId = useId();
  const labelId = baseId ?? generatedId;

  const moveSelection = (index: number, key: string) => {
    let nextIndex = index;
    if (key === 'ArrowRight' || key === 'ArrowDown') {
      nextIndex = (index + 1) % options.length;
    } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
      nextIndex = (index - 1 + options.length) % options.length;
    } else if (key === 'Home') {
      nextIndex = 0;
    } else if (key === 'End') {
      nextIndex = options.length - 1;
    } else {
      return;
    }

    const nextOption = options[nextIndex];
    onChange(nextOption.id);
    document.getElementById(`${labelId}-tab-${nextOption.id}`)?.focus();
  };

  return (
    <div className="tab-list glass-panel" role="tablist" aria-label={label}>
      {options.map((option, index) => {
        const isSelected = value === option.id;
        return (
          <button
            key={option.id}
            id={`${labelId}-tab-${option.id}`}
            type="button"
            role="tab"
            className={`tab-button ${isSelected ? 'tab-button--active' : ''}`}
            aria-selected={isSelected}
            aria-controls={`${labelId}-panel-${option.id}`}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(option.id)}
            onKeyDown={(event) => {
              const navKeys = [
                'ArrowRight',
                'ArrowLeft',
                'ArrowDown',
                'ArrowUp',
                'Home',
                'End',
              ];
              if (navKeys.includes(event.key)) {
                event.preventDefault();
                moveSelection(index, event.key);
              }
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
