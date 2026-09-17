import React from 'react';

export function Badge({ children, variant = 'primary', className = '' }) {
  // Normalize opportunity badges
  const normalizedVariant = variant.toLowerCase().replace(/\s+/g, '-');
  return (
    <span className={`badge badge-${normalizedVariant} ${className}`.trim()}>
      {children}
    </span>
  );
}

export default Badge;
