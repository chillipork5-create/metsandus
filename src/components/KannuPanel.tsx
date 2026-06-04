import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Project } from '../types';
import { stumpToD13, d13ToStump } from '../lib/calculations';
import { KANDU_CONV_COEFFS } from '../lib/constants';
import { useFlash } from '../lib/useTimeout';
import { SectionTitle, SaveButton } from './ui';

export default function KannuPanel({ project, onUpdate }: {
  project: Project;
  onUpdate: (u: Partial<Project>) => void;
}) {
  const [showRef, setShowRef] = useState(false);
  const [saved, flashSaved] = useFlash(2000);
  const { kannu } = project;

  const [dStumpStr, setDStumpStr] = useState(kannu.dStump > 0 ? String(kannu.dStump) : '');
  const [d13Str, setD13Str] = useState(kannu.d13 > 0 ? String(kannu.d13) : '');

  useEffect(() => {
    setDStumpStr(kannu.dStump > 0 ? String(kannu.dStump) : '');
    setD13Str(kannu.d13 > 0 ? String(kannu.d13) : '');
  }, [project.id]);

  const commit = (field: keyof typeof kannu, value: string | number) => {
    onUpdate({ kannu: { ...kannu, [field]: typeof value === 'string' ? parseFloat(value) || 0 : value } });
  };

  const handleSave = () => {
    onUpdate({ kannu: { ...kannu, dStump: parseFloat(dStumpStr) || 0, d13: parseFloat(d13Str) || 0 } });
    flashSaved();
  };

  const d13Result = stumpToD13(kannu.species, parseFloat(dStumpStr) || 0);
  const stumpResult = d13ToStump(kannu.species, parseFloat(d13Str) || 0);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="card p-8">
          <SectionTitle>Känd → D₁.₃</SectionTitle>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="label-cap" htmlFor="kannu-species">Puuliik</label>
              <select id="kannu-species" className="input-field w-full" value={kannu.species} onChange={e => commit('species', e.target.value)}>
                {Object.keys(KANDU_CONV_COEFFS).map(k => (
                  <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="label-cap" htmlFor="kannu-dstump">Kännu ∅ (cm)</label>
              <input id="kannu-dstump" type="number" className="input-field w-full" value={dStumpStr}
                onChange={e => setDStumpStr(e.target.value)}
                onBlur={() => commit('dStump', dStumpStr)} />
            </div>
            {d13Result > 0 && (
              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                <div className="text-[10px] uppercase font-bold text-indigo-400 mb-1">Tulemus d₁.₃</div>
                <div className="text-2xl font-bold text-indigo-900">{d13Result.toFixed(2)} cm</div>
              </div>
            )}
          </div>
        </section>

        <section className="card p-8">
          <SectionTitle>D₁.₃ → Känd (Pöördvalem)</SectionTitle>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="label-cap" htmlFor="kannu-d13">Rinnasdiameeter D (cm)</label>
              <input id="kannu-d13" type="number" className="input-field w-full" value={d13Str}
                onChange={e => setD13Str(e.target.value)}
                onBlur={() => commit('d13', d13Str)} />
            </div>
            {stumpResult > 0 && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Tulemus d_känd</div>
                <div className="text-2xl font-bold text-slate-700">{stumpResult.toFixed(2)} cm</div>
              </div>
            )}
          </div>
        </section>
      </div>

      <SaveButton saved={saved} onClick={handleSave} />

      <section className="card overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setShowRef(!showRef)}>
          <SectionTitle>Kordajad (Metsatööd Tabel 7)</SectionTitle>
          {showRef ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
        {showRef && (
          <table className="w-full text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-3 text-left label-cap !mb-0">Puuliik</th>
                <th className="p-3 text-right label-cap !mb-0">a</th>
                <th className="p-3 text-right label-cap !mb-0">b</th>
                <th className="p-3 text-right label-cap !mb-0">Valem (d₁.₃ =)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {Object.entries(KANDU_CONV_COEFFS).map(([k, v]) => (
                <tr key={k} className={kannu.species === k ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}>
                  <td className="p-3 font-sans font-bold capitalize">{k}</td>
                  <td className="p-3 text-right">{v.a.toFixed(2)}</td>
                  <td className="p-3 text-right">{v.b.toFixed(2)}</td>
                  <td className="p-3 text-right text-slate-400">{v.a} + {v.b} × d_känd</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
