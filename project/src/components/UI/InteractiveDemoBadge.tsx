// src/components/UI/InteractiveDemoBadge.tsx
import React from 'react';
import { MousePointerClick } from 'lucide-react';

export const InteractiveDemoBadge = () => {
  return (
    <div className="absolute -top-2 -right-2 z-10">
      <span className="inline-flex items-center rounded-full bg-accent-600 px-3 py-1 text-xs font-medium text-white shadow-lg animate-pulse-badge">
        <MousePointerClick className="h-4 w-4 mr-1.5" />
      </span>
    </div>
  );
};