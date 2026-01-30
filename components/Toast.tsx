import React, { useState, useEffect } from 'react';
import { toast } from '../services/toast';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const unsubscribe = toast.subscribe((message, type) => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, message, type }]);
      
      // Auto dismiss
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 3000);
    });

    return unsubscribe;
  }, []);

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const icons = {
    success: <CheckCircle size={20} className="text-emerald-500" />,
    error: <AlertCircle size={20} className="text-red-500" />,
    info: <Info size={20} className="text-blue-500" />
  };

  const bgColors = {
    success: 'bg-white dark:bg-slate-800 border-l-4 border-emerald-500',
    error: 'bg-white dark:bg-slate-800 border-l-4 border-red-500',
    info: 'bg-white dark:bg-slate-800 border-l-4 border-blue-500'
  };

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map(t => (
        <div 
          key={t.id}
          className={`pointer-events-auto min-w-[300px] max-w-sm p-4 rounded-lg shadow-xl border border-slate-100 dark:border-slate-700 flex items-start gap-3 animate-slide-up ${bgColors[t.type]}`}
        >
          <div className="mt-0.5 shrink-0">{icons[t.type]}</div>
          <p className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-100">{t.message}</p>
          <button 
            onClick={() => removeToast(t.id)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};