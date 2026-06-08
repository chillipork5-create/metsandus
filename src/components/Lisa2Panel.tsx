import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Layers, Trash2, ChevronDown, ChevronUp, Variable, Info } from 'lucide-react';
import { Project, TreeRow } from '../types';
import { getLisa2Rate } from '../lib/calculations';
import { validateDiameter, validateCount } from '../lib/validate';
import { LISA2_DATA, LISA2_STEP } from '../lib/constants';
import { generateId } from '../lib/utils';
import { SectionTitle } from './ui';

// --- Lisa2Form ---
function Lisa2Form({ onAdd }: { onAdd: (row: Omit<TreeRow, 'id'>) => void }) {
  const [data, setData] = useState({ liik: 'Mänd', grupp: 1, diam: '', arv: '' });
  const [errors, setErrors] = useState<{ diam?: string; arv?: string }>({});

  const handleAdd = () => {
    const diamErr = validateDiameter(data.diam);
    const arvErr = validateCount(data.arv);
    if (diamErr || arvErr) {
      setErrors({ diam: diamErr ?? undefined, arv: arvErr ?? undefined });
      return;
    }
    setErrors({});
    onAdd({ liik: data.liik, grupp: data.grupp, diam: parseFloat(data.diam), arv: parseInt(data.arv) });
    setData({ ...data, diam: '', arv: '' });
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
      <div className="flex flex-col">
        <label className="label-cap" htmlFor="lisa2-puuliik">Puuliik</label>
        <select id="lisa2-puuliik"
          className="input-field"
          value={`${data.grupp}|${data.liik}`}
          onChange={e => {
            const [g, l] = e.target.value.split('|');
            setData({ ...data, grupp: parseInt(g), liik: l });
          }}
        >
          <optgroup label="Grupp 1 — Mänd, Kuusk, Kask, Sanglepp, Lehis, Nulg">
            <option value="1|Mänd">Mänd</option>
            <option value="1|Kuusk">Kuusk</option>
            <option value="1|Kask">Kask</option>
            <option value="1|Sanglepp">Sanglepp</option>
            <option value="1|Lehis">Lehis</option>
            <option value="1|Nulg">Nulg</option>
          </optgroup>
          <optgroup label="Grupp 2 — Tamm, Saar, Jalakas, Vaher, Kadakas">
            <option value="2|Tamm">Tamm</option>
            <option value="2|Saar">Saar</option>
            <option value="2|Jalakas">Jalakas</option>
            <option value="2|Vaher">Vaher</option>
            <option value="2|Kadakas">Kadakas (d ≥ 8cm)</option>
          </optgroup>
          <optgroup label="Grupp 3 — Haab, Pärn, Pappel, Põõsad">
            <option value="3|Haab">Haab</option>
            <option value="3|Pärn">Pärn</option>
            <option value="3|Pappel">Pappel</option>
            <option value="3|Põõsas">Põõsas</option>
          </optgroup>
          <optgroup label="Grupp 4 — Hall-lepp, Paju, muud pehmed lehtpuud">
            <option value="4|Hall-lepp">Hall-lepp</option>
            <option value="4|Paju">Paju</option>
          </optgroup>
        </select>
      </div>
      <div className="flex flex-col">
        <label className="label-cap" htmlFor="lisa2-diam">Kännu ∅ (cm)</label>
        <input id="lisa2-diam" type="number" className={`input-field ${errors.diam ? 'border-rose-400 focus:border-rose-500' : ''}`} placeholder="17.4" value={data.diam} onChange={e => { setData({ ...data, diam: e.target.value }); setErrors(p => ({...p, diam: undefined})); }} aria-label="Kännu läbimõõt sentimeetrites" aria-invalid={!!errors.diam} aria-describedby={errors.diam ? 'diam-err' : undefined} />
        {errors.diam && <p id="diam-err" className="text-[10px] text-rose-600 mt-1 font-medium" role="alert">{errors.diam}</p>}
      </div>
      <div className="flex flex-col">
        <label className="label-cap" htmlFor="lisa2-arv">Arv (tk)</label>
        <input id="lisa2-arv" type="number" className={`input-field ${errors.arv ? 'border-rose-400' : ''}`} placeholder="5" value={data.arv} aria-label="Puude arv tükkides" aria-invalid={!!errors.arv} aria-describedby={errors.arv ? 'arv-err' : undefined}
          onChange={e => { setData({ ...data, arv: e.target.value }); setErrors(p => ({...p, arv: undefined})); }}
          onKeyDown={e => e.key === 'Enter' && handleAdd()} />
        {errors.arv && <p id="arv-err" className="text-[10px] text-rose-600 mt-1 font-medium" role="alert">{errors.arv}</p>}
      </div>
      <button onClick={handleAdd} className="btn-primary h-10 flex items-center justify-center gap-2">
        <Plus className="w-4 h-4" /> Lisa
      </button>
    </div>
  );
}

// --- Lisa2Table ---
function Lisa2Table({ rows, kordaja, onRemove, onUpdateTotal }: {
  rows: TreeRow[];
  kordaja: number;
  onRemove: (id: string) => void;
  onUpdateTotal: (v: string) => void;
}) {
  const total = rows.reduce((acc, r) => acc + getLisa2Rate(r.diam, r.grupp) * r.arv * kordaja, 0);

  useEffect(() => {
    onUpdateTotal(total.toFixed(2) + ' €');
  }, [total, onUpdateTotal]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse" role="grid" aria-label="Raiutud puude nimekiri">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">#</th>
            <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Puuliik</th>
            <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Kännu ∅</th>
            <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Kogus</th>
            <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Ühikumäär</th>
            <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Summa</th>
            <th className="px-6 py-4 w-12" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-xs italic font-medium">Andmebaas on tühi. Sisesta puid ülemisest paneelist.</td></tr>
          ) : (
            rows.map((r, idx) => {
              const rate = getLisa2Rate(r.diam, r.grupp);
              const kahju = rate * r.arv * kordaja;
              return (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 text-xs font-mono text-slate-400">{(idx + 1).toString().padStart(3, '0')}</td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-700">{r.liik} <span className="ml-1 text-[10px] text-slate-400 font-normal italic">(Grp {r.grupp})</span></td>
                  <td className="px-6 py-4 text-xs font-mono text-right">{r.diam.toFixed(1)} cm</td>
                  <td className="px-6 py-4 text-xs font-mono font-bold text-right">{r.arv}</td>
                  <td className="px-6 py-4 text-xs font-mono text-right text-slate-500">€{rate.toFixed(2)}</td>
                  <td className="px-6 py-4 text-xs font-mono font-bold text-right text-slate-900">€{kahju.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => onRemove(r.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-rose-500" aria-label="Eemalda rida">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
        {rows.length > 0 && (
          <tfoot className="bg-slate-50/80">
            <tr className="border-t-2 border-slate-200">
              <td colSpan={5} className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Kogusumma</td>
              <td className="px-6 py-4 text-right font-mono font-black text-xl text-slate-800">€{total.toFixed(2)}</td>
              <td />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

// --- Lisa2ReferenceTable ---
function Lisa2ReferenceTable() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="card overflow-hidden border border-slate-200 shadow-sm">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors text-left">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-500" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Lisa 2 kahjumäärade tabel</span>
        </div>
        <span className="text-xs text-indigo-600 font-semibold flex items-center gap-1">
          {isOpen ? <>Peida <ChevronUp className="w-4 h-4" /></> : <>Näita <ChevronDown className="w-4 h-4" /></>}
        </span>
      </button>
      {isOpen && (
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="overflow-x-auto max-h-[300px] custom-scrollbar rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 font-bold text-slate-500 uppercase tracking-wider text-center">
                <tr>
                  <th className="px-3 py-2 text-center border-r border-slate-100">Kännu ∅ (kuni, cm)</th>
                  <th className="px-3 py-2 text-right">Grp I (€)</th>
                  <th className="px-3 py-2 text-right">Grp II (€)</th>
                  <th className="px-3 py-2 text-right">Grp III (€)</th>
                  <th className="px-3 py-2 text-right">Grp IV (€)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-right text-slate-600">
                {LISA2_DATA.map(row => (
                  <tr key={row[0]} className="hover:bg-slate-50">
                    <td className="px-3 py-1.5 font-bold text-slate-700 text-center bg-slate-50/30 border-r border-slate-100">{row[0]} cm</td>
                    <td className="px-3 py-1.5">{row[1].toFixed(2)}</td>
                    <td className="px-3 py-1.5">{row[2].toFixed(2)}</td>
                    <td className="px-3 py-1.5">{row[3].toFixed(2)}</td>
                    <td className="px-3 py-1.5">{row[4].toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 p-3 bg-indigo-50/70 rounded-lg text-[10px] leading-relaxed text-indigo-900 border border-indigo-100/50">
            <p className="font-bold uppercase tracking-wider text-indigo-700 mb-1">Grupis jaotused (MS Lisa 2):</p>
            <ul className="list-disc pl-3.5 space-y-0.5">
              <li><strong>Grupp I:</strong> Mänd, Kuusk, Kask, Sanglepp, Lehis, Nulg</li>
              <li><strong>Grupp II:</strong> Tamm, Saar, Jalakas, Vaher, Kadakas ning võõrliigid (v.a. lehis, pappel, nulg)</li>
              <li><strong>Grupp III:</strong> Haab, Pärn, Pappel ja põõsad</li>
              <li><strong>Grupp IV:</strong> Hall-lepp, Paju ja muud pehmed lehtpuud</li>
            </ul>
            <p className="mt-1.5 border-t border-indigo-100 pt-1 text-[10px] italic">
              Kännu läbimõõdul &gt; 102 cm lisandub iga 4 cm kohta:
              I: +{LISA2_STEP[0].toFixed(2)} €, II: +{LISA2_STEP[1].toFixed(2)} €,
              III: +{LISA2_STEP[2].toFixed(2)} €, IV: +{LISA2_STEP[3].toFixed(2)} €.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SummaryCard ---
export function SummaryCard({ project }: { project: Project }) {
  const { rows, kordaja } = project.lisa2;
  const total = rows.reduce((acc, r) => acc + getLisa2Rate(r.diam, r.grupp) * r.arv * kordaja, 0);
  return (
    <section>
      <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-4">Koondnäitajad</h3>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center min-h-[140px] relative overflow-hidden group">
        <p className="text-xs text-slate-500 mb-1 font-medium italic">Kogukahju (MS § 67)</p>
        <p className="text-4xl font-bold text-slate-900 tracking-tight">
          €{total.toLocaleString('et-EE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
          <span>Süsteemne arvutus OK</span>
        </div>
      </div>
    </section>
  );
}

// --- Main Lisa2Panel export ---
export default function Lisa2Panel({ project, onUpdate }: {
  project: Project;
  onUpdate: (updates: Partial<Project>) => void;
}) {
  const handleAdd = useCallback((row: Omit<TreeRow, 'id'>) => {
    const rows = [...project.lisa2.rows, { ...row, id: generateId() }];
    onUpdate({ lisa2: { ...project.lisa2, rows } });
  }, [project.lisa2, onUpdate]);

  const handleRemove = useCallback((id: string) => {
    onUpdate({ lisa2: { ...project.lisa2, rows: project.lisa2.rows.filter(r => r.id !== id) } });
  }, [project.lisa2, onUpdate]);

  const handleUpdateTotal = useCallback((val: string) => {
    onUpdate({ lisa2: { ...project.lisa2, kahju: val } });
  }, [project.lisa2, onUpdate]);

  const handleKordajaChange = useCallback((val: string) => {
    onUpdate({ lisa2: { ...project.lisa2, kordaja: parseFloat(val) } });
  }, [project.lisa2, onUpdate]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <section className="card p-6">
          <SectionTitle>Puu Lisamine</SectionTitle>
          <Lisa2Form onAdd={handleAdd} />
        </section>

        <section className="card">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <SectionTitle>Raiutud puud</SectionTitle>
            <div className="flex items-center gap-2">
              <label className="label-cap !mb-0">Kaitseala kordaja:</label>
              <select
                className="input-field py-1"
                value={project.lisa2.kordaja}
                onChange={e => handleKordajaChange(e.target.value)}
              >
                <option value="1">1.0 (Puudub)</option>
                <option value="3">3.0 (Hoiuala)</option>
                <option value="5">5.0 (Reservaat)</option>
              </select>
            </div>
          </div>
          <Lisa2Table
            rows={project.lisa2.rows}
            kordaja={project.lisa2.kordaja}
            onRemove={handleRemove}
            onUpdateTotal={handleUpdateTotal}
          />
        </section>
      </div>

      <div className="space-y-6">
        <div className="sticky top-0 space-y-6">
          <SummaryCard project={project} />
          <div className="card p-4 bg-emerald-50 border-emerald-100">
            <h4 className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest flex items-center gap-2 mb-2">
              <Info className="w-3 h-3" /> Info
            </h4>
            <p className="text-[11px] text-emerald-700 leading-relaxed font-medium">
              Märgi kännu diameetrid 2cm sammuga. Arvutus käib Metsaseadus Lisa 2 järgi.
            </p>
          </div>
          <Lisa2ReferenceTable />
        </div>
      </div>
    </div>
  );
}
