
import React from 'react';
import { Button } from '../components/Common';
import { Home, FileQuestion } from 'lucide-react';
import { View } from '../types';

export const NotFound: React.FC<{ onNavigate?: (view: View) => void }> = ({ onNavigate }) => {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-6rem)] text-center p-6 animate-fade-in">
      <div className="bg-slate-100 dark:bg-slate-800 p-8 rounded-full mb-6">
        <FileQuestion size={64} className="text-slate-400 dark:text-slate-500" />
      </div>
      <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2">404</h1>
      <p className="text-lg text-slate-500 dark:text-slate-400 mb-8 max-w-sm">
        Страница, которую вы ищете, не найдена или была перемещена.
      </p>
      {onNavigate && (
        <Button onClick={() => onNavigate('dashboard')} size="lg" className="rounded-2xl">
          <Home size={20} className="mr-2" /> На главную
        </Button>
      )}
    </div>
  );
};
