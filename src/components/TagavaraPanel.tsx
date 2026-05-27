import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Project } from '../types';
import { calcStandFactor } from '../lib/calculations';
import { MAHT_KORDAJAD } from '../lib/constants';
import { SectionTitle, ResultBox, SaveButton } from './ui';

export default function TagavaraPanel({ project, onUpdate }: {
  project: Project;
  onUpdate: (u: Partial<Project>) => void;
}) {
  const [showRef, setShowRef] = useState(false);
  const [saved, setSaved] = useState(false);
  const { tagavara } = project;

  const [gStr, setGStr] = useState(tagavara.g > 0 ? String(tagavara.g) : '');
  const [hStr, setHStr] = useState(tagavara.h > 0 ? String(tagavara.h) : '');

  useEffect(() => {
    setGStr(tagavara.g > 0 ? String(tagavara.g) : '');
    setHStr(tagavara.h > 0 ? String(tagavara.h) : '');
  }, [project.id]);

  const commit = (field: keyof typeof tagavara, value: string | number) => {
    onUpdate({ tagavara: { ...tagavara, [field]: typeof value === 'string' ? parseFloat(value) || 0 : value } });
  };

  const handleSave = () => {
    onUpdate({ tagavara: { ...tagavara, g: parseFloat(gStr) || 0, h: parseFloat(hStr) || 0 } });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const h = parseFloat(hStr) || 0;
  const g = parseFloat(gStr) || 0;
  const f = calcStandFactor(tagavara.species, h);
  const m = g * h * f;

  return (
    <div className="space-y-8">
      <section className="card p-8">
        <SectionTitle>Puistu tagavara (H ≥ 6 m)</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end mb-6">
          <div className="space-y-1">
            <label className="label-cap">Puuliik</label>
            <select className="input-field w-full" value={tagavara.species} onChange={e => commit('species', e.target.value)}>
              <option value="mand">Mänd / Lehis</option>
              <option value="kuusk">Kuusik / Nulg</option>
              <option value="kask">Kask / Pärn</option>
              <option value="haab">Haab / Sanglepp</option>
              <option value="tamm">Tamm / Saar</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="label-cap">G (m²/ha)</label>
            <input type="number" className="input-field w-full" value={gStr}
              onChange={e => setGStr(e.target.value)}
              onBlur={() => commit('g', gStr)} />
          </div>
          <div className="space-y-1">
            <label className="label-cap">Keskmine kõrgus H (m)</label>
            <input type="number" className="input-field w-full" value={hStr}
              onChange={e => setHStr(e.target.value)}
              onBlur={() => commit('h', hStr)} />
          </div>
        </div>
        <SaveButton saved={saved} onClick={handleSave} />
      </section>

      {m > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ResultBox label="Vormiarv (F)" value={f.toFixed(4)} subtext="Matemaatiline mudel (lisa 11 p 1.2)" />
          <ResultBox label="Tagavara (M = G × H × F)" value={m.toFixed(1) + ' tm/ha'} type="success" subtext="Hektari tagavara tihumeetrites." />
        </div>
      )}

      <section className="card overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setShowRef(!showRef)}>
          <SectionTitle>Üksikpuu mahu kordajad (Lisa 11 p 1.3)</SectionTitle>
          {showRef ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
        {showRef && (
          <table className="w-full text-[10px] font-mono border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-2 text-left">Puuliik</th>
                <th className="p-2 text-right">a</th>
                <th className="p-2 text-right">b</th>
                <th className="p-2 text-right">c</th>
                <th className="p-2 text-right">d</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-500">
              {Object.entries(MAHT_KORDAJAD).map(([k, v]) => (
                <tr key={k} className={tagavara.species === k ? 'bg-indigo-50 font-bold text-slate-800' : 'hover:bg-slate-50'}>
                  <td className="p-2 font-sans font-medium capitalize">{k}</td>
                  <td className="p-2 text-right">{v.a.toFixed(4)}</td>
                  <td className="p-2 text-right">{v.b.toFixed(3)}</td>
                  <td className="p-2 text-right">{v.c.toFixed(3)}</td>
                  <td className="p-2 text-right">{v.d.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
