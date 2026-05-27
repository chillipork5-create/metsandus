import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  Upload, 
  Trash2, 
  Compass, 
  Map, 
  Grid, 
  ArrowRight,
  Maximize2,
  ZoomIn,
  ZoomOut,
  MousePointer,
  Sparkles,
  Undo
} from 'lucide-react';
import { 
  GeoPoint, 
  parseCoordinatesText, 
  calculatePolygonGeometry, 
  lest97ToWgs84
} from '../lib/geo';

interface MapPolygonSelectorProps {
  onApply: (areaHa: number, perimeter: number) => void;
  initialArea: string;
  initialPerimeter: string;
  initialPoints?: string;
  onPointsChange?: (pointsStr: string) => void;
}

export default function MapPolygonSelector({ onApply, initialArea, initialPerimeter, initialPoints, onPointsChange }: MapPolygonSelectorProps) {
  const [points, setPoints] = useState<GeoPoint[]>(() => {
    if (initialPoints) {
      try { return JSON.parse(initialPoints); } catch { return []; }
    }
    return [];
  });
  const [textAreaValue, setTextAreaValue] = useState('');
  const [draggedPointId, setDraggedPointId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [selectedCoordSystem, setSelectedCoordSystem] = useState<'lest97' | 'wgs84'>('lest97');
  const [activeCursorMode, setActiveCursorMode] = useState<'draw' | 'pan'>('draw');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pointsStrRef = useRef(JSON.stringify(points));

  const defaultCenter = { x: 6528701, y: 563500 };
  const viewSize = { width: 500, height: 320 };

  const bounds = useMemo(() => {
    if (points.length === 0) {
      return { cx: defaultCenter.x, cy: defaultCenter.y, dx: 150, dy: 100, minX: defaultCenter.x - 75, maxX: defaultCenter.x + 75, minY: defaultCenter.y - 50, maxY: defaultCenter.y + 50 };
    }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const dx = Math.max(maxX - minX, 10);
    const dy = Math.max(maxY - minY, 10);
    const padding = 0.25;
    return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, dx: dx * (1 + padding), dy: dy * (1 + padding), minX: minX - dx * padding / 2, maxX: maxX + dx * padding / 2, minY: minY - dy * padding / 2, maxY: maxY + dy * padding / 2 };
  }, [points]);

  const baseScale = useMemo(() => {
    const rx = viewSize.width / bounds.dy;
    const ry = viewSize.height / bounds.dx;
    return Math.min(rx, ry);
  }, [bounds]);

  const scale = baseScale * zoomLevel;

  // FIX: useCallback so worldToScreen is stable across renders
  const worldToScreen = useCallback((wx: number, wy: number) => ({
    x: viewSize.width / 2 + (wy - bounds.cy) * scale + panOffset.x,
    y: viewSize.height / 2 - (wx - bounds.cx) * scale + panOffset.y
  }), [bounds, scale, panOffset]);

  const screenToWorld = useCallback((sx: number, sy: number) => ({
    x: bounds.cx - (sy - viewSize.height / 2 - panOffset.y) / scale,
    y: bounds.cy + (sx - viewSize.width / 2 - panOffset.x) / scale
  }), [bounds, scale, panOffset]);

  const triggerNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const syncTextArea = useCallback((pts: GeoPoint[]) => {
    if (pts.length === 0) { setTextAreaValue(''); return; }
    const lines = pts.map(p =>
      selectedCoordSystem === 'wgs84'
        ? `${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}`
        : `${Math.round(p.x)}, ${Math.round(p.y)}`
    );
    setTextAreaValue(lines.join('\n'));
  }, [selectedCoordSystem]);

  const handleTextChange = (val: string) => {
    setTextAreaValue(val);
    if (!val.trim()) { setPoints([]); return; }
    try {
      const parsed = parseCoordinatesText(val);
      if (parsed.length > 0) setPoints(parsed);
    } catch { /* keep typing */ }
  };

  const handleFitView = () => {
    setPanOffset({ x: 0, y: 0 });
    setZoomLevel(1.0);
    triggerNotification('Vaade lähtestatud', 'info');
  };

  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    if (activeCursorMode === 'pan') {
      setIsPanning(true);
      setPanStart({ x: clickX - panOffset.x, y: clickY - panOffset.y });
      e.preventDefault();
    }
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    if (isPanning) {
      setPanOffset({ x: cursorX - panStart.x, y: cursorY - panStart.y });
      return;
    }

    if (draggedPointId !== null && activeCursorMode === 'draw') {
      const world = screenToWorld(cursorX, cursorY);
      const wgs = lest97ToWgs84(world.x, world.y);
      const updated = points.map(p =>
        p.id === draggedPointId
          ? { ...p, x: Math.round(world.x), y: Math.round(world.y), lat: wgs.lat, lon: wgs.lon }
          : p
      );
      setPoints(updated);
      syncTextArea(updated);
    }
  };

  const handleSvgMouseUp = () => {
    setDraggedPointId(null);
    setIsPanning(false);
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (activeCursorMode === 'pan' || isPanning || draggedPointId !== null) return;
    const target = e.target as SVGElement;
    if (target.tagName === 'circle' || target.getAttribute('data-handle') === 'true') return;

    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const wgs = lest97ToWgs84(world.x, world.y);
    const newPoint: GeoPoint = { id: Math.random().toString(36).substring(2, 9), x: Math.round(world.x), y: Math.round(world.y), lat: wgs.lat, lon: wgs.lon };
    const updated = [...points, newPoint];
    setPoints(updated);
    syncTextArea(updated);
  };

  const handleVertexDoubleClick = (id: string, idx: number) => {
    const updated = points.filter(p => p.id !== id);
    setPoints(updated);
    syncTextArea(updated);
    triggerNotification(`Punkt ${idx + 1} eemaldatud`, 'info');
  };

  const handleResetPoints = () => {
    setPoints([]);
    setTextAreaValue('');
    setPanOffset({ x: 0, y: 0 });
    setZoomLevel(1.0);
    triggerNotification('Kogu ruumikuju kustutatud', 'info');
  };

  const handleUndo = useCallback(() => {
    if (points.length === 0) return;
    const updated = points.slice(0, -1);
    setPoints(updated);
    syncTextArea(updated);
    triggerNotification('Viimane punkt eemaldatud', 'info');
  }, [points, syncTextArea]);

  // FIX: stable keyboard handler — depends on handleUndo via useCallback
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo]);

  const handleMidpointClick = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    const p1 = points[idx];
    const p2 = points[(idx + 1) % points.length];
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    const wgs = lest97ToWgs84(midX, midY);
    const inserted: GeoPoint = { id: Math.random().toString(36).substring(2, 9), x: Math.round(midX), y: Math.round(midY), lat: wgs.lat, lon: wgs.lon };
    const updated = [...points];
    updated.splice(idx + 1, 0, inserted);
    setPoints(updated);
    syncTextArea(updated);
    triggerNotification('Vahepunkt lisatud', 'success');
  };

  useEffect(() => { syncTextArea(points); }, [selectedCoordSystem]);
  useEffect(() => { syncTextArea(points); }, []);

  // Notify parent of point changes (stable ref check prevents extra calls)
  useEffect(() => {
    const serialized = JSON.stringify(points);
    if (onPointsChange && pointsStrRef.current !== serialized) {
      pointsStrRef.current = serialized;
      onPointsChange(serialized);
    }
  }, [points, onPointsChange]);

  // FIX: auto-apply geometry to calculator whenever points change and polygon is valid
  const stats = useMemo(() => calculatePolygonGeometry(points), [points]);

  useEffect(() => {
    if (points.length >= 3) {
      onApply(
        parseFloat(stats.areaHa.toFixed(4)),
        parseFloat(stats.perimeter.toFixed(1))
      );
    }
  }, [stats, points.length]);  // intentionally exclude onApply to avoid loop

  const handleApplyToCalculator = () => {
    if (points.length < 3) {
      triggerNotification('Vähemalt 3 punkti on vajalik polügooni loomiseks!', 'error');
      return;
    }
    onApply(parseFloat(stats.areaHa.toFixed(4)), parseFloat(stats.perimeter.toFixed(1)));
    triggerNotification('Pindala ja ümbermõõt kantud Lisa 3 kalkulaatorisse!', 'success');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const parsed = parseCoordinatesText(text);
        if (parsed.length > 0) {
          setPoints(parsed);
          syncTextArea(parsed);
          triggerNotification(`Fail laetud! (${parsed.length} punkti)`, 'success');
        } else {
          triggerNotification('Vigase formaadiga fail. Numbreid ei leitud.', 'error');
        }
      }
    };
    reader.readAsText(file);
  };

  const gridSpacing = useMemo(() => {
    const span = Math.max(bounds.dx, bounds.dy);
    if (span < 50) return 10;
    if (span < 150) return 25;
    if (span < 400) return 50;
    if (span < 1000) return 100;
    return 250;
  }, [bounds]);

  // FIX: gridLines now uses stable worldToScreen (useCallback), no unnecessary recalcs
  const gridLines = useMemo(() => {
    const lines: { coordinate: number; isX: boolean; screenCoord: number; label: string }[] = [];
    if (points.length === 0) return lines;
    const minYGrid = Math.ceil(bounds.minY / gridSpacing) * gridSpacing;
    const maxYGrid = Math.floor(bounds.maxY / gridSpacing) * gridSpacing;
    for (let y = minYGrid; y <= maxYGrid; y += gridSpacing) {
      const screenPos = worldToScreen(bounds.cx, y);
      lines.push({ coordinate: y, isX: false, screenCoord: screenPos.x, label: `${Math.round(y)} Y` });
    }
    const minXGrid = Math.ceil(bounds.minX / gridSpacing) * gridSpacing;
    const maxXGrid = Math.floor(bounds.maxX / gridSpacing) * gridSpacing;
    for (let x = minXGrid; x <= maxXGrid; x += gridSpacing) {
      const screenPos = worldToScreen(x, bounds.cy);
      lines.push({ coordinate: x, isX: true, screenCoord: screenPos.y, label: `${Math.round(x)} X` });
    }
    return lines;
  }, [bounds, gridSpacing, worldToScreen, points.length]);

  return (
    <div className="card border border-slate-200 shadow-md p-6 bg-white overflow-hidden font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Compass className="w-5 h-5 text-indigo-600" />
            L-EST'97 Kaardimoodul ja Pindala Arvutaja
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
            Märgi metsaeraldise piir kaardil või aseta siia katastripunktid ruumikuju ja perimeetri automaatseks kalkuleerimiseks.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className={`px-3 py-1 text-[11px] font-bold rounded-lg ${selectedCoordSystem === 'lest97' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`} onClick={() => setSelectedCoordSystem('lest97')}>L-EST'97 (M)</button>
          <button type="button" className={`px-3 py-1 text-[11px] font-bold rounded-lg ${selectedCoordSystem === 'wgs84' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`} onClick={() => setSelectedCoordSystem('wgs84')}>WGS84 (GPS)</button>
        </div>
      </div>

      {notification && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg text-xs font-medium border flex items-center gap-2 ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : notification.type === 'error' ? 'bg-rose-50 text-rose-800 border-rose-100' : 'bg-indigo-50 text-indigo-800 border-indigo-100'}`}>
          <Sparkles className="w-4 h-4 shrink-0" />
          {notification.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8 flex flex-col gap-3">
          <div className="relative border border-slate-200 rounded-2xl overflow-hidden bg-slate-900/90 shadow-inner">
            {/* Compass */}
            <div className="absolute top-4 right-4 pointer-events-none z-10 opacity-70 flex flex-col items-center">
              <div className="w-8 h-8 rounded-full border border-slate-400 bg-slate-800/80 flex items-center justify-center text-white text-[10px] font-bold">N</div>
              <div className="w-0.5 h-3 bg-red-500 mt-px"></div>
            </div>

            {/* Tool controls */}
            <div className="absolute left-4 top-4 z-10 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 p-1 bg-slate-800/80 rounded-lg border border-slate-700 backdrop-blur-sm">
                <button onClick={() => setActiveCursorMode('draw')} className={`p-1.5 rounded-md ${activeCursorMode === 'draw' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`} title="Joonista ja lohista punkte"><MousePointer className="w-3.5 h-3.5" /></button>
                <button onClick={() => setActiveCursorMode('pan')} className={`p-1.5 rounded-md ${activeCursorMode === 'pan' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`} title="Vaate nihutamine"><Map className="w-3.5 h-3.5" /></button>
              </div>
              <div className="flex flex-col gap-1 p-1 bg-slate-800/80 rounded-lg border border-slate-700 backdrop-blur-sm text-white">
                <button onClick={() => setZoomLevel(prev => Math.min(prev * 1.25, 10.0))} className="p-1.5 hover:text-indigo-400 transition-all" title="Suurenda"><ZoomIn className="w-3.5 h-3.5" /></button>
                <button onClick={() => setZoomLevel(prev => Math.max(prev * 0.8, 0.1))} className="p-1.5 hover:text-indigo-400 transition-all border-t border-slate-700" title="Vähenda"><ZoomOut className="w-3.5 h-3.5" /></button>
                <button onClick={handleFitView} className="p-1.5 hover:text-indigo-400 transition-all border-t border-slate-700" title="Lähtesta"><Maximize2 className="w-3.5 h-3.5" /></button>
              </div>
              <button type="button" onClick={handleUndo} disabled={points.length === 0} className={`flex items-center justify-center p-1.5 rounded-lg border backdrop-blur-sm transition-all ${points.length > 0 ? 'bg-slate-800/80 hover:bg-slate-700/90 text-amber-400 border-slate-700 cursor-pointer' : 'bg-slate-800/40 text-slate-600 border-slate-800/80 cursor-not-allowed'}`} title="Võta viimane punkt tagasi (Ctrl+Z)"><Undo className="w-3.5 h-3.5" /></button>
            </div>

            <div className="w-full h-[320px] select-none">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${viewSize.width} ${viewSize.height}`}
                className={`w-full h-full ${activeCursorMode === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`}
                onMouseDown={handleSvgMouseDown}
                onMouseMove={handleSvgMouseMove}
                onMouseUp={handleSvgMouseUp}
                onClick={handleSvgClick}
              >
                <defs>
                  <pattern id="est-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#est-grid)" />

                {gridLines.map((line, i) =>
                  line.isX ? (
                    <g key={`grid-x-${i}`}>
                      <line x1={0} y1={line.screenCoord} x2={viewSize.width} y2={line.screenCoord} stroke="rgba(255,255,255,0.06)" strokeDasharray="2,4" strokeWidth="1" />
                      {line.screenCoord > 15 && line.screenCoord < viewSize.height - 10 && (
                        <text x={12} y={line.screenCoord + 3} fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily="monospace">{line.label}</text>
                      )}
                    </g>
                  ) : (
                    <g key={`grid-y-${i}`}>
                      <line x1={line.screenCoord} y1={0} x2={line.screenCoord} y2={viewSize.height} stroke="rgba(255,255,255,0.06)" strokeDasharray="2,4" strokeWidth="1" />
                      {line.screenCoord > 60 && line.screenCoord < viewSize.width - 25 && (
                        <text x={line.screenCoord - 3} y={viewSize.height - 12} fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily="monospace" textAnchor="middle">{line.label}</text>
                      )}
                    </g>
                  )
                )}

                {points.length >= 2 && (
                  <polygon
                    points={points.map(p => { const sp = worldToScreen(p.x, p.y); return `${sp.x},${sp.y}`; }).join(' ')}
                    fill="rgba(99, 102, 241, 0.2)"
                    stroke="#818cf8"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    className="cursor-default"
                  />
                )}

                {activeCursorMode === 'draw' && points.length >= 3 && points.map((p, idx) => {
                  const pNext = points[(idx + 1) % points.length];
                  const sp1 = worldToScreen(p.x, p.y);
                  const sp2 = worldToScreen(pNext.x, pNext.y);
                  const midX = (sp1.x + sp2.x) / 2;
                  const midY = (sp1.y + sp2.y) / 2;
                  return (
                    <g key={`mid-${idx}`}>
                      <circle cx={midX} cy={midY} r={5} fill="#312e81" stroke="#818cf8" strokeWidth="1" className="cursor-pointer" onClick={(e) => handleMidpointClick(e, idx)} data-handle="true" />
                      <line x1={midX - 2} y1={midY} x2={midX + 2} y2={midY} stroke="#fff" strokeWidth="1" pointerEvents="none" />
                      <line x1={midX} y1={midY - 2} x2={midX} y2={midY + 2} stroke="#fff" strokeWidth="1" pointerEvents="none" />
                    </g>
                  );
                })}

                {activeCursorMode === 'draw' && points.map((p, idx) => {
                  const sp = worldToScreen(p.x, p.y);
                  const isDragged = draggedPointId === p.id;
                  return (
                    <g key={p.id}>
                      <circle cx={sp.x} cy={sp.y} r={isDragged ? 8 : 6} fill={isDragged ? '#6366f1' : '#4f46e5'} stroke="#fff" strokeWidth="1.5" className="cursor-pointer" onMouseDown={(e) => { e.stopPropagation(); setDraggedPointId(p.id); }} onDoubleClick={() => handleVertexDoubleClick(p.id, idx)} />
                      <text x={sp.x} y={sp.y - 10} fontSize="8" fontWeight="bold" fill="#f8fafc" fontFamily="sans-serif" textAnchor="middle" className="pointer-events-none select-none">{idx + 1}</text>
                    </g>
                  );
                })}

                {points.length === 0 && (
                  <g pointerEvents="none" className="opacity-40">
                    <text x={viewSize.width / 2} y={viewSize.height / 2 - 15} fill="#e2e8f0" textAnchor="middle" fontSize="10px" fontWeight="bold" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>VIRTUAALNE L-EST'97 KAARDIVÄLI</text>
                    <text x={viewSize.width / 2} y={viewSize.height / 2 + 10} fill="#94a3b8" textAnchor="middle" fontSize="9px">Klõpsa kaardil eri nurkadel, et hakata polügooni joonistama</text>
                    <text x={viewSize.width / 2} y={viewSize.height / 2 + 25} fill="#64748b" textAnchor="middle" fontSize="9px" fontStyle="italic">või lohista asjakohased koordinaadipunktid paremal asuvasse tekstilahtrisse</text>
                  </g>
                )}
              </svg>
            </div>

            {points.length > 0 && (
              <div className="absolute right-4 bottom-4 px-3 py-1 bg-slate-900/80 rounded border border-slate-700 pointer-events-none text-[9px] font-mono text-slate-300">
                Ristvõrk: {gridSpacing}m sammuga
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Mõõdetud pindala</p>
              <p className="text-xl font-bold font-mono text-slate-800 mt-0.5">{stats.areaHa.toFixed(4)} <span className="text-xs font-semibold text-slate-600">ha</span></p>
              <p className="text-[9px] text-slate-400 mt-0.5 font-mono">({Math.round(stats.areaSqM).toLocaleString('et-EE')} m²)</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Perimeeter</p>
              <p className="text-xl font-bold font-mono text-slate-800 mt-0.5">{stats.perimeter.toFixed(1)} <span className="text-xs font-semibold text-slate-600">m</span></p>
              <p className="text-[9px] text-slate-400 mt-0.5">Looduslik piirimõõt</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-col justify-between">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Piiripunkte</p>
                <p className="text-lg font-mono font-bold text-slate-800">{points.length} <span className="text-xs font-semibold text-slate-400">tk</span></p>
              </div>
              {points.length > 0 && (
                <div className="flex flex-col gap-1.5 items-end mt-1">
                  <button type="button" onClick={handleUndo} className="text-[9px] text-amber-600 hover:text-amber-700 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"><Undo className="w-3 h-3" /> Võta tagasi</button>
                  <button type="button" onClick={handleResetPoints} className="text-[9px] text-rose-600 hover:text-rose-700 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"><Trash2 className="w-3 h-3" /> Puhasta</button>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={points.length < 3}
            onClick={handleApplyToCalculator}
            className={`w-full py-3 px-4 flex items-center justify-center gap-2 rounded-xl text-xs uppercase font-bold transition-all shadow-sm ${points.length >= 3 ? 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-[0.98] cursor-pointer' : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'}`}
          >
            <span>Kanna väärtused kalkulaatorisse</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Coordinate editor */}
        <div className="md:col-span-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 h-full">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Koordinaadid</label>
              <div className="text-[9px] text-slate-400 font-medium">({selectedCoordSystem === 'lest97' ? 'X, Y' : 'Lat, Lon'})</div>
            </div>
            <textarea
              className="w-full flex-1 max-h-[220px] min-h-[160px] font-mono text-[10px] p-3 text-slate-700 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-50/50 focus:bg-white custom-scrollbar focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 placeholder:italic leading-relaxed resize-none"
              value={textAreaValue}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={selectedCoordSystem === 'lest97' ? "6543120, 534560\n6543200, 534600\n6543150, 534710\n" : "58.378051, 26.729105\n58.378712, 26.729790\n58.378399, 26.731110\n"}
            />
          </div>

          <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 p-4 rounded-xl flex flex-col items-center justify-center text-center transition-colors bg-slate-50/30">
            <Upload className="w-6 h-6 text-slate-400 mb-2" />
            <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Import failist (.csv, .txt)</p>
            <p className="text-[10px] text-slate-400 mt-1 leading-normal">Lohista fail siia või vali arvutist</p>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv,.txt" className="hidden" />
            <button type="button" className="mt-3 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer shadow-sm" onClick={() => fileInputRef.current?.click()}>Vali fail seadmest</button>
          </div>

          <div className="bg-indigo-50/70 border border-indigo-100/30 p-4 rounded-xl text-[10px] leading-relaxed text-indigo-950/80">
            <h5 className="font-bold text-indigo-900 text-[10px] uppercase mb-1 tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Kasulik tähelepanek
            </h5>
            <ul className="list-disc pl-3 mt-1.5 space-y-1">
              <li>Formaat on paindlik! Sobib tühiku, koma või semikooloniga jagatud andmed.</li>
              <li>Süsteem tuvastab automaatselt kumb on <strong>Northing(X)</strong> ja <strong>Easting(Y)</strong>.</li>
              <li>Toetab ridade kopeerimist katastrikaardilt.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
