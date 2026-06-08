import React, { useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Project, TakseerRida, KokkuvoteRida, UldInfo } from '../types';
import { SectionTitle } from './ui';

const RINNE_OPTIONS = ['esimene', 'teine', 'põõsas', 'üksikpuud'];
const PUULIIGID = ['Mänd', 'Kuusk', 'Kask', 'Sanglepp', 'Hall-lepp', 'Haab', 'Tamm', 'Saar', 'Vaher', 'Jalakas', 'Pärn', 'Pappel', 'Remmelgas', 'Muu'];
const TEKKEVIIS = ['looduslik', 'istutus', 'külv', 'muu'];

function generateId() { return Math.random().toString(36).substr(2, 9); }

function makeTakseerRida(): TakseerRida {
  return {
    id: generateId(), rinne: 'esimene', protsent: '', puuliik: '',
    tekkeaasta: '', vanus: '', jooksevVanus: '', korgus: '', labimoot: '',
    rinnaspindala: '', tekkeviis: 'looduslik', maht: '', mahtHa: '', puudeArv: '',
  };
}

// Compact editable cell
const Cell = ({ value, onChange, type = 'text', options, width = 'w-16' }: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  options?: string[];
  width?: string;
}) => {
  if (options) {
    return (
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`${width} text-[11px] border border-slate-200 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400`}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`${width} text-[11px] border border-slate-200 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 font-mono`}
    />
  );
};

// Field with label
const Field = ({ label, value, onChange, width = 'w-full' }: {
  label: string; value: string; onChange: (v: string) => void; width?: string;
}) => (
  <div className="flex flex-col gap-1">
    <label className="label-cap">{label}</label>
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`input-field ${width}`}
    />
  </div>
);

export default function UldinfoPanel({ project, onUpdate }: {
  project: Project;
  onUpdate: (u: Partial<Project>) => void;
}) {
  const { uldinfo } = project;

  const setUldinfo = useCallback((patch: Partial<UldInfo>) => {
    onUpdate({ uldinfo: { ...uldinfo, ...patch } });
  }, [uldinfo, onUpdate]);

  const updateRow = useCallback((id: string, patch: Partial<TakseerRida>) => {
    setUldinfo({
      takseerRead: uldinfo.takseerRead.map(r => r.id === id ? { ...r, ...patch } : r),
    });
  }, [uldinfo.takseerRead, setUldinfo]);

  const addRow = useCallback(() => {
    setUldinfo({ takseerRead: [...uldinfo.takseerRead, makeTakseerRida()] });
  }, [uldinfo.takseerRead, setUldinfo]);

  const removeRow = useCallback((id: string) => {
    if (uldinfo.takseerRead.length <= 1) return;
    setUldinfo({ takseerRead: uldinfo.takseerRead.filter(r => r.id !== id) });
  }, [uldinfo.takseerRead, setUldinfo]);

  const updateKokkuvote = useCallback((id: string, patch: Partial<KokkuvoteRida>) => {
    setUldinfo({
      kokkuvote: uldinfo.kokkuvote.map(r => r.id === id ? { ...r, ...patch } : r),
    });
  }, [uldinfo.kokkuvote, setUldinfo]);

  return (
    <div className="space-y-8">

      {/* ── Asukoht ── */}
      <section className="card p-6">
        <SectionTitle>Asukoht</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Maakond" value={uldinfo.maakond} onChange={v => setUldinfo({ maakond: v })} />
          <Field label="Vald" value={uldinfo.vald} onChange={v => setUldinfo({ vald: v })} />
          <Field label="Üksus / Metsaüksus" value={uldinfo.uksus} onChange={v => setUldinfo({ uksus: v })} />
          <Field label="Katastritunnus" value={uldinfo.katastr} onChange={v => setUldinfo({ katastr: v })} />
          <Field label="Kvartal" value={uldinfo.kvartal} onChange={v => setUldinfo({ kvartal: v })} />
          <Field label="Eraldis" value={uldinfo.eraldis} onChange={v => setUldinfo({ eraldis: v })} />
        </div>
      </section>

      {/* ── Eraldise andmed ── */}
      <section className="card p-6">
        <SectionTitle>Eraldise üldandmed</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Pindala (ha)" value={uldinfo.pindala} onChange={v => setUldinfo({ pindala: v })} />
          <Field label="Keskmine vanus (a)" value={uldinfo.keskVanus} onChange={v => setUldinfo({ keskVanus: v })} />
          <Field label="Raievanus (a)" value={uldinfo.raievanus} onChange={v => setUldinfo({ raievanus: v })} />
          <Field label="Keskmine diameeter (cm)" value={uldinfo.keskDiam} onChange={v => setUldinfo({ keskDiam: v })} />
        </div>
      </section>

      {/* ── Raie-eelne takseerkirjeldus ── */}
      <section className="card">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <SectionTitle>Raie-eelne takseerkirjeldus</SectionTitle>
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 active:scale-95 transition-all"
            aria-label="Lisa rida"
          >
            <Plus className="w-3.5 h-3.5" /> Lisa rida
          </button>
        </div>

        {/* Scrollable table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11px]" role="grid" aria-label="Takseerkirjeldus">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-2 py-2.5 text-left font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Rinne</th>
                <th className="px-2 py-2.5 text-right font-bold text-slate-500 uppercase tracking-wider">%</th>
                <th className="px-2 py-2.5 text-left font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Puuliik</th>
                <th className="px-2 py-2.5 text-right font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Tekke&shy;aasta</th>
                <th className="px-2 py-2.5 text-right font-bold text-slate-500 uppercase tracking-wider">Vanus (a)</th>
                <th className="px-2 py-2.5 text-right font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Jooksev vanus (a)</th>
                <th className="px-2 py-2.5 text-right font-bold text-slate-500 uppercase tracking-wider">Kõrgus (m)</th>
                <th className="px-2 py-2.5 text-right font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Läbimõõt (cm)</th>
                <th className="px-2 py-2.5 text-right font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Rinnas&shy;pindala (m²/ha)</th>
                <th className="px-2 py-2.5 text-left font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Tekke&shy;viis</th>
                <th className="px-2 py-2.5 text-right font-bold text-slate-500 uppercase tracking-wider">Maht (tm)</th>
                <th className="px-2 py-2.5 text-right font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Maht (tm/ha)</th>
                <th className="px-2 py-2.5 text-right font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Puude arv (tk/ha)</th>
                <th className="px-2 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {uldinfo.takseerRead.map((row, idx) => (
                <tr key={row.id} className="hover:bg-slate-50 group">
                  <td className="px-2 py-1.5">
                    <Cell value={row.rinne} onChange={v => updateRow(row.id, { rinne: v })} options={RINNE_OPTIONS} width="w-24" />
                  </td>
                  <td className="px-2 py-1.5">
                    <Cell value={row.protsent} onChange={v => updateRow(row.id, { protsent: v })} type="number" width="w-14" />
                  </td>
                  <td className="px-2 py-1.5">
                    <Cell value={row.puuliik} onChange={v => updateRow(row.id, { puuliik: v })} options={PUULIIGID} width="w-24" />
                  </td>
                  <td className="px-2 py-1.5">
                    <Cell value={row.tekkeaasta} onChange={v => updateRow(row.id, { tekkeaasta: v })} type="number" width="w-16" />
                  </td>
                  <td className="px-2 py-1.5">
                    <Cell value={row.vanus} onChange={v => updateRow(row.id, { vanus: v })} type="number" width="w-14" />
                  </td>
                  <td className="px-2 py-1.5">
                    <Cell value={row.jooksevVanus} onChange={v => updateRow(row.id, { jooksevVanus: v })} type="number" width="w-14" />
                  </td>
                  <td className="px-2 py-1.5">
                    <Cell value={row.korgus} onChange={v => updateRow(row.id, { korgus: v })} type="number" width="w-14" />
                  </td>
                  <td className="px-2 py-1.5">
                    <Cell value={row.labimoot} onChange={v => updateRow(row.id, { labimoot: v })} type="number" width="w-14" />
                  </td>
                  <td className="px-2 py-1.5">
                    <Cell value={row.rinnaspindala} onChange={v => updateRow(row.id, { rinnaspindala: v })} type="number" width="w-16" />
                  </td>
                  <td className="px-2 py-1.5">
                    <Cell value={row.tekkeviis} onChange={v => updateRow(row.id, { tekkeviis: v })} options={TEKKEVIIS} width="w-24" />
                  </td>
                  <td className="px-2 py-1.5">
                    <Cell value={row.maht} onChange={v => updateRow(row.id, { maht: v })} type="number" width="w-16" />
                  </td>
                  <td className="px-2 py-1.5">
                    <Cell value={row.mahtHa} onChange={v => updateRow(row.id, { mahtHa: v })} type="number" width="w-16" />
                  </td>
                  <td className="px-2 py-1.5">
                    <Cell value={row.puudeArv} onChange={v => updateRow(row.id, { puudeArv: v })} type="number" width="w-16" />
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      onClick={() => removeRow(row.id)}
                      disabled={uldinfo.takseerRead.length <= 1}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-rose-500 disabled:cursor-not-allowed"
                      aria-label="Kustuta rida"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Kokkuvõte ── */}
      <section className="card">
        <div className="p-6 border-b border-slate-100">
          <SectionTitle>Kokkuvõte</SectionTitle>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11px]" role="grid" aria-label="Kokkuvõte">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 text-left font-bold text-slate-500 uppercase tracking-wider">Rinne</th>
                <th className="px-4 py-2.5 text-right font-bold text-slate-500 uppercase tracking-wider">Maht (tm)</th>
                <th className="px-4 py-2.5 text-right font-bold text-slate-500 uppercase tracking-wider">Maht (tm/ha)</th>
                <th className="px-4 py-2.5 text-right font-bold text-slate-500 uppercase tracking-wider">Täius (%)</th>
                <th className="px-4 py-2.5 text-right font-bold text-slate-500 uppercase tracking-wider">Rinnaspindala (m²/ha)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {uldinfo.kokkuvote.map((row, idx) => {
                const isKokku = row.rinne === 'Kokku';
                return (
                  <tr key={row.id} className={isKokku ? 'bg-slate-50 font-bold' : 'hover:bg-slate-50'}>
                    <td className="px-4 py-2 font-bold text-slate-700">{row.rinne}</td>
                    <td className="px-4 py-2">
                      <Cell value={row.mahtTm} onChange={v => updateKokkuvote(row.id, { mahtTm: v })} type="number" width="w-20" />
                    </td>
                    <td className="px-4 py-2">
                      <Cell value={row.mahtTmHa} onChange={v => updateKokkuvote(row.id, { mahtTmHa: v })} type="number" width="w-20" />
                    </td>
                    <td className="px-4 py-2">
                      <Cell value={row.taiusProtsent} onChange={v => updateKokkuvote(row.id, { taiusProtsent: v })} type="number" width="w-20" />
                    </td>
                    <td className="px-4 py-2">
                      <Cell value={row.rinnaspindala} onChange={v => updateKokkuvote(row.id, { rinnaspindala: v })} type="number" width="w-20" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
