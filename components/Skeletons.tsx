
import React from 'react';
import { Card } from './Common';

export const SkeletonStat: React.FC = () => (
  <Card className="flex items-center justify-between border-none shadow-md h-24 animate-pulse">
    <div className="flex items-center space-x-4">
      <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
      <div className="space-y-2">
        <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="h-6 w-10 bg-slate-200 dark:bg-slate-800 rounded"></div>
      </div>
    </div>
  </Card>
);

export const SkeletonFeed: React.FC = () => (
  <Card className="p-6 border-none shadow-sm animate-pulse space-y-4">
    <div className="flex items-center space-x-4">
      <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800"></div>
      <div className="space-y-2 flex-1">
        <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="h-3 w-1/4 bg-slate-200 dark:bg-slate-800 rounded"></div>
      </div>
    </div>
    <div className="space-y-2">
      <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
      <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-800 rounded"></div>
      <div className="h-4 w-4/6 bg-slate-200 dark:bg-slate-800 rounded"></div>
    </div>
    <div className="pt-4 flex gap-4">
      <div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 rounded"></div>
      <div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 rounded"></div>
    </div>
  </Card>
);

export const SkeletonTask: React.FC = () => (
  <div className="p-3 bg-white/10 rounded-lg border border-white/5 animate-pulse flex items-start gap-3">
    <div className="w-2 h-2 rounded-full bg-slate-500 mt-1.5"></div>
    <div className="flex-1 space-y-2">
      <div className="h-3 w-3/4 bg-slate-500/30 rounded"></div>
      <div className="h-2 w-1/2 bg-slate-500/20 rounded"></div>
    </div>
  </div>
);

export const SkeletonAnnouncement: React.FC = () => (
  <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm animate-pulse space-y-3">
    <div className="flex gap-2">
        <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
        <div className="h-5 w-12 bg-slate-200 dark:bg-slate-700 rounded"></div>
    </div>
    <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded"></div>
    <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-700 rounded"></div>
  </div>
);
