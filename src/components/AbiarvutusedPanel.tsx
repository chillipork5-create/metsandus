import React, { useState } from 'react';
import { Project } from '../types';
import KannuPanel from './KannuPanel';
import TaiusPanel from './TaiusPanel';
import TagavaraPanel from './TagavaraPanel';

const SUB_TABS = [
  { id: 'kannu',  label: 'Känd ↔ D₁.₃' },
  { id: 'taius',  label: 'Täius' },
  { id: 'maht',   label: 'Tagavara' },
];

export default function AbiarvutusedPanel({ project, onUpdate }: {
  project: Project;
  onUpdate: (u: Partial<Project>) => void;
}) {
  const [active, setActive] = useState('kannu');

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 w-fit">
        {SUB_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              active === tab.id
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            aria-selected={active === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-panels */}
      {active === 'kannu' && <KannuPanel project={project} onUpdate={onUpdate} />}
      {active === 'taius' && <TaiusPanel project={project} onUpdate={onUpdate} />}
      {active === 'maht'  && <TagavaraPanel project={project} onUpdate={onUpdate} />}
    </div>
  );
}
