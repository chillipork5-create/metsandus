import React, { useState, useMemo, useCallback, useRef } from 'react';
import { ArrowRight, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Project, MootmisLoendus, MootmisData, TakseerRida, KokkuvoteRida } from '../types';
import { calcG, getGn, stumpToD13, calcStandFactor } from '../lib/calculations';

const PUULIIGID = ['Mänd', 'Kuusk', 'Kask', 'Sanglepp', 'Hall-lepp', 'Haab', 'Tamm', 'Saar', 'Vaher', 'Jalakas', 'Pärn', 'Muu'];

const LIIK_TO_CALC: Record<string, string> = {
  'Mänd': 'mand', 'Kuusk': 'kuusk', 'Kask': 'kask', 'Sanglepp': 'sanglepp',
  'Hall-lepp': 'sanglepp', 'Haab': 'haab', 'Tamm': 'tamm', 'Saar': 'tamm',
  'Vaher': 'tamm', 'Jalakas': 'tamm', 'Pärn': 'kask', 'Muu': 'mand',
};

function genId() { return Math.random().toString(36).substr(2, 9); }

const MIN_CM = 1;
const MAX_CM = 80;
const DEFAULT_ROWS = 40;

function cmLabel(cm: number): string {
  if (cm === 1) return '0.1–1';
  return `${cm - 1}.1–${cm}`;
}

function usedCms(loendus: MootmisLoendus): number[] {
  const cms = new Set<number>();
  for (const liik of Object.values(loendus)) {
    for (const cm of Object.keys(liik)) cms.add(parseInt(cm));
  }
  return [...cms];
}

// ── Loendus tabel ──────────────────────────────────────────────────────────────
interface LoendusTableProps {
  mode: 'puud' | 'kandud';
  loendus: MootmisLoendus;
  onChange: (loendus: MootmisLoendus) => void;
}

function LoendusTable({ mode, loendus, onChange }: LoendusTableProps) {
  const [selectedLiik, setSelectedLiik] = useState<string>(PUULIIGID[0]);
  const [focusedCm, setFocusedCm] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  const activeSpecies = useMemo(() =>
    PUULIIGID.filter(l => loendus[l] && Object.values(loendus[l]).some(v => v > 0)),
    [loendus]
  );

  const maxUsedCm = useMemo(() => {
    const cms = usedCms(loendus);
    return cms.length > 0 ? Math.max(...cms) : 0;
  }, [loendus]);

  const rowCount = expanded ? Math.max(MAX_CM, maxUsedCm) : Math.max(DEFAULT_ROWS, maxUsedCm);
  const rows = Array.from({ length: rowCount }, (_, i) => i + MIN_CM);

  const columns = useMemo(() => {
    const cols = new Set<string>(activeSpecies);
    cols.add(selectedLiik);
    return PUULIIGID.filter(l => cols.has(l));
  }, [selectedLiik, activeSpecies]);

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const liik of columns) {
      t[liik] = Object.values(loendus[liik] || {}).reduce((a, b) => a + b, 0);
    }
    return t;
  }, [loendus, columns]);

  const getValue = (liik: string, cm: number): string => {
    const v = loendus[liik]?.[String(cm)];
    return v ? String(v) : '';
  };

  const setValue = useCallback((liik: string, cm: number, raw: string) => {
    const v = parseInt(raw) || 0;
    const newLoendus = { ...loendus };
    if (!newLoendus[liik]) newLoendus[liik] = {};
    else newLoendus[liik] = { ...newLoendus[liik] };
    if (v === 0) {
      delete newLoendus[liik][String(cm)];
    } else {
      newLoendus[liik][String(cm)] = v;
    }
    onChange(newLoendus);
  }, [loendus, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, liik: string, cm: number) => {
    const colIdx = columns.indexOf(liik);
    let targetLiik = liik;
    let targetCm = cm;

    if (e.key === 'ArrowDown') {
      targetCm = cm + 1;
    } else if (e.key === 'ArrowUp') {
      targetCm = cm - 1;
    } else if (e.key === 'ArrowRight') {
      targetLiik = columns[colIdx + 1] ?? liik;
    } else if (e.key === 'ArrowLeft') {
      targetLiik = columns[colIdx - 1] ?? liik;
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      targetCm = cm + 1;
    } else {
      return;
    }

    if (e.key !== 'Enter' && e.key !== 'Tab') e.preventDefault();
    if (targetCm < MIN_CM || targetCm > rowCount) return;

    const key = `${targetLiik}__${targetCm}`;
    const el = cellRefs.current.get(key);
    if (el) {
      el.focus();
      el.select();
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [columns, rowCount]);

  const refCallback = useCallback((liik: string, cm: number) => (el: HTMLInputElement | null) => {
    const key = `${liik}__${cm}`;
    if (el) cellRefs.current.set(key, el);
    else cellRefs.current.delete(key);
  }, []);

  const totalAll = Object.values(totals).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-3">
      {/* Species selector */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Aktiivne puuliik:</span>
        {PUULIIGID.map(l => (
          <button
            key={l}
            onClick={() => setSelectedLiik(l)}
            className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all border ${
              selectedLiik === l
                ? 'bg-forest-600 text-white border-forest-600'
                : activeSpecies.includes(l)
                ? 'bg-forest-50 text-forest-700 border-forest-200 hover:bg-forest-100'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Table */}
      <div
        ref={containerRef}
        className="border border-slate-200 rounded-xl overflow-hidden"
        style={{ resize: 'vertical', overflow: 'auto', minHeight: 180, maxHeight: expanded ? 700 : 380 }}
      >
        <table className="border-collapse text-[11px] w-full" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 80 }} />
            {columns.map(l => <col key={l} style={{ width: Math.max(70, Math.floor(320 / columns.length)) }} />)}
          </colgroup>
          <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-2 py-2 text-left font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                {mode === 'puud' ? 'd₁.₃ (cm)' : 'Kännu d (cm)'}
              </th>
              {columns.map(liik => (
                <th
                  key={liik}
                  className={`px-2 py-2 text-center font-bold uppercase tracking-wider text-[10px] cursor-pointer select-none ${
                    liik === selectedLiik ? 'text-forest-700 bg-forest-50' : 'text-slate-500'
                  }`}
                  onClick={() => setSelectedLiik(liik)}
                >
                  {liik}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(cm => {
              const hasAnyData = columns.some(l => (loendus[l]?.[String(cm)] || 0) > 0);
              const isActiveFocusRow = focusedCm === cm;
              return (
                <tr
                  key={cm}
                  className={`border-b border-slate-100 last:border-0 transition-colors ${
                    isActiveFocusRow
                      ? 'bg-amber-50 ring-1 ring-inset ring-amber-300'
                      : hasAnyData
                      ? 'bg-forest-50/40'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <td className={`px-2 py-0.5 font-mono text-[10px] select-none font-bold ${
                    isActiveFocusRow ? 'text-amber-700' : 'text-slate-400'
                  }`}>
                    {cmLabel(cm)}
                  </td>
                  {columns.map(liik => {
                    const isActive = liik === selectedLiik;
                    const val = getValue(liik, cm);
                    return (
                      <td
                        key={liik}
                        className={`px-1 py-0.5 text-center ${
                          isActiveFocusRow && isActive
                            ? 'bg-amber-100/60'
                            : isActiveFocusRow
                            ? ''
                            : isActive
                            ? 'bg-forest-50/60'
                            : ''
                        }`}
                      >
                        <input
                          ref={refCallback(liik, cm)}
                          type="number"
                          min={0}
                          value={val}
                          placeholder=""
                          onChange={e => setValue(liik, cm, e.target.value)}
                          onKeyDown={e => handleKeyDown(e, liik, cm)}
                          onFocus={() => { setSelectedLiik(liik); setFocusedCm(cm); }}
                          onBlur={() => setFocusedCm(null)}
                          className={`w-full text-center font-mono rounded text-[11px] py-0.5 px-1 border transition-all
                            ${val ? 'font-bold' : ''}
                            ${isActive
                              ? 'bg-white border-forest-400 focus:ring-1 focus:ring-forest-500'
                              : 'bg-transparent border-transparent hover:border-slate-200 focus:border-forest-400 focus:bg-white focus:ring-1 focus:ring-forest-500'
                            }
                            focus:outline-none`}
                          aria-label={`${liik} ${cmLabel(cm)} cm`}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot className="sticky bottom-0 bg-slate-50 border-t-2 border-slate-300">
            <tr>
              <td className="px-2 py-1.5 font-bold text-[10px] text-slate-500 uppercase tracking-wider">Kokku</td>
              {columns.map(liik => (
                <td key={liik} className={`px-2 py-1.5 text-center font-mono font-bold text-[11px] ${totals[liik] ? 'text-forest-700' : 'text-slate-300'}`}>
                  {totals[liik] || ''}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Expand/collapse + summary */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-600 font-medium transition-colors"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? 'Väiksemaks' : `Suuremaks (kuni ${MAX_CM} cm)`}
        </button>
        {totalAll > 0 && (
          <span className="text-[11px] font-mono text-slate-500">
            {totalAll} tk kokku · {columns.filter(l => totals[l] > 0).length} puuliiki
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
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

  // Get height from the pre-harvest takseer row matching the selected rinne
  const korgusRaieEelsest = useMemo(() => {
    const rida = uldinfo.takseerRead.find(r => r.rinne === mootmised.rinne && r.korgus);
    return parseFloat(rida?.korgus || '0');
  }, [uldinfo.takseerRead, mootmised.rinne]);

  const pindala = parseFloat(mootmised.pindala) || 0;

  // ── Compute results from puudLoendus (living trees left standing) ──
  const puudArvutused = useMemo(() => {
    const loendus = mootmised.puudLoendus;
    if (!pindala || Object.keys(loendus).length === 0) return null;

    const rows = PUULIIGID.flatMap(liik => {
      const cmMap = loendus[liik];
      if (!cmMap) return [];
      let count = 0; let totalG = 0; let sumD = 0;
      for (const [cmStr, arv] of Object.entries(cmMap)) {
        const d = parseInt(cmStr);
        if (!d || !arv) continue;
        count += arv;
        totalG += calcG(d, arv);
        sumD += d * arv;
      }
      if (!count) return [];
      const avgD = sumD / count;
      const gHa = totalG / pindala;
      const calcSpecies = LIIK_TO_CALC[liik] || 'mand';
      const gn = korgusRaieEelsest > 0 ? getGn(calcSpecies, korgusRaieEelsest) : 0;
      const taius = gn > 0 ? (gHa / gn) : 0;
      return [{ liik, count, avgD, totalG, gHa, gn, taius, tkHa: count / pindala }];
    });

    if (rows.length === 0) return null;
    const totalGHa = rows.reduce((a, r) => a + r.gHa, 0);
    // weighted average Gn using each species' gn
    const totalGn = rows.reduce((a, r) => a + r.gn, 0);
    const avgTaius = totalGn > 0 ? totalGHa / (totalGn / rows.length) : rows.reduce((a, r) => a + r.taius, 0) / rows.length;
    return {
      rows,
      totalGHa,
      totalTk: rows.reduce((a, r) => a + r.tkHa, 0),
      avgTaius,
    };
  }, [mootmised.puudLoendus, pindala, korgusRaieEelsest]);

  // ── Compute results from kandudLoendus (stumps = felled trees) ──
  const kandudArvutused = useMemo(() => {
    const loendus = mootmised.kandudLoendus;
    if (!pindala || Object.keys(loendus).length === 0) return null;

    const rows = PUULIIGID.flatMap(liik => {
      const cmMap = loendus[liik];
      if (!cmMap) return [];
      let count = 0; let totalMaht = 0; let sumD13 = 0; let totalG = 0;
      const calcSpecies = LIIK_TO_CALC[liik] || 'mand';
      for (const [cmStr, arv] of Object.entries(cmMap)) {
        const dKand = parseInt(cmStr);
        if (!dKand || !arv) continue;
        const d13 = stumpToD13(calcSpecies, dKand);
        count += arv;
        sumD13 += d13 * arv;
        totalG += calcG(d13, arv);
        if (korgusRaieEelsest > 0 && d13 > 0) {
          const f = calcStandFactor(calcSpecies, korgusRaieEelsest);
          totalMaht += calcG(d13, arv) * korgusRaieEelsest * f;
        }
      }
      if (!count) return [];
      const avgD13 = sumD13 / count;
      const gHa = totalG / pindala;
      const gn = korgusRaieEelsest > 0 ? getGn(calcSpecies, korgusRaieEelsest) : 0;
      return [{ liik, count, avgD13, totalG, gHa, gn, mahtTm: totalMaht, mahtHa: totalMaht / pindala, tkHa: count / pindala }];
    });

    if (rows.length === 0) return null;
    return {
      rows,
      totalMahtTm: rows.reduce((a, r) => a + r.mahtTm, 0),
      totalMahtHa: rows.reduce((a, r) => a + r.mahtHa, 0),
      totalGHa: rows.reduce((a, r) => a + r.gHa, 0),
    };
  }, [mootmised.kandudLoendus, pindala, korgusRaieEelsest]);

  // ── Build raie-järgne from LIVING TREES (puud) ──
  // These ARE the remaining stand.
  const handleKannaFromPuud = useCallback(() => {
    if (!puudArvutused) return;
    const newRows: TakseerRida[] = puudArvutused.rows.map(r => {
      // Try to carry over tekkeaasta, vanus, jooksevVanus from raie-eelne for matching puuliik
      const eelneRida = uldinfo.takseerRead.find(er => er.puuliik === r.liik);
      return {
        id: genId(),
        rinne: mootmised.rinne,
        protsent: (r.taius * 100).toFixed(0),
        puuliik: r.liik,
        tekkeaasta: eelneRida?.tekkeaasta || '',
        vanus: eelneRida?.vanus || '',
        jooksevVanus: eelneRida?.jooksevVanus || '',
        korgus: korgusRaieEelsest > 0 ? String(korgusRaieEelsest) : '',
        labimoot: r.avgD.toFixed(1),
        rinnaspindala: r.gHa.toFixed(2),
        tekkeviis: eelneRida?.tekkeviis || 'looduslik',
        maht: '',
        mahtHa: '',
        puudeArv: r.tkHa.toFixed(0),
      };
    });

    const newKokkuvote = uldinfo.raieJargneKokkuvote.map(r => {
      if (r.rinne === 'Esimene') return {
        ...r,
        rinnaspindala: puudArvutused.totalGHa.toFixed(2),
        taiusProtsent: (puudArvutused.avgTaius * 100).toFixed(0),
      };
      return r;
    });

    onUpdate({ uldinfo: { ...uldinfo, raieJargneRead: newRows, raieJargneKokkuvote: newKokkuvote } });
    setNotification('Kasvavad puud kantud raie-järgsesse takseerkirjeldusse!');
    setTimeout(() => setNotification(null), 3500);
  }, [puudArvutused, mootmised.rinne, korgusRaieEelsest, uldinfo, onUpdate]);

  // ── Build raie-järgne from STUMPS ──
  // Stumps = felled trees. Raie-järgne = raie-eelne MINUS felled.
  // We subtract the felled volume/G from each raie-eelne row by species.
  const handleKannaFromKandud = useCallback(() => {
    if (!kandudArvutused) return;

    // Build a map of felled G/ha and maht/ha per species
    const felledByLiik: Record<string, { gHa: number; mahtHa: number; mahtTm: number; tkHa: number }> = {};
    for (const r of kandudArvutused.rows) {
      felledByLiik[r.liik] = { gHa: r.gHa, mahtHa: r.mahtHa, mahtTm: r.mahtTm, tkHa: r.tkHa };
    }

    // Carry over all raie-eelne rows, subtracting felled amounts
    const newRows: TakseerRida[] = uldinfo.takseerRead
      .filter(r => r.rinne === mootmised.rinne)
      .map(r => {
        const felled = felledByLiik[r.puuliik] || { gHa: 0, mahtHa: 0, mahtTm: 0, tkHa: 0 };
        const gEelne = parseFloat(r.rinnaspindala) || 0;
        const mahtHaEelne = parseFloat(r.mahtHa) || 0;
        const mahtEelne = parseFloat(r.maht) || 0;
        const tkHaEelne = parseFloat(r.puudeArv) || 0;

        const gJargne = Math.max(0, gEelne - felled.gHa);
        const mahtHaJargne = Math.max(0, mahtHaEelne - felled.mahtHa);
        const mahtJargne = Math.max(0, mahtEelne - felled.mahtTm);
        const tkHaJargne = Math.max(0, tkHaEelne - felled.tkHa);

        // Recalculate täius from new G/ha
        const calcSpecies = LIIK_TO_CALC[r.puuliik] || 'mand';
        const gn = korgusRaieEelsest > 0 ? getGn(calcSpecies, korgusRaieEelsest) : 0;
        const taius = gn > 0 ? (gJargne / gn) * 100 : parseFloat(r.protsent) || 0;

        return {
          ...r,
          id: genId(),
          rinnaspindala: gJargne.toFixed(2),
          mahtHa: mahtHaJargne > 0 ? mahtHaJargne.toFixed(2) : '',
          maht: mahtJargne > 0 ? mahtJargne.toFixed(2) : '',
          puudeArv: tkHaJargne > 0 ? tkHaJargne.toFixed(0) : '',
          protsent: taius.toFixed(0),
        };
      });

    // If no raie-eelne rows for this rinne, fall back to building from kandud data
    const finalRows = newRows.length > 0 ? newRows : kandudArvutused.rows.map(r => ({
      id: genId(),
      rinne: mootmised.rinne,
      protsent: '',
      puuliik: r.liik,
      tekkeaasta: '', vanus: '', jooksevVanus: '',
      korgus: korgusRaieEelsest > 0 ? String(korgusRaieEelsest) : '',
      labimoot: r.avgD13.toFixed(1),
      rinnaspindala: '',
      tekkeviis: 'looduslik',
      maht: r.mahtTm.toFixed(2),
      mahtHa: r.mahtHa.toFixed(2),
      puudeArv: r.tkHa.toFixed(0),
    }));

    // Update summary row
    const totalGJargne = finalRows.reduce((a, r) => a + (parseFloat(r.rinnaspindala) || 0), 0);
    const totalMahtHaJargne = finalRows.reduce((a, r) => a + (parseFloat(r.mahtHa) || 0), 0);
    const totalMahtJargne = finalRows.reduce((a, r) => a + (parseFloat(r.maht) || 0), 0);

    // Recalc täius for summary
    const calcSpeciesFirst = LIIK_TO_CALC[finalRows[0]?.puuliik || ''] || 'mand';
    const gnFirst = korgusRaieEelsest > 0 ? getGn(calcSpeciesFirst, korgusRaieEelsest) : 0;
    const avgTaiusStr = gnFirst > 0 ? ((totalGJargne / gnFirst) * 100).toFixed(0) : '';

    const newKokkuvote = uldinfo.raieJargneKokkuvote.map(r => {
      if (r.rinne === 'Esimene') return {
        ...r,
        rinnaspindala: totalGJargne.toFixed(2),
        taiusProtsent: avgTaiusStr,
        mahtTm: totalMahtJargne > 0 ? totalMahtJargne.toFixed(1) : r.mahtTm,
        mahtTmHa: totalMahtHaJargne > 0 ? totalMahtHaJargne.toFixed(1) : r.mahtTmHa,
      };
      return r;
    });

    onUpdate({ uldinfo: { ...uldinfo, raieJargneRead: finalRows, raieJargneKokkuvote: newKokkuvote } });
    setNotification('Raie-järgne takseer arvutatud (raie-eelne miinus raiutud kännud)!');
    setTimeout(() => setNotification(null), 3500);
  }, [kandudArvutused, mootmised.rinne, korgusRaieEelsest, uldinfo, onUpdate]);

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
          className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'puud' ? 'bg-white text-forest-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}>
          Kasvavad puud (d₁.₃)
        </button>
        <button onClick={() => setActiveTab('kandud')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'kandud' ? 'bg-white text-forest-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}>
          Kännud (kännu d)
        </button>
      </div>

      {/* Input table */}
      <div className="card p-5 space-y-3">
        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          {activeTab === 'puud' ? 'Kasvavate puude loendus — d₁.₃ (cm)' : 'Kändude loendus — kännu läbimõõt (cm)'}
        </div>
        <div className="text-[11px] text-slate-400">
          {activeTab === 'puud'
            ? 'Vali puuliik → sisesta mõõdetud puude arv vastava CM vahemiku reale. Liigu ridade vahel nooleklahvidega ↑↓ või Enter. Aktiivne rida on kollaselt esile tõstetud.'
            : 'Vali puuliik → sisesta kändude arv vastava CM vahemiku reale. Nool ↓ = järgmine rida. Aktiivne rida on kollaselt esile tõstetud.'
          }
        </div>
        <LoendusTable
          mode={activeTab}
          loendus={activeTab === 'puud' ? mootmised.puudLoendus : mootmised.kandudLoendus}
          onChange={l => setMootmised(activeTab === 'puud' ? { puudLoendus: l } : { kandudLoendus: l })}
        />
      </div>

      {/* Results — Living trees */}
      {activeTab === 'puud' && puudArvutused && pindala > 0 && (
        <section className="card overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Arvutustulemused — kasvavad puud (raie-järgne seis)</div>
            {!korgusRaieEelsest && <div className="text-[11px] text-amber-600 mt-1">G ja täius arvutatakse kui kõrgus on raie-eelses takseerkirjelduses olemas.</div>}
          </div>
          <table className="w-full text-[11px] border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Puuliik</th>
                <th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">Tk</th>
                <th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">Tk/ha</th>
                <th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">Ø d (cm)</th>
                <th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">G (m²/ha)</th>
                {korgusRaieEelsest > 0 && <th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">Gn (m²/ha)</th>}
                {korgusRaieEelsest > 0 && <th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">T = G/Gn</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {puudArvutused.rows.map(r => (
                <tr key={r.liik} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-bold">{r.liik}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.count}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.tkHa.toFixed(0)}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.avgD.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.gHa.toFixed(2)}</td>
                  {korgusRaieEelsest > 0 && <td className="px-3 py-2 text-right font-mono text-slate-400">{r.gn.toFixed(1)}</td>}
                  {korgusRaieEelsest > 0 && (
                    <td className="px-3 py-2 text-right font-mono font-bold text-forest-700">
                      {(r.taius * 100).toFixed(0)}%
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
              <tr>
                <td className="px-3 py-2 font-bold text-slate-600" colSpan={2}>Kokku</td>
                <td className="px-3 py-2 text-right font-mono font-bold">{puudArvutused.totalTk.toFixed(0)}</td>
                <td className="px-3 py-2" />
                <td className="px-3 py-2 text-right font-mono font-bold text-forest-700">{puudArvutused.totalGHa.toFixed(2)}</td>
                {korgusRaieEelsest > 0 && <td className="px-3 py-2" />}
                {korgusRaieEelsest > 0 && (
                  <td className="px-3 py-2 text-right font-mono font-bold text-forest-700">
                    {(puudArvutused.avgTaius * 100).toFixed(0)}%
                  </td>
                )}
              </tr>
            </tfoot>
          </table>
          <div className="px-4 py-3 bg-forest-50/50 border-t border-forest-100 flex justify-between items-center">
            <p className="text-[11px] text-forest-700">
              Mõõdetud kasvavad puud = kasvama jäänud puid. Raie-järgne takseer täidetakse nende põhjal.
            </p>
            <button onClick={handleKannaFromPuud}
              className="flex items-center gap-2 px-5 py-2.5 bg-forest-600 hover:bg-forest-700 text-white rounded-xl font-bold text-xs active:scale-95 transition-all shadow-sm whitespace-nowrap">
              Kanna raie-järgsesse takseerkirjeldusse
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>
      )}

      {/* Results — Stumps */}
      {activeTab === 'kandud' && kandudArvutused && pindala > 0 && (
        <section className="card overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Arvutustulemused — kännud (raiutud puud)</div>
            {!korgusRaieEelsest && <div className="text-[11px] text-amber-600 mt-1">Raiemaht arvutatakse kui kõrgus on raie-eelses takseerkirjelduses olemas.</div>}
          </div>
          <table className="w-full text-[11px] border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Puuliik</th>
                <th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">Tk</th>
                <th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">Tk/ha</th>
                <th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">Ø d₁.₃ (cm)</th>
                <th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">G raiutud (m²/ha)</th>
                <th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">Maht (tm)</th>
                <th className="px-3 py-2 text-right font-bold text-slate-500 uppercase tracking-wider">Maht (tm/ha)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {kandudArvutused.rows.map(r => (
                <tr key={r.liik} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-bold">{r.liik}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.count}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.tkHa.toFixed(0)}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.avgD13.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.gHa.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.mahtTm.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.mahtHa.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
              <tr>
                <td className="px-3 py-2 font-bold text-slate-600" colSpan={4}>Kokku</td>
                <td className="px-3 py-2 text-right font-mono font-bold text-forest-700">{kandudArvutused.totalGHa.toFixed(2)}</td>
                <td className="px-3 py-2 text-right font-mono font-bold text-forest-700">{kandudArvutused.totalMahtTm.toFixed(2)}</td>
                <td className="px-3 py-2 text-right font-mono font-bold text-forest-700">{kandudArvutused.totalMahtHa.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
          <div className="px-4 py-3 bg-amber-50/50 border-t border-amber-100 flex justify-between items-center">
            <p className="text-[11px] text-amber-800">
              Kännud = raiutud puud. Raie-järgne takseer = raie-eelne miinus raiutud kogused.
            </p>
            <button onClick={handleKannaFromKandud}
              className="flex items-center gap-2 px-5 py-2.5 bg-forest-600 hover:bg-forest-700 text-white rounded-xl font-bold text-xs active:scale-95 transition-all shadow-sm whitespace-nowrap">
              Kanna raie-järgsesse takseerkirjeldusse
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
