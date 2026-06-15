import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Project } from '../types';
import { getGn } from '../lib/calculations';
import { STD_TABLE } from '../lib/constants';
import { SectionTitle, ResultBox, SaveButton } from './ui';
import { useFlash } from '../lib/useTimeout';

export default function TaiusPanel({ project, onUpdate }: { project: Project; onUpdate: (u: Partial<Project>) => void; }) {
  const [showRef, setShowRef] = useState(false);
  const [saved, flashSaved] = useFlash(2000);
  const { taius } = project;
  const [heightStr, setHeightStr] = useState(taius.height > 0 ? String(taius.height) : '');
  const [gStr, setGStr] = useState(taius.g > 0 ? String(taius.g) : '');

  useEffect(() => { setHeightStr(taius.height > 0 ? String(taius.height) : ''); setGStr(taius.g > 0 ? String(taius.g) : ''); }, [project.id]);

  const commit = (field: keyof typeof taius, value: string | number) => onUpdate({ taius: { ...taius, [field]: typeof value === 'string' ? parseFloat(value) || 0 : value } });
  const handleSave = () => { onUpdate({ taius: { ...taius, height: parseFloat(heightStr) || 0, g: parseFloat(gStr) || 0 } }); flashSaved(); };

  const gn = getGn(taius.species, parseFloat(heightStr) || 0);
  const gVal = parseFloat(gStr) || 0;
  const taiusVal = gVal && gn ? (gVal / gn) * 100 : 0;

  return (
    <div className="space-y-8">
      <section className="card p-8">
        <SectionTitle>Täiuse arvutamine</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end mb-6">
          <div className="space-y-1"><label className="label-cap" htmlFor="taius-species">Puuliik (liigiomane Gn)</label>
            <select id="taius-species" className="input-field w-full" value={taius.species} onChange={e => commit('species', e.target.value)}>
              <option value="mand">Männik / Lehis</option><option value="kuusk">Kuusik / Nulg</option>
              <option value="kask">Kaasik / Pärn</option><option value="sanglepp">Sanglepik / Haavik</option>
              <option value="kovleht">Tamm / Saar / Vaher</option>
            </select></div>
          <div className="space-y-1"><label className="label-cap" htmlFor="taius-height">Puistu kõrgus H (m)</label>
            <input id="taius-height" type="number" className={`input-field w-full`} value={heightStr} onChange={e => setHeightStr(e.target.value)} onBlur={() => commit('height', heightStr)} /></div>
          <div className="space-y-1"><label className="label-cap" htmlFor="taius-g">Mõõdetud G (m²/ha)</label>
            <input id="taius-g" type="number" className={`input-field w-full`} value={gStr} onChange={e => setGStr(e.target.value)} onBlur={() => commit('g', gStr)} /></div>
        </div>
        <SaveButton saved={saved} onClick={handleSave} />
      </section>
      {taiusVal > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ResultBox label="Normaalpuistu rinnaspindala (Gn)" value={gn.toFixed(1) + ' m²/ha'} subtext={`H=${heightStr}m kohane etalonväärtus`} />
          <ResultBox label="Täius (T = G / Gn × 100)" value={taiusVal.toFixed(1) + ' %'} type={taiusVal < 30 ? 'danger' : taiusVal < 60 ? 'warn' : 'success'} subtext={taiusVal < 30 ? 'Uuendamiskohustus (alla 30%)' : 'Tihedus on normis.'} />
        </div>
      )}
      <section className="card">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50" onClick={() => setShowRef(!showRef)}>
          <SectionTitle>Standardtabel Gn (m²/ha)</SectionTitle>
          {showRef ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
        {showRef && (
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] font-mono border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="p-2 text-left">H (m)</th><th className="p-2 text-right">Mänd</th><th className="p-2 text-right">Kuusk</th><th className="p-2 text-right">Kask</th><th className="p-2 text-right">Haab</th><th className="p-2 text-right">Tamm/Saar</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(STD_TABLE).map(([h, vals]) => (
                  <tr key={h} className={String(taius.height) === h ? 'bg-indigo-50 font-bold' : 'hover:bg-slate-50'}>
                    <td className="p-2 text-slate-900 border-r border-slate-100">{h}</td>
                    {vals.map((v, i) => <td key={i} className="p-2 text-right text-slate-600">{v.toFixed(1)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
