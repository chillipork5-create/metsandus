import React from 'react';
import { FileText, Info, Trash2 } from 'lucide-react';
import { Project } from '../types';
import { SectionTitle } from './ui';

export default function ProjectDataPanel({ project, onUpdate, onDelete }: { project: Project; onUpdate: (u: Partial<Project>) => void; onDelete: () => void; }) {
  const { meta } = project;
  const set = (field: keyof typeof meta) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onUpdate({ meta: { ...meta, [field]: e.target.value } });
  return (
    <div className="space-y-6">
      <section className="card p-8">
        <SectionTitle>Üldandmed</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {([['Projekti nimetus', 'nimi'], ['Juhtumi / protokolli number', 'nr']] as [string, keyof typeof meta][]).map(([label, field]) => (
            <div key={field} className="space-y-1">
              <label className="label-cap" htmlFor={`meta-${field}`}>{label}</label>
              <input id={`meta-${field}`} type="text" className="input-field w-full" value={meta[field]} onChange={set(field)} />
            </div>
          ))}
        </div>
      </section>
      <section className="card p-8">
        <SectionTitle>Märkused ja Koostaja</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {([['Koostaja', 'koostaja'], ['Kuupäev', 'kuupaev'], ['Raie liik', 'raieliik']] as [string, keyof typeof meta][]).map(([label, field]) => (
            <div key={field} className="space-y-1">
              <label className="label-cap" htmlFor={`meta-${field}`}>{label}</label>
              <input id={`meta-${field}`} type="text" className="input-field w-full" value={meta[field]} onChange={set(field)} />
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <label className="label-cap" htmlFor="meta-markused">Märkused</label>
          <textarea id="meta-markused" className="input-field w-full min-h-[100px] resize-none" value={meta.markused} onChange={set('markused')} placeholder="Lisa täiendavat infot siia..." />
        </div>
      </section>
      <div className="flex justify-end pt-4">
        <button onClick={onDelete} className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-all font-bold text-xs uppercase cursor-pointer">
          <Trash2 className="w-4 h-4" /> Kustuta projekt jäädavalt
        </button>
      </div>
    </div>
  );
}
