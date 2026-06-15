import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Trash2, Info, ChevronDown, ChevronUp, Variable, Calculator } from 'lucide-react';
import { Project, TreeRow } from '../types';
import { getLisa3Rate, calcKorrigeeritudPindala, calcG } from '../lib/calculations';
import { LISA3_RATES } from '../lib/constants';
import { generateId } from '../lib/utils';
import { SectionTitle, ResultBox, SaveButton } from './ui';
import { useFlash } from '../lib/useTimeout';
import MapPolygonSelector from './MapPolygonSelector';

function Lisa3ReferenceTable() {
  const [isOpen, setIsOpen] = useState(false);
  const speciesLabels: Record<string, string> = { mand: 'Mänd', kuusk: 'Kuusk / Kask / Sanglepp', tamm: 'Tamm / Saar / Vaher / Jalakas', haab: 'Haab' };
  const displaySpecies = ['mand', 'kuusk', 'tamm', 'haab'];
  return (
    <div className="card overflow-hidden border border-slate-200 shadow-sm">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 text-left">
        <div className="flex items-center gap-2"><Variable className="w-4 h-4 text-indigo-500" /><span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Lisa 3 kahjumäärade tabel</span></div>
        <span className="text-xs text-indigo-600 font-semibold flex items-center gap-1">{isOpen ? <>Peida <ChevronUp className="w-4 h-4" /></> : <>Näita <ChevronDown className="w-4 h-4" /></>}</span>
      </button>
      {isOpen && (
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="overflow-x-auto max-h-[300px] custom-scrollbar rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 font-bold text-slate-500 uppercase tracking-wider">
                <tr><th className="px-3 py-2 border-r border-slate-100">Enamuspuuliik</th><th className="px-3 py-2 text-right">Vanus (a)</th><th className="px-3 py-2 text-right">Määr (€/m²/ha)</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displaySpecies.map(species => {
                  const rates = LISA3_RATES[species];
                  return (
                    <React.Fragment key={species}>
                      {rates.map((row, idx) => {
                        const prevAge = idx === 0 ? 0 : rates[idx-1][0];
                        const displayAge = row[0] === 999 ? `üle ${prevAge}` : `${prevAge+1} kuni ${row[0]}`;
                        return (
                          <tr key={`${species}-${row[0]}`} className="hover:bg-slate-50">
                            {idx === 0 ? <td rowSpan={rates.length} className="px-3 py-1.5 font-bold text-slate-800 border-r border-slate-100 bg-slate-50/20 align-top text-xs">{speciesLabels[species]}</td> : null}
                            <td className="px-3 py-1 font-mono text-right text-slate-500 border-r border-slate-100">{displayAge} a</td>
                            <td className="px-3 py-1 font-mono text-right text-slate-900 font-bold">{row[1] > 0 ? `€${row[1].toFixed(0)}` : '—'}</td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 p-3 bg-indigo-50/70 rounded-lg text-[10px] text-indigo-900 border border-indigo-100/50">Kahjumäär eurodes iga rinnaspindala (m²/ha) puudujääva osa kohta. Vanuse 0–20 ja 101+ korral kahju ei arvestata (—).</p>
        </div>
      )}
    </div>
  );
}

export default function Lisa3Panel({ project, onUpdate }: { project: Project; onUpdate: (u: Partial<Project>) => void; }) {
  const [saved, flashSaved] = useFlash(2000);
  const { lisa3 } = project;
  const [vanusStr, setVanusStr] = useState(lisa3.vanus > 0 ? String(lisa3.vanus) : '');
  const [alammaarStr, setAlammaarStr] = useState(lisa3.alammaar > 0 ? String(lisa3.alammaar) : '');
  const [tegelikStr, setTegelikStr] = useState(lisa3.tegelik > 0 ? String(lisa3.tegelik) : '');
  const [areaStr, setAreaStr] = useState(lisa3.measuredArea > 0 ? String(lisa3.measuredArea) : '');
  const [perimStr, setPerimStr] = useState(lisa3.perimeter > 0 ? String(lisa3.perimeter) : '');
  const [treeData, setTreeData] = useState({ liik: 'Mänd', diam: '', arv: '' });

  useEffect(() => {
    setVanusStr(lisa3.vanus > 0 ? String(lisa3.vanus) : '');
    setAlammaarStr(lisa3.alammaar > 0 ? String(lisa3.alammaar) : '');
    setTegelikStr(lisa3.tegelik > 0 ? String(lisa3.tegelik) : '');
    setAreaStr(lisa3.measuredArea > 0 ? String(lisa3.measuredArea) : '');
    setPerimStr(lisa3.perimeter > 0 ? String(lisa3.perimeter) : '');
  }, [project.id]);

  const commitField = (field: keyof typeof lisa3, value: string | number) =>
    onUpdate({ lisa3: { ...lisa3, [field]: typeof value === 'string' ? parseFloat(value) || 0 : value } });

  const handleMapApply = (areaHa: number, perimeter: number) => {
    setAreaStr(String(areaHa)); setPerimStr(String(perimeter));
    onUpdate({ lisa3: { ...lisa3, measuredArea: areaHa, perimeter } });
  };

  const handleSave = () => {
    onUpdate({ lisa3: { ...lisa3, vanus: parseFloat(vanusStr)||0, alammaar: parseFloat(alammaarStr)||0, tegelik: parseFloat(tegelikStr)||0, measuredArea: parseFloat(areaStr)||0, perimeter: parseFloat(perimStr)||0 } });
    flashSaved();
  };

  const handleAddTree = () => {
    const d = parseFloat(treeData.diam), a = parseInt(treeData.arv);
    if (!d || !a) return;
    onUpdate({ lisa3: { ...lisa3, rows: [...lisa3.rows, { id: generateId(), liik: treeData.liik, grupp: 1, diam: d, arv: a }] } });
    setTreeData({ ...treeData, diam: '', arv: '' });
  };

  const pindala = useMemo(() => calcKorrigeeritudPindala(parseFloat(perimStr)||0, parseFloat(areaStr)||0), [perimStr, areaStr]);
  const calculatedG = useMemo(() => {
    if (!pindala || pindala <= 0 || lisa3.rows.length === 0) return 0;
    return lisa3.rows.reduce((acc, row) => acc + calcG(row.diam, row.arv), 0) / pindala;
  }, [lisa3.rows, pindala]);

  const effectiveG = lisa3.rows.length > 0 ? calculatedG : (parseFloat(tegelikStr)||0);
  const vanusNum = parseFloat(vanusStr)||0;
  const ageZeroRate = vanusNum > 0 && getLisa3Rate(lisa3.puuliik, vanusNum) === 0;

  const result = useMemo(() => {
    const v = parseFloat(vanusStr)||0, am = parseFloat(alammaarStr)||0;
    if (!v || !am || !pindala) return null;
    const shortfall = am - effectiveG;
    if (shortfall <= 0) return { shortfall, kahju: 0, status: 'ok' as const };
    const rate = getLisa3Rate(lisa3.puuliik, v);
    if (rate === 0) return { shortfall, kahju: 0, rate, status: 'no_rate' as const };
    return { shortfall, kahju: shortfall * rate * lisa3.kordaja * pindala, rate, status: 'violation' as const };
  }, [vanusStr, alammaarStr, lisa3.puuliik, lisa3.kordaja, pindala, effectiveG]);

  return (
    <div className="space-y-6">
      <MapPolygonSelector onApply={handleMapApply} initialArea={areaStr} initialPerimeter={perimStr} initialPoints={lisa3.coords} onPointsChange={pts => onUpdate({ lisa3: { ...lisa3, coords: pts } })} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <section className="card p-8">
            <SectionTitle>Kasvavad puud (Analüüsiks)</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 items-end">
              <div className="space-y-1"><label className="label-cap" htmlFor="lisa3-tree-liik">Puuliik</label>
                <select id="lisa3-tree-liik" className="input-field w-full" value={treeData.liik} onChange={e => setTreeData({ ...treeData, liik: e.target.value })}>
                  {['Mänd','Kuusk','Kask','Haab','Sanglepp','Hall lepp','Tamm / Saar'].map(l => <option key={l}>{l}</option>)}
                </select></div>
              <div className="space-y-1"><label className="label-cap" htmlFor="lisa3-tree-diam">Diameeter d₁.₃ (cm)</label>
                <input id="lisa3-tree-diam" type="number" className="input-field w-full" value={treeData.diam} onChange={e => setTreeData({ ...treeData, diam: e.target.value })} placeholder="24" /></div>
              <div className="space-y-1"><label className="label-cap" htmlFor="lisa3-tree-arv">Arv (tk)</label>
                <div className="flex gap-2">
                  <input id="lisa3-tree-arv" type="number" className="input-field w-full" value={treeData.arv} onChange={e => setTreeData({ ...treeData, arv: e.target.value })} onKeyDown={e => e.key === 'Enter' && handleAddTree()} placeholder="10" />
                  <button onClick={handleAddTree} className="btn-primary p-2.5" aria-label="Lisa puu"><Plus className="w-4 h-4" /></button>
                </div></div>
            </div>
            <div className="overflow-x-auto max-h-[300px] custom-scrollbar border rounded-xl">
              <table className="w-full text-[11px] text-left" role="grid" aria-label="Kasvavate puude nimekiri">
                <thead className="bg-slate-50 border-b sticky top-0"><tr>
                  <th className="px-4 py-2 font-bold text-slate-500 uppercase tracking-wider">Puuliik</th>
                  <th className="px-4 py-2 font-bold text-slate-500 uppercase tracking-wider text-right">d₁.₃</th>
                  <th className="px-4 py-2 font-bold text-slate-500 uppercase tracking-wider text-right">Arv</th>
                  <th className="px-4 py-2 font-bold text-slate-500 uppercase tracking-wider text-right">g (m²)</th>
                  <th className="px-4 py-2 w-8" />
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {lisa3.rows.length === 0 ? <tr><td colSpan={5} className="p-4 text-center text-slate-400 italic">Kasvavaid puid pole lisatud.</td></tr>
                  : lisa3.rows.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50 group">
                      <td className="px-4 py-2 font-bold">{r.liik}</td>
                      <td className="px-4 py-2 text-right font-mono">{r.diam.toFixed(1)}</td>
                      <td className="px-4 py-2 text-right font-mono">{r.arv}</td>
                      <td className="px-4 py-2 text-right font-mono text-slate-500">{calcG(r.diam, r.arv).toFixed(3)}</td>
                      <td className="px-4 py-2 text-right"><button onClick={() => onUpdate({ lisa3: { ...lisa3, rows: lisa3.rows.filter(x => x.id !== r.id) } })} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Eemalda"><Trash2 className="w-3 h-3" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {lisa3.rows.length > 0 && (
              <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex justify-between items-center">
                <div><div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Arvutatud G kokku</div><div className="text-lg font-bold text-indigo-900">{calculatedG.toFixed(2)} m²/ha</div></div>
                <div className="text-[10px] text-indigo-400 italic text-right">Korrigeeritud pindala: {pindala.toFixed(4)} ha</div>
              </div>
            )}
          </section>
          <section className="card p-8">
            <SectionTitle>Kahju parameetrid</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><label className="label-cap" htmlFor="lisa3-puuliik">Enamuspuuliik</label>
                <select id="lisa3-puuliik" className="input-field w-full" value={lisa3.puuliik} onChange={e => commitField('puuliik', e.target.value)}>
                  <option value="mand">Mänd</option><option value="kuusk">Kuusk</option><option value="kask">Kask</option>
                  <option value="sanglepp">Sanglepp</option><option value="tamm">Tamm / Saar / Vaher / Jalakas</option><option value="haab">Haab</option>
                </select></div>
              <div className="space-y-1"><label className="label-cap" htmlFor="lisa3-vanus">Puistu vanus (a)</label>
                <input id="lisa3-vanus" type="number" className="input-field w-full" value={vanusStr} onChange={e => setVanusStr(e.target.value)} onBlur={() => commitField('vanus', vanusStr)} />
                {ageZeroRate && <p className="text-[10px] text-amber-600 font-bold mt-1 flex items-center gap-1"><Info className="w-3 h-3" /> Sellele vanusele kahju määra ei rakendata.</p>}
              </div>
              <div className="space-y-1"><label className="label-cap" htmlFor="lisa3-alammaar">Alammäär G (m²/ha)</label>
                <input id="lisa3-alammaar" type="number" className="input-field w-full" value={alammaarStr} onChange={e => setAlammaarStr(e.target.value)} onBlur={() => commitField('alammaar', alammaarStr)} /></div>
              <div className="space-y-1"><label className="label-cap">Tegelik G pärast raiet</label>
                <input type="number" className={`input-field w-full ${lisa3.rows.length > 0 ? 'bg-indigo-50 text-indigo-900 font-bold border-indigo-200' : ''}`}
                  readOnly={lisa3.rows.length > 0} value={lisa3.rows.length > 0 ? calculatedG.toFixed(2) : tegelikStr}
                  onChange={e => setTegelikStr(e.target.value)} onBlur={() => commitField('tegelik', tegelikStr)} />
                {lisa3.rows.length > 0 && <p className="text-[10px] text-indigo-500 font-medium italic mt-1">G arvutatakse tabeli põhjal.</p>}
              </div>
              <div className="space-y-1"><label className="label-cap">Kaitseala kordaja</label>
                <select className="input-field w-full" value={lisa3.kordaja} onChange={e => commitField('kordaja', parseFloat(e.target.value))}>
                  <option value="1">1.0 (Puudub)</option><option value="3">3.0 (Piiranguvöönd / Hoiuala)</option><option value="5">5.0 (Reservaat)</option>
                </select></div>
            </div>
          </section>
          <section className="card p-8">
            <SectionTitle>Pindala korrigeerimine</SectionTitle>
            <div className="grid grid-cols-2 gap-4 items-end">
              <div className="space-y-1"><label className="label-cap" htmlFor="lisa3-area">Mõõdetud pindala (ha)</label>
                <input id="lisa3-area" type="number" className="input-field w-full" value={areaStr} onChange={e => setAreaStr(e.target.value)} onBlur={() => commitField('measuredArea', areaStr)} placeholder="1.20" /></div>
              <div className="space-y-1"><label className="label-cap" htmlFor="lisa3-perim">Ümbermõõt (m)</label>
                <input id="lisa3-perim" type="number" className="input-field w-full" value={perimStr} onChange={e => setPerimStr(e.target.value)} onBlur={() => commitField('perimeter', perimStr)} placeholder="550" /></div>
            </div>
            <div className="mt-4 p-4 bg-slate-50 rounded-lg text-xs font-mono border border-slate-200">
              Korrigeeritud pindala: <span className="font-bold text-indigo-600">{pindala.toFixed(4)} ha</span>
              <div className="text-[10px] text-slate-400 mt-1">Viga = (2,5 × ümbermõõt) / 10 000 ha</div>
            </div>
          </section>
          <SaveButton saved={saved} onClick={handleSave} />
        </div>
        <div className="space-y-6">
          {result ? (
            <ResultBox label="Arvutuslik Keskkonnakahju (Lisa 3)" value={result.kahju.toFixed(2) + ' €'}
              type={result.status === 'ok' || result.status === 'no_rate' ? 'success' : 'danger'}
              subtext={result.status === 'ok' ? 'Puistu tihedusnorm on täidetud.' : result.status === 'no_rate' ? `Puudujääk: ${result.shortfall.toFixed(1)} m²/ha, kuid sellele vanusele/liigile kahju määra ei rakendata.` : `Puudujääk: ${result.shortfall.toFixed(1)} m²/ha. Määr: ${(result as any).rate} €/m²/ha.`}
            />
          ) : (
            <div className="card flex flex-col items-center justify-center p-12 text-center bg-slate-50/50 border-dashed border-2 border-slate-200 opacity-60">
              <Calculator className="w-12 h-12 mb-4 text-slate-400" />
              <p className="text-sm font-medium text-slate-600">Tulemuste nägemiseks täida kõik andmeväljad vasakul.</p>
            </div>
          )}
          <Lisa3ReferenceTable />
        </div>
      </div>
    </div>
  );
}
