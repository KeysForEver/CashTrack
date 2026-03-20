import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmLabel = 'Confirmar', 
  cancelLabel = 'Cancelar',
  type = 'danger'
}) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const colors = {
    danger: 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-600 hover:text-white',
    warning: 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-600 hover:text-white',
    info: 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-600 hover:text-white'
  };

  const iconColors = {
    danger: 'text-rose-600 bg-rose-100',
    warning: 'text-amber-600 bg-amber-100',
    info: 'text-blue-600 bg-blue-100'
  };

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 transition-all"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl border border-gray-100 overflow-hidden p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className={`mb-6 p-4 rounded-2xl ${iconColors[type]}`}>
            <AlertTriangle size={32} />
          </div>
          
          <h3 className="text-2xl font-bold text-gray-800 mb-2">{title}</h3>
          <p className="text-gray-500 mb-8 leading-relaxed">{message}</p>

          <div className="flex w-full gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-all active:scale-95"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all active:scale-95 border ${colors[type]}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
