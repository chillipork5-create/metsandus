import React from 'react';
import { Project } from '../types';
import { getLisa2Rate, getLisa3Rate, calcKorrigeeritudPindala, calcG } from '../lib/calculations';
import { totalToWords } from '../lib/utils';

export default function PrintDocument({ project, onScreen = false }: { project: Project | undefined; onScreen?: boolean; }) {
  if (!project) return null;
  const { meta, uldinfo, lisa2, lisa3 } = project;
  const lisa2Total = lisa2.rows.reduce((acc, r) => acc + getLisa2Rate(r.diam, r.grupp) * r.arv * lisa2.kordaja, 0);
  const hasLisa2 = lisa2.rows.length > 0;
  const lisa3Pindala = calcKorrigeeritudPindala(lisa3.perimeter, lisa3.measuredArea);
  const lisa3CalcG = (!lisa3Pindala || lisa3.rows.length === 0) ? 0 : lisa3.rows.reduce((acc, r) => acc + calcG(r.diam, r.arv), 0) / lisa3Pindala;
  const lisa3EffG = lisa3.rows.length > 0 ? lisa3CalcG : lisa3.tegelik;
  const lisa3Shortfall = lisa3.alammaar - lisa3EffG;
  const lisa3Rate = getLisa3Rate(lisa3.puuliik, lisa3.vanus) || 0;
  const lisa3Total = lisa3Shortfall > 0 && lisa3Pindala > 0 ? lisa3Shortfall * lisa3Rate * lisa3.kordaja * lisa3Pindala : 0;
  const hasLisa3 = lisa3.measuredArea > 0;
  const combinedTotal = (hasLisa2 ? lisa2Total : 0) + (hasLisa3 ? lisa3Total : 0);
  const points = (() => { if (!lisa3.coords) return []; try { return Array.isArray(lisa3.coords) ? lisa3.coords : JSON.parse(lisa3.coords as any); } catch { return []; } })();
  const speciesLabels: Record<string, string> = { mand: 'Mänd', kuusk: 'Kuusk', kask: 'Kask', sanglepp: 'Sanglepp', tamm: 'Tamm / Saar / Vaher / Jalakas', haab: 'Haab' };

  const vw = 500, vh = 220;
  const bounds = (() => {
    if (points.length === 0) return { cx: 6528701, cy: 563500, dx: 150, dy: 100 };
    let minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity;
    for (const p of points) { if(p.x<minX) minX=p.x; if(p.x>maxX) maxX=p.x; if(p.y<minY) minY=p.y; if(p.y>maxY) maxY=p.y; }
    return { cx: (minX+maxX)/2, cy: (minY+maxY)/2, dx: Math.max(maxX-minX,10)*1.3, dy: Math.max(maxY-minY,10)*1.3 };
  })();
  const ms = Math.min(vw/bounds.dy, vh/bounds.dx);
  const w2s = (wx: number, wy: number) => ({ x: vw/2+(wy-bounds.cy)*ms, y: vh/2-(wx-bounds.cx)*ms });

  return (
    <div className={onScreen ? 'p-6 md:p-12 bg-white text-slate-900 font-sans' : 'print-only hidden print:block p-10 bg-white min-h-screen text-slate-900 font-sans'} style={{ color: '#000' }}>
      <div className="border-b-4 border-slate-900 pb-5 mb-6 flex justify-between items-end">
        <div>
          <div className="text-[10px] font-bold text-forest-700 uppercase tracking-widest mb-1">Metsaseaduse Kohane Keskkonnakahju Arvutusprotokoll</div>
          <h1 className="text-3xl font-black text-slate-900 leading-none">{meta.nimi}</h1>
          {meta.nr && <div className="text-xs font-mono text-slate-500 mt-1.5">Protokolli kood: {meta.nr}</div>}
        </div>
        <div className="text-right"><div className="text-sm font-bold text-slate-800">{meta.koostaja || 'Koostaja täitmata'}</div><div className="text-xs text-slate-400 mt-0.5">{meta.kuupaev}</div></div>
      </div>
      <div className="grid grid-cols-2 gap-6 mb-8 border-b border-slate-200 pb-6">
        <table className="w-full text-xs"><tbody>
          <tr><td className="py-1 text-slate-500 w-32">Maakond / vald:</td><td className="py-1 font-bold">{[uldinfo?.maakond, uldinfo?.vald].filter(Boolean).join(', ') || '—'}</td></tr>
          <tr><td className="py-1 text-slate-500">Katastritunnus:</td><td className="py-1 font-bold">{uldinfo?.katastr || '—'}</td></tr>
          <tr><td className="py-1 text-slate-500">Kvartal / eraldis:</td><td className="py-1 font-bold">{[uldinfo?.kvartal, uldinfo?.eraldis].filter(Boolean).join(' / ') || '—'}</td></tr>
          <tr><td className="py-1 text-slate-500">Raie liik:</td><td className="py-1 font-bold">{meta.raieliik || '—'}</td></tr>
        </tbody></table>
        <table className="w-full text-xs"><tbody>
          <tr><td className="py-1 text-slate-500 w-32">Eraldise pindala:</td><td className="py-1 font-bold">{uldinfo?.pindala ? `${uldinfo.pindala} ha` : '—'}</td></tr>
          <tr><td className="py-1 text-slate-500">Kaitseala kordaja:</td><td className="py-1 font-bold">{lisa2.kordaja > 1 ? `×${lisa2.kordaja}` : '×1 (tavavöönd)'}</td></tr>
        </tbody></table>
      </div>
      {hasLisa2 && (
        <div className="mb-8 avoid-break">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-300 pb-1.5 mb-3">LISA 2: Kasvavate puude ebaseadusliku raiumise kahjuarvutus (MS § 67 L2)</h2>
          <table className="w-full text-xs mb-4 border-collapse">
            <thead><tr className="bg-slate-50 border-y border-slate-200">{['Puuliik','Grupp','Diameeter (cm)','Arv (tk)','Hinnamäär (€)','Summa (€)'].map((h,i) => <th key={h} className={`p-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider ${i>0?'text-right':'text-left'}`}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {lisa2.rows.map(r => <tr key={r.id}><td className="p-2 font-bold text-slate-700">{r.liik}</td><td className="p-2 text-right font-mono text-slate-500">{r.grupp}</td><td className="p-2 text-right font-mono">{r.diam.toFixed(1)}</td><td className="p-2 text-right font-mono">{r.arv}</td><td className="p-2 text-right font-mono">{getLisa2Rate(r.diam, r.grupp).toFixed(2)}</td><td className="p-2 text-right font-mono font-bold">{(getLisa2Rate(r.diam, r.grupp)*r.arv*lisa2.kordaja).toFixed(2)}</td></tr>)}
            </tbody>
            <tfoot><tr className="border-t border-slate-300 font-bold bg-slate-50"><td colSpan={5} className="p-2 text-right text-slate-500 text-[10px] uppercase tracking-wider">Lisa 2 kahjusumma kokku:</td><td className="p-2 text-right font-mono">{lisa2Total.toFixed(2)} €</td></tr></tfoot>
          </table>
        </div>
      )}
      {hasLisa3 && (
        <div className="mb-8 avoid-break">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-300 pb-1.5 mb-3">LISA 3: Puistu rinnaspindala kahjustamise kahjuarvutus (MS § 67 L3)</h2>
          <div className="grid grid-cols-2 gap-6 mb-4">
            <table className="w-full text-xs divide-y divide-slate-100"><tbody>
              <tr><td className="py-1.5 text-slate-500">Enamuspuuliik:</td><td className="py-1.5 font-bold">{speciesLabels[lisa3.puuliik]||lisa3.puuliik}</td></tr>
              <tr><td className="py-1.5 text-slate-500">Puistu vanus:</td><td className="py-1.5 font-bold">{lisa3.vanus} aastat</td></tr>
              <tr><td className="py-1.5 text-slate-500">Alammäär G (norm):</td><td className="py-1.5 font-bold">{lisa3.alammaar.toFixed(1)} m²/ha</td></tr>
              <tr><td className="py-1.5 text-slate-500">Tegelik rinnaspindala:</td><td className="py-1.5 font-bold text-forest-700">{lisa3EffG.toFixed(2)} m²/ha</td></tr>
              <tr><td className="py-1.5 text-slate-500">Kaitseala kordaja K:</td><td className="py-1.5 font-bold">×{lisa3.kordaja}</td></tr>
              <tr><td className="py-1.5 text-slate-500">Korrigeeritud pindala P:</td><td className="py-1.5 font-mono font-bold text-forest-700">{lisa3Pindala.toFixed(4)} ha</td></tr>
            </tbody></table>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
              <div className="font-bold text-[10px] uppercase text-slate-400 tracking-wider">Arvutuskäik</div>
              <div className="flex justify-between"><span>∆G puudujääk:</span><span className="font-mono font-bold">{lisa3Shortfall > 0 ? `${lisa3Shortfall.toFixed(2)} m²/ha` : '0 (puudub)'}</span></div>
              <div className="flex justify-between"><span>Määr:</span><span className="font-mono font-bold">{lisa3Rate > 0 ? `${lisa3Rate} €/m²/ha` : '—'}</span></div>
              <div className="p-2 bg-forest-50 border border-forest-200 rounded flex justify-between font-bold text-forest-800"><span>Lisa 3 kahju:</span><span className="font-mono">{lisa3Total.toFixed(2)} €</span></div>
            </div>
          </div>
          {points.length >= 2 && (
            <div className="grid grid-cols-2 gap-6 mt-4">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">L-EST'97 Kaardiväli</div>
                <div className="border border-slate-300 rounded-xl overflow-hidden p-2 bg-slate-100">
                  <svg viewBox={`0 0 ${vw} ${vh}`} className="w-full h-[220px]">
                    <rect width="100%" height="100%" fill="#f8fafc" />
                    <polygon points={points.map((p: any) => { const s=w2s(p.x,p.y); return `${s.x},${s.y}`; }).join(' ')} fill="rgba(79,70,229,0.08)" stroke="#4f46e5" strokeWidth="2" strokeDasharray="4,2" />
                    {points.map((p: any, idx: number) => { const s=w2s(p.x,p.y); return <g key={p.id}><circle cx={s.x} cy={s.y} r={6} fill="#fff" stroke="#1e1b4b" strokeWidth="1.5"/><text x={s.x} y={s.y+2.5} fontSize="8" fontWeight="bold" fill="#1e1b4b" textAnchor="middle">{idx+1}</text></g>; })}
                  </svg>
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Piiri koordinaadid</div>
                <table className="w-full text-[9px] border-collapse border border-slate-300 rounded-xl overflow-hidden">
                  <thead><tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700"><th className="p-2 text-center w-8">Tipp</th><th className="p-2 font-mono">X</th><th className="p-2 font-mono">Y</th><th className="p-2">GPS</th></tr></thead>
                  <tbody className="divide-y divide-slate-200">{points.map((p: any, idx: number) => <tr key={p.id}><td className="p-1.5 font-bold text-center bg-slate-50">{idx+1}</td><td className="p-1.5 font-mono text-slate-600">{Math.round(p.x)}</td><td className="p-1.5 font-mono text-slate-600">{Math.round(p.y)}</td><td className="p-1.5 font-mono text-slate-500">{p.lat?.toFixed(5)}° N, {p.lon?.toFixed(5)}° E</td></tr>)}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="mt-8 border-t-4 border-slate-900 pt-6 avoid-break">
        <div className="grid grid-cols-2 gap-6 items-end">
          <div className="p-4 bg-slate-100 rounded-xl border border-slate-300">
            <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Määratud kahju summa sõnadega</div>
            <div className="text-xs italic text-slate-700 font-bold leading-relaxed">{totalToWords(combinedTotal)}</div>
          </div>
          <table className="w-full text-xs font-medium ml-auto max-w-[325px]"><tbody>
            {hasLisa2 && <tr><td className="py-1 text-slate-500">Lisa 2 kahju:</td><td className="py-1 font-mono font-bold text-right">{lisa2Total.toFixed(2)} €</td></tr>}
            {hasLisa3 && <tr><td className="py-1 text-slate-500">Lisa 3 kahju:</td><td className="py-1 font-mono font-bold text-right text-forest-700">{lisa3Total.toFixed(2)} €</td></tr>}
            <tr className="border-t-2 border-slate-900 font-black text-sm bg-slate-50"><td className="p-2.5 text-[10px] uppercase tracking-widest">KOKKU KESKKONNAKAHJU:</td><td className="p-2.5 font-mono text-lg text-right">{combinedTotal.toFixed(2)} €</td></tr>
          </tbody></table>
        </div>
      </div>
      {meta.markused && <div className="mt-8 border-t border-slate-200 pt-4"><div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Märkused</div><p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap italic bg-slate-50 p-4 border rounded-xl">{meta.markused}</p></div>}
      <div className="mt-20 grid grid-cols-2 gap-12"><div className="border-t border-slate-300 pt-3 text-center text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">Hinnangu koostaja allkiri / Digitempel</div><div className="border-t border-slate-300 pt-3 text-center text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">Allkirjastamise kuupäev</div></div>
    </div>
  );
}
