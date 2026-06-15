import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Trash2, ArrowRight, Info } from 'lucide-react';
import { Project, MootmisPuu, MootmisKand, MootmisData, TakseerRida, KokkuvoteRida } from '../types';
import { calcG, getGn, stumpToD13, calcStandFactor } from '../lib/calculations';
import { SectionTitle } from './ui';

const PUULIIGID = ['Mänd', 'Kuusk', 'Kask', 'Sanglepp', 'Hall-lepp', 'Haab', 'Tamm', 'Saar', 'Vaher', 'Jalakas', 'Pärn', 'Muu'];

const LIIK_TO_CALC: Record<string, string> = {
  'Mänd': 'mand', 'Kuusk': 'kuusk', 'Kask': 'kask', 'Sanglepp': 'sanglepp',
  'Hall-lepp': 'sanglepp', 'Haab': 'haab', 'Tamm': 'tamm', 'Saar': 'tamm',
  'Vaher': 'tamm', 'Jalakas': 'tamm', 'Pärn': 'kask', 'Muu': 'mand',
};

function genId() { return Math.random().toString(36).substr(2, 9); }

export default function MootmisPanel({ project, onUpdate }: {
  project: Project;
  onUpdate: (u: Partial<Project>) => void;
}) {
  const [activeTab, setActiveTab] = useState<'puud' | 'kandud'>('puud');
  const [notification, setNotification] = useState<string | null>(null);

  const { uldinfo } = project;
  const mootmised = uldinfo.mootmised;

  const setMootmised = useCallback((patch: Partial<MootmisData>) => {
    onUpdate({ uldinfo: { ...uldinfo, mootmised: { ...mootmised, ...patch } } });
  }, [uldinfo, mootmised, onUpdate]);

  // Get height from raie-eelne takseerkirjeldus
  const korgusRaieEelsest = useMemo(() => {
    const rida = uldinfo.takseerRead.find(r => r.rinne === mootmised.rinne && r.korgus);
    return parseFloat(rida?.korgus || '0');
  }, [uldinfo.takseerRead, mootmised.rinne]);

  const pindala = parseFloat(mootmised.pindala) || 0;

  // Moodul A — kasvavad puud
  const puudArvutused = useMemo(() => {
    if (!pindala || mootmised.puud.length === 0) return null;
    const grouped: Record<string, { count: number; totalG: number; diameters: number[] }> = {};
    for (const p of mootmised.puud) {
      const d = parseFloat(p.diameeter);
      if (!d) continue;
      if (!grouped[p.puuliik]) grouped[p.puuliik] = { count: 0, totalG: 0, diameters: [] };
      grouped[p.puuliik].count++;
      grouped[p.puuliik].totalG += calcG(d, 1);
      grouped[p.puuliik].diameters.push(d);
    }
    const rows = Object.entries(grouped).map(([liik, data]) => {
      const gHa = data.totalG / pindala;
      const avgD = data.diameters.reduce((a, b) => a + b, 0) / data.diameters.length;
      const calcSpecies = LIIK_TO_CALC[liik] || 'mand';
      const gn = korgusRaieEelsest > 0 ? getGn(calcSpecies, korgusRaieEelsest) : 0;
      const taius = gn > 0 ? (gHa / gn) * 100 : 0;
      const tkHa = data.count / pindala;
      return { liik, count: data.count, avgD, gHa, taius, tkHa };
    });
    const totalG = rows.reduce((a, r) => a + r.gHa, 0);
    const totalTk = rows.reduce((a, r) => a + r.tkHa, 0);
    const avgTaius = rows.length > 0 ? rows.reduce((a, r) => a + r.taius, 0) / rows.length : 0;
    return { rows, totalG, totalTk, avgTaius };
  }, [mootmised.puud, pindala, korgusRaieEelsest]);

  // Moodul B — kännud
  const kandudArvutused = useMemo(() => {
    if (!pindala || mootmised.kandud.length === 0) return null;
    const grouped: Record<string, { count: number; totalMaht: number; diameters: number[] }> = {};
    for (const k of mootmised.kandud) {
      const d = parseFloat(k.diameeter);
      if (!d) continue;
      const calcSpecies = LIIK_TO_CALC[k.puuliik] || 'mand';
      const d13 = stumpToD13(calcSpecies, d);
      if (!grouped[k.puuliik]) grouped[k.puuliik] = { count: 0, totalMaht: 0, diameters: [] };
      grouped[k.puuliik].count++;
      grouped[k.puuliik].diameters.push(d13);
      if (korgusRaieEelsest > 0 && d13 > 0) {
        const f = calcStandFactor(calcSpecies, korgusRaieEelsest);
        grouped[k.puuliik].totalMaht += calcG(d13, 1) * korgusRaieEelsest * f;
      }
    }
    const rows = Object.entries(grouped).map(([liik, data]) => ({
      liik, count: data.count,
      avgD13: data.diameters.reduce((a, b) => a + b, 0) / data.diameters.length,
      mahtHa: data.totalMaht / pindala,
      mahtTm: data.totalMaht,
      tkHa: data.count / pindala,
    }));
    return { rows, totalMahtTm: rows.reduce((a, r) => a + r.mahtTm, 0), totalMahtHa: rows.reduce((a, r) => a + r.mahtHa, 0) };
  }, [mootmised.kandud, pindala, korgusRaieEelsest]);

  const handleKannaTakseerisse = useCallback(() => {
    if (!puudArvutused) return;
    const newRows: TakseerRida[] = puudArvutused.rows.map(r => ({
      id: genId(), rinne: mootmised.rinne, protsent: r.taius.toFixed(0),
      puuliik: r.liik, tekkeaasta: '', vanus: '', jooksevVanus: '',
      korgus: korgusRaieEelsest > 0 ? String(korgusRaieEelsest) : '',
      labimoot: r.avgD.toFixed(1), rinnaspindala: r.gHa.toFixed(2), tekkeviis: 'looduslik',
      maht: kandudArvutused?.rows.find(k => k.liik === r.liik)?.mahtTm.toFixed(2) || '',
      mahtHa: kandudArvutused?.rows.find(k => k.liik === r.liik)?.mahtHa.toFixed(2) || '',
      puudeArv: r.tkHa.toFixed(0),
    }));

    const newKokkuvote = uldinfo.raieJargneKokkuvote.map(r => {
      if (r.rinne === 'Esimene') return {
        ...r,
        rinnaspindala: puudArvutused.totalG.toFixed(2),
        taiusProtsent: puudArvutused.avgTaius.toFixed(0),
        mahtTmHa: kandudArvutused ? kandudArvutused.totalMahtHa.toFixed(2) : r.mahtTmHa,
        mahtTm: kandudArvutused ? kandudArvutused.totalMahtTm.toFixed(2) : r.mahtTm,
      };
      return r;
    });

    onUpdate({ uldinfo: { ...uldinfo, raieJargneRead: newRows.length > 0 ? newRows : uldinfo.raieJargneRead, raieJargneKokkuvote: newKokkuvote } });
    setNotification('Andmed kantud raie-järgsesse takseerkirjeldusse!');
    setTimeout(() => setNotification(null), 3000);
  }, [puudArvutused, kandudArvutused, mootmised.rinne, korgusRaieEelsest, uldinfo, onUpdate]);

  const updatePuu = (id: string, field: keyof MootmisPuu, value: string) =>
    setMootmised({ puud: mootmised.puud.map(x => x.id === id ? { ...x, [field]: value } : x) });
  const updateKand = (id: string, field: keyof MootmisKand, value: string) =>
    setMootmised({ kandud: mootmised.kandud.map(x => x.id === id ? { ...x, [field]: value } : x) });

  return (
    <div className="space-y-6">
      {notification && (
        <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-medium text-emerald-800 flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full" />{notification}
        </div>
      )}

      {/* Seadistus */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1">
          <label className="label-cap" htmlFor="mootmis-pindala">Raieala pindala (ha)</label>
          <input id="mootmis-pindala" type="number" className="input-field w-full" placeholder="nt 1.25"
            value={mootmised.pindala} onChange={e => setMootmised({ pindala: e.target.value })} />
        </div>
        <div className="space-y-1">
          <label className="label-cap" htmlFor="mootmis-rinne">Rinne (kõrgus raie-eelsest)</label>
          <select id="mootmis-rinne" className="input-field w-full" value={mootmised.rinne} onChange={e => setMootmised({ rinne: e.target.value })}>
            <option value="esimene">Esimene rinne</option>
            <option value="teine">Teine rinne</option>
          </select>
          {korgusRaieEelsest > 0
            ? <p className="text-[11px] text-emerald-600 font-medium mt-1">✓ Kõrgus raie-eelsest: <strong>{korgusRaieEelsest} m</strong></p>
            : <p className="text-[11px] text-amber-600 font-medium mt-1 flex items-center gap-1"><Info className="w-3 h-3" /> Sisesta kõrgus raie-eelsesse takseerkirjeldusse</p>
          }
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 w-fit">
        <button onClick={() => setActiveTab('puud')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'puud' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}>
          Kasvavad puud (G, täius)
        </button>
        <button onClick={() => setActiveTab('kandud')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'kandud' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}>
          Kännud (raiemaht)
        </button>
      </div>

      {/* Moodul A */}
      {activeTab === 'puud' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="card overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div><div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Kasvavad puud</div><div className="text-[11px] text-slate-400 mt-0.5">d₁.₃ mõõtmised (1.3m kõrguselt)</div></div>
              <button onClick={() => setMootmised({ puud: [...mootmised.puud, { id: genId(), puuliik: 'Mänd', diameeter: '' }] })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 active:scale-95 transition-all">
                <Plus className="w-3.5 h-3.5" /> Lisa puu
              </button>
            </div>
            {mootmised.puud.length === 0
              ? <div className="p-8 text-center text-slate-400 text-xs italic">Lisa puude mõõtmisandmed siia.</div>
              : <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-[11px] border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                      <tr><th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">#</th><th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Puuliik</th><th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">d₁.₃ (cm)</th><th className="px-3 py-2 w-8" /></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {mootmised.puud.map((p, idx) => (
                        <tr key={p.id} className="hover:bg-slate-50 group">
                          <td className="px-3 py-1.5 font-mono text-slate-400">{idx + 1}</td>
                          <td className="px-3 py-1.5">
                            <select value={p.puuliik} onChange={e => updatePuu(p.id, 'puuliik', e.target.value)}
                              className="text-[11px] border border-slate-200 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 w-24">
                              {PUULIIGID.map(l => <option key={l}>{l}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-1.5">
                            <input type="number" value={p.diameeter} onChange={e => updatePuu(p.id, 'diameeter', e.target.value)}
                              className="w-16 text-[11px] border border-slate-200 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 font-mono text-right" placeholder="24.0" />
                          </td>
                          <td className="px-3 py-1.5">
                            <button onClick={() => setMootmised({ puud: mootmised.puud.filter(x => x.id !== p.id) })}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-rose-500" aria-label="Kustuta">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            }
            {mootmised.puud.length > 0 && <div className="p-3 border-t border-slate-100 text-[11px] text-slate-400 font-mono">{mootmised.puud.length} mõõtmist sisestatud</div>}
          </section>

          <div className="space-y-4">
            {!pindala && <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 font-medium">Sisesta raieala pindala arvutuste nägemiseks.</div>}
            {puudArvutused && pindala > 0 && (
              <section className="card overflow-hidden">
                <div className="p-4 border-b border-slate-100"><div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Arvutustulemused</div></div>
                <table className="w-full text-[11px] border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr><th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Puuliik</th><th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">Tk</th><th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">Tk/ha</th><th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">Ø d (cm)</th><th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">G (m²/ha)</th><th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">Täius (%)</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {puudArvutused.rows.map(r => (
                      <tr key={r.liik} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-bold">{r.liik}</td>
                        <td className="px-3 py-2 text-right font-mono">{r.count}</td>
                        <td className="px-3 py-2 text-right font-mono">{r.tkHa.toFixed(0)}</td>
                        <td className="px-3 py-2 text-right font-mono">{r.avgD.toFixed(1)}</td>
                        <td className="px-3 py-2 text-right font-mono">{r.gHa.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold">{r.taius.toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                    <tr>
                      <td className="px-3 py-2 font-bold text-slate-600" colSpan={2}>Kokku</td>
                      <td className="px-3 py-2 text-right font-mono font-bold">{puudArvutused.totalTk.toFixed(0)}</td>
                      <td className="px-3 py-2" />
                      <td className="px-3 py-2 text-right font-mono font-bold text-indigo-700">{puudArvutused.totalG.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-indigo-700">{puudArvutused.avgTaius.toFixed(0)}%</td>
                    </tr>
                  </tfoot>
                </table>
                {!korgusRaieEelsest && <div className="px-4 py-2 bg-amber-50 text-[11px] text-amber-700 border-t border-amber-100">Täius arvutatakse kui kõrgus on raie-eelses takseerkirjelduses olemas.</div>}
              </section>
            )}
          </div>
        </div>
      )}

      {/* Moodul B — Kännud */}
      {activeTab === 'kandud' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="card overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div><div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Raiutud kännud</div><div className="text-[11px] text-slate-400 mt-0.5">Kännu diameeter → d₁.₃ → raiemaht</div></div>
              <button onClick={() => setMootmised({ kandud: [...mootmised.kandud, { id: genId(), puuliik: 'Mänd', diameeter: '' }] })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 active:scale-95 transition-all">
                <Plus className="w-3.5 h-3.5" /> Lisa känd
              </button>
            </div>
            {mootmised.kandud.length === 0
              ? <div className="p-8 text-center text-slate-400 text-xs italic">Lisa kändude mõõtmisandmed siia.</div>
              : <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-[11px] border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                      <tr><th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">#</th><th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Puuliik</th><th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">Kännu d (cm)</th><th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">d₁.₃ (cm)</th><th className="px-3 py-2 w-8" /></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {mootmised.kandud.map((k, idx) => {
                        const d13 = stumpToD13(LIIK_TO_CALC[k.puuliik] || 'mand', parseFloat(k.diameeter) || 0);
                        return (
                          <tr key={k.id} className="hover:bg-slate-50 group">
                            <td className="px-3 py-1.5 font-mono text-slate-400">{idx + 1}</td>
                            <td className="px-3 py-1.5">
                              <select value={k.puuliik} onChange={e => updateKand(k.id, 'puuliik', e.target.value)}
                                className="text-[11px] border border-slate-200 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 w-24">
                                {PUULIIGID.map(l => <option key={l}>{l}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-1.5">
                              <input type="number" value={k.diameeter} onChange={e => updateKand(k.id, 'diameeter', e.target.value)}
                                className="w-16 text-[11px] border border-slate-200 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 font-mono text-right" placeholder="28.0" />
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono text-slate-500">{k.diameeter ? d13.toFixed(1) : '—'}</td>
                            <td className="px-3 py-1.5">
                              <button onClick={() => setMootmised({ kandud: mootmised.kandud.filter(x => x.id !== k.id) })}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-rose-500" aria-label="Kustuta">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
            }
            {mootmised.kandud.length > 0 && <div className="p-3 border-t border-slate-100 text-[11px] text-slate-400 font-mono">{mootmised.kandud.length} kändu sisestatud</div>}
          </section>

          <div className="space-y-4">
            {!pindala && <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 font-medium">Sisesta raieala pindala arvutuste nägemiseks.</div>}
            {kandudArvutused && pindala > 0 && (
              <section className="card overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Raiemaht</div>
                  {!korgusRaieEelsest && <div className="text-[11px] text-amber-600 mt-1">Tm arvutatakse kui kõrgus on raie-eelses takseerkirjelduses.</div>}
                </div>
                <table className="w-full text-[11px] border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr><th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Puuliik</th><th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">Tk</th><th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">Ø d₁.₃ (cm)</th><th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">Maht (tm)</th><th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">Maht (tm/ha)</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {kandudArvutused.rows.map(r => (
                      <tr key={r.liik} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-bold">{r.liik}</td>
                        <td className="px-3 py-2 text-right font-mono">{r.count}</td>
                        <td className="px-3 py-2 text-right font-mono">{r.avgD13.toFixed(1)}</td>
                        <td className="px-3 py-2 text-right font-mono">{r.mahtTm.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-mono">{r.mahtHa.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                    <tr>
                      <td className="px-3 py-2 font-bold text-slate-600" colSpan={3}>Kokku</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-indigo-700">{kandudArvutused.totalMahtTm.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-indigo-700">{kandudArvutused.totalMahtHa.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </section>
            )}
          </div>
        </div>
      )}

      {/* Kanna takseerkirjeldusse */}
      {(puudArvutused || kandudArvutused) && pindala > 0 && (
        <div className="flex justify-end">
          <button onClick={handleKannaTakseerisse}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm active:scale-95 transition-all shadow-sm">
            Kanna raie-järgsesse takseerkirjeldusse
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
