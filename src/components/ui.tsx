import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Save } from 'lucide-react';

export const PanelContainer = ({ children, isActive }: { children: React.ReactNode; isActive: boolean }) => (
  <AnimatePresence mode="wait">
    {isActive && (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.18 }}
        className="space-y-5"
      >
        {children}
      </motion.div>
    )}
  </AnimatePresence>
);

export const SectionTitle = ({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) => (
  <div className="flex items-center gap-2.5 mb-5">
    <div className="section-accent" aria-hidden="true" />
    {icon && <span className="text-forest-600" aria-hidden="true">{icon}</span>}
    <h3 className="text-sm font-semibold text-slate-700 tracking-tight">{children}</h3>
  </div>
);

type ResultType = 'info' | 'success' | 'warn' | 'danger';
const resultStyles: Record<ResultType, string> = {
  info:    'bg-white border-slate-200 text-slate-900',
  success: 'bg-forest-50 border-forest-200 text-forest-900',
  warn:    'bg-amber-50 border-amber-200 text-amber-900',
  danger:  'bg-rose-50 border-rose-200 text-rose-900',
};
const valueStyles: Record<ResultType, string> = {
  info:    'text-slate-900',
  success: 'text-forest-700',
  warn:    'text-amber-800',
  danger:  'text-rose-700',
};

export const ResultBox = ({
  label, value, subtext, type = 'info',
}: { label: string; value: string | number; subtext?: string; type?: ResultType }) => (
  <div className={`p-5 rounded-2xl border ${resultStyles[type]} shadow-sm`} role="status" aria-label={label}>
    <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-2" aria-hidden="true">{label}</div>
    <div className={`text-2xl font-semibold leading-tight tracking-tight ${valueStyles[type]}`}>{value}</div>
    {subtext && <div className="text-[11px] mt-2 opacity-60 font-medium">{subtext}</div>}
  </div>
);

export const SaveButton = ({ saved, saving, onClick }: { saved: boolean; saving?: boolean; onClick: () => void }) => (
  <button
    onClick={onClick} disabled={saving}
    aria-label={saved ? 'Andmed salvestatud' : 'Salvesta andmed'}
    className={`w-full py-2.5 px-4 flex items-center justify-center gap-2 rounded-xl font-semibold text-xs uppercase tracking-wider cursor-pointer transition-all active:scale-95 duration-200 text-white disabled:opacity-60
      ${saved ? 'bg-forest-600 hover:bg-forest-700' : 'bg-forest-600 hover:bg-forest-700'}`}
  >
    {saved
      ? <><Check className="w-4 h-4" aria-hidden="true" /> Salvestatud!</>
      : <><Save className="w-4 h-4" aria-hidden="true" /> {saving ? 'Salvestab...' : 'Salvesta'}</>}
  </button>
);
