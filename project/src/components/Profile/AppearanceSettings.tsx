// src/components/Profile/AppearanceSettings.tsx
import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export const AppearanceSettings = () => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <div className="p-4 bg-gray-50 rounded-lg border">
      <h3 className="font-semibold text-gray-800 mb-2">Utseende</h3>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">Välj ljust eller mörkt tema.</p>
        <div className="flex items-center gap-2 rounded-full bg-gray-200 p-1">
          <button onClick={() => setTheme('light')} className={`p-1 rounded-full ${theme === 'light' ? 'bg-white shadow' : ''}`}>
            <Sun className="w-5 h-5 text-yellow-500" />
          </button>
          <button onClick={() => setTheme('dark')} className={`p-1 rounded-full ${theme === 'dark' ? 'bg-gray-700 shadow' : ''}`}>
            <Moon className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-gray-600'}`} />
          </button>
        </div>
      </div>
    </div>
  );
};