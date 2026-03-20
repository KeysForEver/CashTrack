import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from './Modal';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({ isOpen, onClose, message }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Erro" className="max-w-sm">
      <div className="flex flex-col items-center text-center p-4">
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600">
          <AlertCircle size={32} />
        </div>
        
        <p className="text-gray-600 mb-8 leading-relaxed font-medium">
          {message}
        </p>

        <button
          onClick={onClose}
          className="w-full px-6 py-3 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition-all active:scale-95 shadow-lg shadow-rose-200"
        >
          Entendido
        </button>
      </div>
    </Modal>
  );
};
