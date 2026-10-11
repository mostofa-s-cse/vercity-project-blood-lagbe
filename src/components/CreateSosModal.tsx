import React from 'react';
import { CreateSosScreen } from './CreateSosScreen';
import { useAppState } from '../context/AppStateContext';

interface CreateSosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Posting a blood request from inside the Admin Panel (or any other screen that isn't the public
 * /sos page) without leaving it: the same CreateSosScreen form, in a modal. CreateSosScreen's own
 * "back"/"go to hub"/"track my request" buttons all just close this modal instead of navigating —
 * the point is staying put, not ending up on a different page than the one the button was clicked from.
 */
export const CreateSosModal: React.FC<CreateSosModalProps> = ({ isOpen, onClose }) => {
  const { handleSosCreated } = useAppState();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl my-6">
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 z-10 w-9 h-9 rounded-full bg-white hover:bg-slate-100 shadow-lg border border-slate-200 flex items-center justify-center text-slate-600 cursor-pointer transition-colors"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
        <CreateSosScreen onNavigate={() => onClose()} onSosCreated={handleSosCreated} />
      </div>
    </div>
  );
};
