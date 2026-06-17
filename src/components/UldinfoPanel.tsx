import React, { useCallback, useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Project, TakseerRida, KokkuvoteRida, UldInfo } from '../types';
import { SectionTitle } from './ui';
import MootmisPanel from './MootmisPanel';

const RINNE_OPTIONS = ['esimene', 'teine', 'põõsas', 'üksikpuud'];
const PUULIIGID = ['Mänd', 'Kuusk', 'Kask', 'Sanglepp', 'Hall-lepp', 'Haab', 'Tamm', 'Saar', 'Vaher', 'Jalakas', 'Pärn', 'Pappel', 'Remmelgas', 'Muu'];
const TEKKEVIIS = ['looduslik', 'istutus', 'külv', 'muu'];

function genId() { return Math.random().toString(36).substr(2, 9); }

function makeTakseerRida(): TakseerRida {
  return { id: genId(), rinne: 'esimene', protsent: '', puuliik: '', tekkeaasta: '', vanus: '', jooksevVanus: '', korgus: '', labimoot: '', rinnaspindala: '', tekkeviis: 'looduslik', maht: '', mahtHa: '', puudeArv: '' };
}

const Cell = ({ value, onChange, type = 'text', options, width = 'w-16' }: { value: string; onChange: (v: string) => void; type?: string; options?: string[]; width?: string; }) => {
  if (options) return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className={`${width} text-[11px] border border-slate-200 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-forest-500 focus:border-forest-400`}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
  return <input type={type} value={value} onChange={e => onChange(e.target.value)}
    className={`${width} text-[11px] border border-slate-200 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-forest-500 focus:border-forest-400 font-mono`} />;
};

const Field = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div className="flex flex-col gap-1">
    <label className="label-cap">{label}</label>
    <input type="text" value={value} onChange={e => onChange(e.target.value)} className="input-field w-full" />
  </div>
);

function TakseerTable({ rows, kokkuvote, onUpdateRow, onAddRow, onRemoveRow, onUpdateKokkuvote }: {
  rows: TakseerRida[]; kokkuvote: KokkuvoteRida[];
  onUpdateRow: (id: string, patch: Partial<TakseerRida>) => void;
  onAddRow: () => void; onRemoveRow: (id: string) => void;
  onUpdateKokkuvote: (id: string, patch: Partial<KokkuvoteRida>) => void;
}) {
  const autoKokku = useMemo(() => {
    const sumRows = kokkuvote.filter(r => r.rinne !== 'Kokku');
    const sum = (field: keyof KokkuvoteRida) => sumRows.reduce((acc, r) => acc + (parseFloat(r[field] as string) || 0), 0);
    return { mahtTm: sum('mahtTm').toFixed(1), mahtTmHa: sum('mahtTmHa').toFixed(1), taiusProtsent: sum('taiusProtsent').toFixed(0), rinnaspindala: sum('rinnaspindala').toFixed(1) };
  }, [kokkuvote]);

  return (
    <div className="space-y-0">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[11px]" role="grid">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['Rinne','%','Puuliik','Tekke&shy;aasta','Vanus (a)','Jooksev vanus (a)','Kõrgus (m)','Läbimõõt (cm)','Rinnas&shy;pindala (m²/ha)','Tekke&shy;viis','Maht (tm)','Maht (tm/ha)','Puude arv (tk/ha)',''].map((h, i) => (
                <th key={i} className="px-2 py-2.5 text-left font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-[10px]" dangerouslySetInnerHTML={{ __html: h }} />
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(row => (
              <tr key={row.id} className="hover:bg-slate-50 group">
                <td className="px-2 py-1.5"><Cell value={row.rinne} onChange={v => onUpdateRow(row.id, { rinne: v })} options={RINNE_OPTIONS} width="w-24" /></td>
                <td className="px-2 py-1.5"><Cell value={row.protsent} onChange={v => onUpdateRow(row.id, { protsent: v })} type="number" width="w-14" /></td>
                <td className="px-2 py-1.5"><Cell value={row.puuliik} onChange={v => onUpdateRow(row.id, { puuliik: v })} options={PUULIIGID} width="w-24" /></td>
                <td className="px-2 py-1.5"><Cell value={row.tekkeaasta} onChange={v => onUpdateRow(row.id, { tekkeaasta: v })} type="number" width="w-16" /></td>
                <td className="px-2 py-1.5"><Cell value={row.vanus} onChange={v => onUpdateRow(row.id, { vanus: v })} type="number" width="w-14" /></td>
                <td className="px-2 py-1.5"><Cell value={row.jooksevVanus} onChange={v => onUpdateRow(row.id, { jooksevVanus: v })} type="number" width="w-14" /></td>
                <td className="px-2 py-1.5"><Cell value={row.korgus} onChange={v => onUpdateRow(row.id, { korgus: v })} type="number" width="w-14" /></td>
                <td className="px-2 py-1.5"><Cell value={row.labimoot} onChange={v => onUpdateRow(row.id, { labimoot: v })} type="number" width="w-14" /></td>
                <td className="px-2 py-1.5"><Cell value={row.rinnaspindala} onChange={v => onUpdateRow(row.id, { rinnaspindala: v })} type="number" width="w-16" /></td>
                <td className="px-2 py-1.5"><Cell value={row.tekkeviis} onChange={v => onUpdateRow(row.id, { tekkeviis: v })} options={TEKKEVIIS} width="w-24" /></td>
                <td className="px-2 py-1.5"><Cell value={row.maht} onChange={v => onUpdateRow(row.id, { maht: v })} type="number" width="w-16" /></td>
                <td className="px-2 py-1.5"><Cell value={row.mahtHa} onChange={v => onUpdateRow(row.id, { mahtHa: v })} type="number" width="w-16" /></td>
                <td className="px-2 py-1.5"><Cell value={row.puudeArv} onChange={v => onUpdateRow(row.id, { puudeArv: v })} type="number" width="w-16" /></td>
                <td className="px-2 py-1.5">
                  <button onClick={() => onRemoveRow(row.id)} disabled={rows.length <= 1}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-rose-500 disabled:cursor-not-allowed" aria-label="Kustuta rida">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-3 border-t border-slate-100">
        <button onClick={onAddRow} className="flex items-center gap-1.5 px-3 py-1.5 bg-forest-600 text-white rounded-lg text-xs font-bold hover:bg-forest-700 active:scale-95 transition-all">
          <Plus className="w-3.5 h-3.5" /> Lisa rida
        </button>
      </div>
      <div className="overflow-x-auto border-t-2 border-slate-200">
        <table className="w-full border-collapse text-[11px]">
          <thead className="bg-slate-100 border-b border-slate-200">
            <tr>
              <th className="px-4 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Rinne</th>
              <th className="px-4 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">Maht (tm)</th>
              <th className="px-4 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">Maht (tm/ha)</th>
              <th className="px-4 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">Täius (%)</th>
              <th className="px-4 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">Rinnaspindala (m²/ha)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {kokkuvote.map(row => {
              const isKokku = row.rinne === 'Kokku';
              return (
                <tr key={row.id} className={isKokku ? 'bg-slate-50 border-t-2 border-slate-300' : 'hover:bg-slate-50'}>
                  <td className={`px-4 py-2 font-bold ${isKokku ? 'text-slate-900' : 'text-slate-600'}`}>{row.rinne}</td>
                  {isKokku ? (
                    <>
                      <td className="px-4 py-2 text-right font-mono font-bold text-forest-700">{autoKokku.mahtTm}</td>
                      <td className="px-4 py-2 text-right font-mono font-bold text-forest-700">{autoKokku.mahtTmHa}</td>
                      <td className="px-4 py-2 text-right font-mono font-bold text-forest-700">{autoKokku.taiusProtsent}</td>
                      <td className="px-4 py-2 text-right font-mono font-bold text-forest-700">{autoKokku.rinnaspindala}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2"><Cell value={row.mahtTm} onChange={v => onUpdateKokkuvote(row.id, { mahtTm: v })} type="number" width="w-20" /></td>
                      <td className="px-4 py-2"><Cell value={row.mahtTmHa} onChange={v => onUpdateKokkuvote(row.id, { mahtTmHa: v })} type="number" width="w-20" /></td>
                      <td className="px-4 py-2"><Cell value={row.taiusProtsent} onChange={v => onUpdateKokkuvote(row.id, { taiusProtsent: v })} type="number" width="w-20" /></td>
                      <td className="px-4 py-2"><Cell value={row.rinnaspindala} onChange={v => onUpdateKokkuvote(row.id, { rinnaspindala: v })} type="number" width="w-20" /></td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function UldinfoPanel({ project, onUpdate }: { project: Project; onUpdate: (u: Partial<Project>) => void; }) {
  const { uldinfo } = project;
  const setUldinfo = useCallback((patch: Partial<UldInfo>) => onUpdate({ uldinfo: { ...uldinfo, ...patch } }), [uldinfo, onUpdate]);

  const updateRaieEelneRow = useCallback((id: string, patch: Partial<TakseerRida>) => setUldinfo({ takseerRead: uldinfo.takseerRead.map(r => r.id === id ? { ...r, ...patch } : r) }), [uldinfo.takseerRead, setUldinfo]);
  const addRaieEelneRow = useCallback(() => setUldinfo({ takseerRead: [...uldinfo.takseerRead, makeTakseerRida()] }), [uldinfo.takseerRead, setUldinfo]);
  const removeRaieEelneRow = useCallback((id: string) => { if (uldinfo.takseerRead.length <= 1) return; setUldinfo({ takseerRead: uldinfo.takseerRead.filter(r => r.id !== id) }); }, [uldinfo.takseerRead, setUldinfo]);
  const updateRaieEelneKokkuvote = useCallback((id: string, patch: Partial<KokkuvoteRida>) => setUldinfo({ kokkuvote: uldinfo.kokkuvote.map(r => r.id === id ? { ...r, ...patch } : r) }), [uldinfo.kokkuvote, setUldinfo]);

  const updateRaieJargneRow = useCallback((id: string, patch: Partial<TakseerRida>) => setUldinfo({ raieJargneRead: uldinfo.raieJargneRead.map(r => r.id === id ? { ...r, ...patch } : r) }), [uldinfo.raieJargneRead, setUldinfo]);
  const addRaieJargneRow = useCallback(() => setUldinfo({ raieJargneRead: [...uldinfo.raieJargneRead, makeTakseerRida()] }), [uldinfo.raieJargneRead, setUldinfo]);
  const removeRaieJargneRow = useCallback((id: string) => { if (uldinfo.raieJargneRead.length <= 1) return; setUldinfo({ raieJargneRead: uldinfo.raieJargneRead.filter(r => r.id !== id) }); }, [uldinfo.raieJargneRead, setUldinfo]);
  const updateRaieJargneKokkuvote = useCallback((id: string, patch: Partial<KokkuvoteRida>) => setUldinfo({ raieJargneKokkuvote: uldinfo.raieJargneKokkuvote.map(r => r.id === id ? { ...r, ...patch } : r) }), [uldinfo.raieJargneKokkuvote, setUldinfo]);

  return (
    <div className="space-y-8">
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

      <section className="card p-6">
        <SectionTitle>Eraldise üldandmed</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Pindala (ha)" value={uldinfo.pindala} onChange={v => setUldinfo({ pindala: v })} />
          <Field label="Keskmine vanus (a)" value={uldinfo.keskVanus} onChange={v => setUldinfo({ keskVanus: v })} />
          <Field label="Raievanus (a)" value={uldinfo.raievanus} onChange={v => setUldinfo({ raievanus: v })} />
          <Field label="Keskmine diameeter (cm)" value={uldinfo.keskDiam} onChange={v => setUldinfo({ keskDiam: v })} />
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="p-6 border-b border-slate-100"><SectionTitle>Raie-eelne takseerkirjeldus</SectionTitle></div>
        <TakseerTable rows={uldinfo.takseerRead} kokkuvote={uldinfo.kokkuvote} onUpdateRow={updateRaieEelneRow} onAddRow={addRaieEelneRow} onRemoveRow={removeRaieEelneRow} onUpdateKokkuvote={updateRaieEelneKokkuvote} />
      </section>

      <section className="card overflow-hidden">
        <div className="p-6 border-b border-slate-100"><SectionTitle>Mõõtmisandmed metsas</SectionTitle></div>
        <div className="p-6"><MootmisPanel project={project} onUpdate={onUpdate} /></div>
      </section>

      <section className="card overflow-hidden">
        <div className="p-6 border-b border-slate-100"><SectionTitle>Raie-järgne takseerkirjeldus</SectionTitle></div>
        <TakseerTable rows={uldinfo.raieJargneRead} kokkuvote={uldinfo.raieJargneKokkuvote} onUpdateRow={updateRaieJargneRow} onAddRow={addRaieJargneRow} onRemoveRow={removeRaieJargneRow} onUpdateKokkuvote={updateRaieJargneKokkuvote} />
      </section>
    </div>
  );
}
