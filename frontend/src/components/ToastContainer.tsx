import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useToastStore } from '../hooks/useToastStore';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-lg shadow-xl border bg-panel-sidebar select-none font-sans text-xs ${
              toast.type === 'success'
                ? 'border-emerald-500/50 text-emerald-300'
                : toast.type === 'error'
                ? 'border-red-500/50 text-red-300'
                : 'border-blue-500/50 text-blue-300'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />}
            {toast.type === 'error' && <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />}
            {toast.type === 'info' && <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />}
            
            <div className="flex-grow font-medium leading-relaxed">{toast.message}</div>
            
            <button
              onClick={() => removeToast(toast.id)}
              className="text-panel-text hover:text-white shrink-0 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
