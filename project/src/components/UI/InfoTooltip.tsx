// src/components/UI/InfoTooltip.tsx
import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  text: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ text }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="relative flex items-center ml-2"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <Info size={16} className="text-gray-400 cursor-pointer hover:text-blue-600" />
      {isVisible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg z-10">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-gray-800"></div>
        </div>
      )}
    </div>
  );
};