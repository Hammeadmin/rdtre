import React, { useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      <div aria-describedby={`tooltip-${(content || '').replace(/\s+/g, '-')}`}>
  {children}
</div>
{isVisible && (
  <div
    id={`tooltip-${(content || '').replace(/\s+/g, '-')}`}
    role="tooltip"
    className={`absolute z-50 px-2 py-1 text-sm text-white bg-gray-900 rounded-md whitespace-nowrap ${positionClasses[position]}`}
  >
    {content}
    <div 
      className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${
        position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' :
        position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2' :
        position === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2' :
        'left-[-4px] top-1/2 -translate-y-1/2'
      }`}
    />
  </div>
)}
    </div>
  );
}