// src/components/UI/Modal.tsx
import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  maxWidth?: 'max-w-md' | 'max-w-lg' | 'max-w-xl' | 'max-w-2xl' | 'max-w-3xl';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl' }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="modal-backdrop p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        className={`modal-content-wrapper ${maxWidth}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Optional Header */}
        {title && (
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <h2 id="modal-title" className="text-xl font-semibold text-gray-900">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-full transition-colors"
              aria-label="Stäng modal"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        )}
        
        {/* The content you pass in will be scrollable */}
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};