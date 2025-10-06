import React from 'react';

interface AccessibleIconProps {
  icon: React.ReactNode;
  label: string;
}

export function AccessibleIcon({ icon, label }: AccessibleIconProps) {
  return (
    <span role="img" aria-label={label} className="inline-flex">
      {icon}
      <span className="sr-only">{label}</span>
    </span>
  );
}