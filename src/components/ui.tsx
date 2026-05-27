import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

export const PanelContainer = ({ children, isActive }: { children: React.ReactNode; isActive: boolean }) => (
  <AnimatePresence mode="wait">
    {isActive && (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="space-y-6"
      >
        {children}
      </motion.div>
    )}
  </AnimatePresence>
);

export const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-2 mb-4">
    <div className="w-2 h-4 bg-indigo-500 rounded-sm" />
    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">{children}</h3>
  </div>
);

type ResultType = 'info' | 'success' | 'warn' | 'danger';
const resultStyles: Record<ResultType, string> = {
  info:    'bg-white border-slate-200 text-slate-900',
  success: 'bg-emerald-50 border-emerald-100 text-emerald-900',
  warn:    'bg-amber-50 border-amber-100 text-amber-900',
  danger:  'bg-rose-50 border-rose-100 text-rose-900',
};

export const ResultBox = ({
  label, value, subtext, type = 'info',
}: {
  label: string; value: string | number; subtext?: string; type?: ResultType;
}) => (
  <div className={`p-5 rounded-xl border ${resultStyles[type]} shadow-sm`}>
    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">{label}</div>
    <div className="text-2xl font-bold leading-tight tracking-tight">{value}</div>
    {subtext && <div className="text-[11px] mt-2 opacity-60 font-medium italic">{subtext}</div>}
  </div>
);

export const SaveButton = ({ saved, saving, onClick }: { saved: boolean; saving?: boolean; onClick: () => void }) => {
  // Inline import to avoid circular deps
  const { Check, Save } = require('lucide-react');
  return (
    <button
      onClick={onClick}
      className={`w-full py-2.5 px-4 flex items-center justify-center gap-2 rounded-xl font-bold text-xs uppercase cursor-pointer transition-all active:scale-95 duration-200 text-white ${saved ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
    >
      {saved ? <><Check className="w-4 h-4" /> Andmed salvestatud!</> : <><Save className="w-4 h-4" /> {saving ? 'Salvestab...' : 'Salvesta andmed'}</>}
    </button>
  );
};
