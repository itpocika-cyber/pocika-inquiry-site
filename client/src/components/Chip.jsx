import React from 'react';

/**
 * Accessible selectable chip component.
 * Uses a real HTML button with proper focus styles and aria attributes.
 */
export function Chip({
  label,
  value,
  selected = false,
  onClick,
  disabled = false,
  name,
  className = ''
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      name={name}
      disabled={disabled}
      onClick={() => onClick && onClick(value)}
      className={`chip ${selected ? 'active' : ''} ${className}`.trim()}
    >
      {label || value}
    </button>
  );
}

export default Chip;
