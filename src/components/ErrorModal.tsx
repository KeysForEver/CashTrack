import React, { useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({ isOpen, onClose, message }) => {
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

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative flex flex-col w-[30vw] h-[30vh] min-w-[280px] min-h-[180px] rounded-3xl bg-white shadow-2xl border border-rose-100 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-rose-50 bg-rose-50/50">
          <div className="flex items-center gap-2 text-rose-600">
            <AlertCircle size={20} />
            <span className="font-bold text-sm uppercase tracking-wider">Erro</span>
          </div>
          <button 
            onClick={onClose} 
            className="rounded-full p-1 text-gray-400 hover:bg-rose-100 hover:text-rose-600 transition-all"
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <p className="text-gray-700 font-medium text-sm leading-relaxed">
            {message}
          </p>
        </div>
        
        {/* Footer */}
        <div className="p-3 bg-gray-50/50 border-t border-gray-100 flex justify-center">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 shadow-sm transition-all active:scale-95"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
