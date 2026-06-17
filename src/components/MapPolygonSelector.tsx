import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Upload, 
  Trash2, 
  Compass, 
  Map, 
  Copy, 
  Grid, 
  Layers, 
  Plus, 
  ArrowRight,
  Maximize2,
  ZoomIn,
  ZoomOut,
  MousePointer,
  Sparkles,
  Check,
  Undo
} from 'lucide-react';
import { 
  GeoPoint, 
  parseCoordinatesText, 
  calculatePolygonGeometry, 
  lest97ToWgs84, 
  wgs84ToLest97 
} from '../lib/geo';

interface MapPolygonSelectorProps {
  onApply: (areaHa: number, perimeter: number) => void;
  initialArea: string;
  initialPerimeter: string;
  initialPoints?: any[];
  onPointsChange?: (points: any[]) => void;
}

export default function MapPolygonSelector({ onApply, initialArea, initialPerimeter, initialPoints, onPointsChange }: MapPolygonSelectorProps) {
  const [points, setPoints] = useState<GeoPoint[]>(initialPoints ?? []);
  const [textAreaValue, setTextAreaValue] = useState('');
  const [draggedPointId, setDraggedPointId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [selectedCoordSystem, setSelectedCoordSystem] = useState<'lest97' | 'wgs84'>('lest97');
  const [activeCursorMode, setActiveCursorMode] = useState<'draw' | 'pan'>('draw');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default coordinate center (Estonia center: Paide approx area - 6528701 N, 563500 E)
  const defaultCenter = { x: 6528701, y: 563500 };
  const viewSize = { width: 500, height: 320 };

  // Calculate polygon boundaries and coordinates scale
  const bounds = useMemo(() => {
    if (points.length === 0) {
      return {
        cx: defaultCenter.x,
        cy: defaultCenter.y,
        dx: 150, // default meter span
        dy: 100,
        minX: defaultCenter.x - 75,
        maxX: defaultCenter.x + 75,
        minY: defaultCenter.y - 50,
        maxY: defaultCenter.y + 50
      };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    // Add padding to bounds
    const dx = Math.max(maxX - minX, 10); // avoid division by zero
    const dy = Math.max(maxY - minY, 10);
    const padding = 0.25; // 25% padding

    return {
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
      dx: dx * (1 + padding),
      dy: dy * (1 + padding),
      minX: minX - dx * padding / 2,
      maxX: maxX + dx * padding / 2,
      minY: minY - dy * padding / 2,
      maxY: maxY + dy * padding / 2
    };
  }, [points]);

  // View-port scale based on bounds and zoom level
  const baseScale = useMemo(() => {
    const rx = viewSize.width / bounds.dy; // world Y is Easting (X axis of screen)
    const ry = viewSize.height / bounds.dx; // world X is Northing (Y axis of screen)
    return Math.min(rx, ry);
  }, [bounds, viewSize.width, viewSize.height]);

  const scale = baseScale * zoomLevel;

  // Convert L-EST'97 coordinates (world) to SVG canvas coordinates (screen)
  const worldToScreen = (wx: number, wy: number) => {
    const sx = viewSize.width / 2 + (wy - bounds.cy) * scale + panOffset.x;
    const sy = viewSize.height / 2 - (wx - bounds.cx) * scale + panOffset.y;
    return { x: sx, y: sy };
  };

  // Convert SVG canvas coordinates to L-EST'97 coordinates
  const screenToWorld = (sx: number, sy: number) => {
    const wy = bounds.cy + (sx - viewSize.width / 2 - panOffset.x) / scale;
    const wx = bounds.cx - (sy - viewSize.height / 2 - panOffset.y) / scale;
    return { x: wx, y: wy };
  };

  // Trigger brief alert notification
  const triggerNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Sync textbox textual representation reflecting current point set
  const syncTextArea = (pts: GeoPoint[]) => {
    if (pts.length === 0) {
      setTextAreaValue('');
      return;
    }
    const lines = pts.map(p => {
      if (selectedCoordSystem === 'wgs84') {
        return `${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}`;
      }
      return `${Math.round(p.x)}, ${Math.round(p.y)}`;
    });
    setTextAreaValue(lines.join('\n'));
  };

  // Synchronise points from manual text-area submissions
  const handleTextChange = (val: string) => {
    setTextAreaValue(val);
    if (!val.trim()) {
      setPoints([]);
      return;
    }
    try {
      const parsed = parseCoordinatesText(val);
      if (parsed.length > 0) {
        setPoints(parsed);
      }
    } catch (e) {
      // Keep typing silences
    }
  };

  // Reset viewport to optimally zoom/show current polygon points
  const handleFitView = () => {
    setPanOffset({ x: 0, y: 0 });
    setZoomLevel(1.0);
    triggerNotification('Vaade lähtestatud', 'info');
  };

  // Handle Dragging vertices
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
      setPanOffset({
        x: cursorX - panStart.x,
        y: cursorY - panStart.y
      });
      return;
    }

    if (draggedPointId !== null && activeCursorMode === 'draw') {
      const world = screenToWorld(cursorX, cursorY);
      const wgs = lest97ToWgs84(world.x, world.y);

      const updated = points.map(p => {
        if (p.id === draggedPointId) {
          return {
            ...p,
            x: Math.round(world.x),
            y: Math.round(world.y),
            lat: wgs.lat,
            lon: wgs.lon
          };
        }
        return p;
      });

      setPoints(updated);
      syncTextArea(updated);
    }
  };

  const handleSvgMouseUp = () => {
    setDraggedPointId(null);
    setIsPanning(false);
  };

  // Handle clicking the canvas layer
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (activeCursorMode === 'pan' || isPanning) return;
    if (draggedPointId !== null) return;

    // Check if the click target or its parent was a control circle or segment midpoint to ignore polygon appending
    const target = e.target as SVGElement;
    if (target.tagName === 'circle' || target.getAttribute('data-handle') === 'true') {
      return;
    }

    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const world = screenToWorld(clickX, clickY);
    const wgs = lest97ToWgs84(world.x, world.y);

    const newPoint: GeoPoint = {
      id: Math.random().toString(36).substring(2, 9),
      x: Math.round(world.x),
      y: Math.round(world.y),
      lat: wgs.lat,
      lon: wgs.lon
    };

    const updated = [...points, newPoint];
    setPoints(updated);
    syncTextArea(updated);
  };

  // Double-click a vertex to delete it
  const handleVertexDoubleClick = (id: string, idx: number) => {
    const updated = points.filter(p => p.id !== id);
    setPoints(updated);
    syncTextArea(updated);
    triggerNotification(`Punkt ${idx + 1} eemaldatud`, 'info');
  };

  // Delete all geometry
  const handleResetPoints = () => {
    setPoints([]);
    setTextAreaValue('');
    setPanOffset({ x: 0, y: 0 });
    setZoomLevel(1.0);
    triggerNotification('Kogu ruumikuju kustutatud', 'info');
  };

  // Undo last coordinate point
  const handleUndo = () => {
    if (points.length === 0) return;
    const updated = points.slice(0, -1);
    setPoints(updated);
    syncTextArea(updated);
    triggerNotification('Viimane punkt eemaldatud (tagasi võetud)', 'info');
  };

  // Keyboard shortcut Ctrl+Z / Cmd+Z for undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        const activeElem = document.activeElement;
        const isInput = activeElem && (activeElem.tagName === 'INPUT' || activeElem.tagName === 'TEXTAREA');
        if (!isInput) {
          e.preventDefault();
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [points]);

  // Add mid-segment handles to introduce middle vertices
  const handleMidpointClick = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    const p1 = points[idx];
    const p2 = points[(idx + 1) % points.length];

    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    const wgs = lest97ToWgs84(midX, midY);

    const insertedPoint: GeoPoint = {
      id: Math.random().toString(36).substring(2, 9),
      x: Math.round(midX),
      y: Math.round(midY),
      lat: wgs.lat,
      lon: wgs.lon
    };

    const updated = [...points];
    updated.splice(idx + 1, 0, insertedPoint);

    setPoints(updated);
    syncTextArea(updated);
    triggerNotification('Vahepunkt lisatud', 'success');
  };

  // Coordinate system toggles - converts text content inside text area reflecting system formats
  const handleCoordSystemToggle = (system: 'lest97' | 'wgs84') => {
    setSelectedCoordSystem(system);
  };

  useEffect(() => {
    syncTextArea(points);
  }, [selectedCoordSystem]);

  useEffect(() => {
    syncTextArea(points);
  }, []);

  const pointsStrRef = useRef(JSON.stringify(points));
  useEffect(() => {
    const serialized = JSON.stringify(points);
    if (onPointsChange && pointsStrRef.current !== serialized) {
      pointsStrRef.current = serialized;
      onPointsChange(points);
    }
  }, [points, onPointsChange]);

  // Handle File upload parse
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

  // Calculate area / perimeter parameters in real-time
  const stats = useMemo(() => {
    return calculatePolygonGeometry(points);
  }, [points]);

  // Prefill Lisa 3 calculator parameters
  const handleApplyToCalculator = () => {
    if (points.length < 3) {
      triggerNotification('Kalkulaatorisse kandmiseks on vaja vähemalt 3 punkti (polügooni)!', 'error');
      return;
    }

    onApply(
      parseFloat(stats.areaHa.toFixed(4)),
      parseFloat(stats.perimeter.toFixed(1))
    );
    triggerNotification('Pindala ja ümbermõõt kantud Lisa 3 kalkulaatorisse!', 'success');
  };

  // Dynamically calculate grid spacing for grid ticks based on bounding sizes
  const gridSpacing = useMemo(() => {
    const span = Math.max(bounds.dx, bounds.dy);
    if (span < 50) return 10;
    if (span < 150) return 25;
    if (span < 400) return 50;
    if (span < 1000) return 100;
    return 250;
  }, [bounds]);

  // Generate coordinate grid lines to overlay
  const gridLines = useMemo(() => {
    const lines: { coordinate: number; isX: boolean; screenCoord: number; label: string }[] = [];
    if (points.length === 0) return lines;

    // Grid vertical lines based on Eastings (Y)
    const minYGrid = Math.ceil(bounds.minY / gridSpacing) * gridSpacing;
    const maxYGrid = Math.floor(bounds.maxY / gridSpacing) * gridSpacing;
    for (let y = minYGrid; y <= maxYGrid; y += gridSpacing) {
      const screenPos = worldToScreen(bounds.cx, y);
      lines.push({
        coordinate: y,
        isX: false,
        screenCoord: screenPos.x,
        label: `${Math.round(y)} Y`
      });
    }

    // Grid horizontal lines based on Northings (X)
    const minXGrid = Math.ceil(bounds.minX / gridSpacing) * gridSpacing;
    const maxXGrid = Math.floor(bounds.maxX / gridSpacing) * gridSpacing;
    for (let x = minXGrid; x <= maxXGrid; x += gridSpacing) {
      const screenPos = worldToScreen(x, bounds.cy);
      lines.push({
        coordinate: x,
        isX: true,
        screenCoord: screenPos.y,
        label: `${Math.round(x)} X`
      });
    }

    return lines;
  }, [bounds, gridSpacing, scale, panOffset, points]);

  return (
    <div className="card border border-slate-200 shadow-md p-6 bg-white overflow-hidden font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Compass className="w-5 h-5 text-forest-600" />
            L-EST'97 Kaardimoodul ja Pindala Arvutaja
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
            Märgi metsaeraldise piir kaardil või aseta siia katastripunktid ruumikuju ja perimeetri automaatseks kalkuleerimiseks.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            type="button"
            className={`px-3 py-1 text-[11px] font-bold rounded-lg ${selectedCoordSystem === 'lest97' ? 'bg-forest-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            onClick={() => handleCoordSystemToggle('lest97')}
          >
            L-EST'97 (M)
          </button>
          <button 
            type="button"
            className={`px-3 py-1 text-[11px] font-bold rounded-lg ${selectedCoordSystem === 'wgs84' ? 'bg-forest-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            onClick={() => handleCoordSystemToggle('wgs84')}
          >
            WGS84 (GPS)
          </button>
        </div>
      </div>

      {notification && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg text-xs font-medium border animate-fadeIn flex items-center gap-2 ${
          notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 
          notification.type === 'error' ? 'bg-rose-50 text-rose-800 border-rose-100' :
          'bg-forest-50 text-forest-700 border-forest-100'
        }`}>
          <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
          {notification.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* SVG Interactive Canvas */}
        <div className="md:col-span-8 flex flex-col gap-3">
          <div className="relative border border-slate-200 rounded-2xl overflow-hidden bg-slate-900/90 shadow-inner group">
            {/* Visual Compass Layer */}
            <div className="absolute top-4 right-4 pointer-events-none z-10 opacity-70 flex flex-col items-center">
              <div className="w-8 h-8 rounded-full border border-slate-400 bg-slate-800/80 flex items-center justify-center text-white text-[10px] font-bold">
                N
              </div>
              <div className="w-0.5 h-3 bg-red-500 mt-px"></div>
            </div>

            {/* Base grid controls bar */}
            <div className="absolute left-4 top-4 z-10 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 p-1 bg-slate-800/80 rounded-lg border border-slate-700 backdrop-blur-xs">
                <button
                  onClick={() => setActiveCursorMode('draw')}
                  className={`p-1.5 rounded-md ${activeCursorMode === 'draw' ? 'bg-forest-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  <MousePointer className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setActiveCursorMode('pan')}
                  className={`p-1.5 rounded-md ${activeCursorMode === 'pan' ? 'bg-forest-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  <Map className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex flex-col gap-1 p-1 bg-slate-800/80 rounded-lg border border-slate-700 backdrop-blur-xs text-white">
                <button 
                  onClick={() => setZoomLevel(prev => Math.min(prev * 1.25, 10.0))}
                  className="p-1.5 hover:text-forest-500 font-bold transition-all"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setZoomLevel(prev => Math.max(prev * 0.8, 0.1))}
                  className="p-1.5 hover:text-forest-500 font-bold transition-all border-t border-slate-700"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={handleFitView}
                  className="p-1.5 hover:text-forest-500 text-[9px] font-bold transition-all border-t border-slate-700"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <button 
                type="button"
                onClick={handleUndo}
                disabled={points.length === 0}
                className={`flex items-center justify-center p-1.5 rounded-lg border backdrop-blur-xs transition-all ${
                  points.length > 0 
                    ? 'bg-slate-800/80 hover:bg-slate-700/90 text-amber-400 border-slate-700 shadow-xs cursor-pointer' 
                    : 'bg-slate-800/40 text-slate-600 border-slate-800/80 cursor-not-allowed'
                }`}
              >
                <Undo className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* SVG Visual Canvas Map Container */}
            <div className="w-full xs:h-[400px] h-[320px] select-none" ref={containerRef}>
              <svg
                ref={svgRef}
                viewBox={`0 0 ${viewSize.width} ${viewSize.height}`}
                className={`w-full h-full cursor-grid ${activeCursorMode === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`}
                onMouseDown={handleSvgMouseDown}
                onMouseMove={handleSvgMouseMove}
                onMouseUp={handleSvgMouseUp}
                onClick={handleSvgClick}
              >
                {/* Patterns or Topographical Stylings */}
                <defs>
                  <pattern id="est-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#est-grid)" />

                {/* Grid Overlay */}
                {gridLines.map((line, i) => {
                  if (line.isX) {
                    // Horizontal North grid lines
                    return (
                      <g key={`grid-x-${i}`}>
                        <line 
                          x1={0} 
                          y1={line.screenCoord} 
                          x2={viewSize.width} 
                          y2={line.screenCoord} 
                          stroke="rgba(255,255,255,0.06)" 
                          strokeDasharray="2,4"
                          strokeWidth="1"
                        />
                        {line.screenCoord > 15 && line.screenCoord < viewSize.height - 10 && (
                          <text 
                            x={12} 
                            y={line.screenCoord + 3} 
                            fill="rgba(255,255,255,0.3)" 
                            fontSize="8" 
                            fontFamily="monospace"
                          >
                            {line.label}
                          </text>
                        )}
                      </g>
                    );
                  } else {
                    // Vertical East grid lines
                    return (
                      <g key={`grid-y-${i}`}>
                        <line 
                          x1={line.screenCoord} 
                          y1={0} 
                          x2={line.screenCoord} 
                          y2={viewSize.height} 
                          stroke="rgba(255,255,255,0.06)" 
                          strokeDasharray="2,4"
                          strokeWidth="1"
                        />
                        {line.screenCoord > 60 && line.screenCoord < viewSize.width - 25 && (
                          <text 
                            x={line.screenCoord - 3} 
                            y={viewSize.height - 12} 
                            fill="rgba(255,255,255,0.3)" 
                            fontSize="8" 
                            fontFamily="monospace"
                            textAnchor="middle"
                          >
                            {line.label}
                          </text>
                        )}
                      </g>
                    );
                  }
                })}

                {/* Polygon Polygon Path drawn in high fidelity */}
                {points.length >= 2 && (
                  <polygon
                    points={points.map(p => {
                      const sp = worldToScreen(p.x, p.y);
                      return `${sp.x},${sp.y}`;
                    }).join(' ')}
                    fill="rgba(99, 102, 241, 0.2)"
                    stroke="#818cf8"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    className="cursor-default"
                  />
                )}

                {/* Drawing virtual connections back to first node if under 3 points but > 1 */}
                {points.length === 2 && (
                  <line 
                    x1={worldToScreen(points[0].x, points[0].y).x}
                    y1={worldToScreen(points[0].x, points[0].y).y}
                    x2={worldToScreen(points[1].x, points[1].y).x}
                    y2={worldToScreen(points[1].x, points[1].y).y}
                    stroke="#818cf8"
                    strokeWidth="2"
                  />
                )}

                {/* Mid-point Handle Circle triggers */}
                {activeCursorMode === 'draw' && points.length >= 3 && points.map((p, idx) => {
                  const pNext = points[(idx + 1) % points.length];
                  const sp1 = worldToScreen(p.x, p.y);
                  const sp2 = worldToScreen(pNext.x, pNext.y);
                  const midX = (sp1.x + sp2.x) / 2;
                  const midY = (sp1.y + sp2.y) / 2;

                  return (
                    <g key={`mid-${idx}`}>
                      <circle
                        cx={midX}
                        cy={midY}
                        r={5}
                        fill="#312e81"
                        stroke="#818cf8"
                        strokeWidth="1"
                        className="hover:scale-130 transition-transform cursor-pointer"
                       
                        onClick={(e) => handleMidpointClick(e, idx)}
                        data-handle="true"
                      />
                      <line 
                        x1={midX - 2} y1={midY} x2={midX + 2} y2={midY} stroke="#fff" strokeWidth="1" pointerEvents="none"
                      />
                      <line 
                        x1={midX} y1={midY - 2} x2={midX} y2={midY + 2} stroke="#fff" strokeWidth="1" pointerEvents="none"
                      />
                    </g>
                  );
                })}

                {/* Vertex handles circles for editing coordinates directly */}
                {activeCursorMode === 'draw' && points.map((p, idx) => {
                  const sp = worldToScreen(p.x, p.y);
                  const isDragged = draggedPointId === p.id;

                  return (
                    <g key={p.id}>
                      <circle
                        cx={sp.x}
                        cy={sp.y}
                        r={isDragged ? 8 : 6}
                        fill={isDragged ? '#6366f1' : '#4f46e5'}
                        stroke="#fff"
                        strokeWidth="1.5"
                        className="cursor-pointer hover:scale-125 transition-transform"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setDraggedPointId(p.id);
                        }}
                        onDoubleClick={() => handleVertexDoubleClick(p.id, idx)}
                      />
                      {/* Vertex label */}
                      <text
                        x={sp.x}
                        y={sp.y - 10}
                        fontSize="8"
                        fontWeight="bold"
                        fill="#f8fafc"
                        fontFamily="sans-serif"
                        textAnchor="middle"
                        className="bg-slate-900 pointer-events-none drop-shadow-md select-none"
                      >
                        {idx + 1}
                      </text>
                    </g>
                  );
                })}

                {/* Helpful instructions inside the empty black canvas */}
                {points.length === 0 && (
                  <g pointerEvents="none" className="opacity-40">
                    <text 
                      x={viewSize.width / 2} 
                      y={viewSize.height / 2 - 15} 
                      fill="#e2e8f0" 
                      textAnchor="middle" 
                      fontSize="10px" 
                      fontWeight="bold"
                      style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    >
                      VIRTUAALNE L-EST'97 KAARDIVÄLI
                    </text>
                    <text 
                      x={viewSize.width / 2} 
                      y={viewSize.height / 2 + 10} 
                      fill="#94a3b8" 
                      textAnchor="middle" 
                      fontSize="9px"
                    >
                      Klõpsa kaardil eri nurkadel, et hakata polügooni joonistama
                    </text>
                    <text 
                      x={viewSize.width / 2} 
                      y={viewSize.height / 2 + 25} 
                      fill="#64748b" 
                      textAnchor="middle" 
                      fontSize="9px"
                      fontStyle="italic"
                    >
                      või lohista asjakohased koordinaadipunktid paremal asuvasse tekstilahtrisse
                    </text>
                  </g>
                )}
              </svg>
            </div>

            {/* Scale Bar metric info layer */}
            {points.length > 0 && (
              <div className="absolute right-4 bottom-4 px-3 py-1 bg-slate-900/80 rounded border border-slate-700 pointer-events-none flex items-center gap-1.5 text-[9px] font-mono text-slate-300">
                <span>Ristvõrk: {gridSpacing}m sammuga</span>
              </div>
            )}
          </div>

          {/* Geometry Statistics Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Mõõdetud pindala</p>
              <p className="text-xl font-bold font-mono text-slate-800 tracking-tight mt-0.5">
                {stats.areaHa.toFixed(4)} <span className="text-xs font-semibold text-slate-600">ha</span>
              </p>
              <p className="text-[9px] text-slate-400 mt-0.5 font-mono">({Math.round(stats.areaSqM).toLocaleString('et-EE')} m²)</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Perimeeter</p>
              <p className="text-xl font-bold font-mono text-slate-800 tracking-tight mt-0.5">
                {stats.perimeter.toFixed(1)} <span className="text-xs font-semibold text-slate-600">m</span>
              </p>
              <p className="text-[9px] text-slate-400 mt-0.5">Looduslik piirimõõt</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-col justify-between">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Piiripunkte</p>
                <p className="text-lg font-mono font-bold text-slate-800 tracking-tight leading-tight">
                  {points.length} <span className="text-xs font-semibold text-slate-400">tk</span>
                </p>
              </div>
              {points.length > 0 && (
                <div className="flex flex-col gap-1.5 self-end mt-1.5 items-end">
                  <button
                    type="button"
                    onClick={handleUndo}
                    className="text-[9px] text-amber-600 hover:text-amber-700 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer w-fit transition-all"
                  >
                    <Undo className="w-3 h-3" /> Võta tagasi
                  </button>
                  <button
                    type="button"
                    onClick={handleResetPoints}
                    className="text-[9px] text-rose-600 hover:text-rose-700 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer w-fit transition-all"
                  >
                    <Trash2 className="w-3 h-3" /> Puhasta kaart
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Trigger Transfer and autofill update button */}
          <button
            type="button"
            disabled={points.length < 3}
            onClick={handleApplyToCalculator}
            className={`w-full py-3 px-4 flex items-center justify-center gap-2 rounded-xl text-xs uppercase font-bold transition-all shadow-sm ${
              points.length >= 3 
                ? 'bg-forest-600 hover:bg-forest-700 text-white active:scale-[0.98] cursor-pointer' 
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
          >
            <span>Kanna väärtused kalkulaatorisse</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Text coordinate editor / Uploader panel */}
        <div className="md:col-span-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 h-full">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Koordinaadid</label>
              <div className="text-[9px] text-slate-400 font-medium">Asukohad ridade kaupa ({selectedCoordSystem === 'lest97' ? 'X, Y' : 'Lat, Lon'})</div>
            </div>

            <textarea
              className="w-full flex-1 max-h-[220px] min-h-[160px] md:h-auto font-mono text-[10px] p-3 text-slate-700 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-50/50 focus:bg-white custom-scrollbar focus:ring-1 focus:ring-forest-500 focus:border-forest-500 outline-hidden transition-all placeholder:text-slate-400 placeholder:italic leading-relaxed resize-none"
              value={textAreaValue}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={
                selectedCoordSystem === 'lest97' 
                  ? "6543120, 534560\n6543200, 534600\n6543150, 534710\n" 
                  : "58.378051, 26.729105\n58.378712, 26.729790\n58.378399, 26.731110\n"
              }
            />
          </div>

          {/* Drag & Drop Upload Container */}
          <div className="border-2 border-dashed border-slate-200 hover:border-forest-400 p-4 rounded-xl flex flex-col items-center justify-center text-center transition-colors bg-slate-50/30">
            <Upload className="w-6 h-6 text-slate-400 mb-2" />
            <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Import failist (.csv, .txt)</p>
            <p className="text-[10px] text-slate-400 mt-1 leading-normal max-w-[150px]">Lohista fail siia või vali arvutist</p>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".csv,.txt" 
              className="hidden" 
            />
            <button
              type="button"
              className="mt-3 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:scale-95 transition-all cursor-pointer shadow-xs"
              onClick={() => fileInputRef.current?.click()}
            >
              Vali fail seadmest
            </button>
          </div>

          <div className="bg-forest-50/70 border border-forest-100/30 p-4 rounded-xl text-[10px] leading-relaxed text-forest-900/80">
            <h5 className="font-bold text-forest-800 text-[10px] uppercase mb-1 tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-forest-500" />
              Kasulik tähelepanek
            </h5>
            <ul className="list-disc pl-3 mt-1.5 space-y-1">
              <li>Formaat on paindlik! Sobib tühiku, koma või semikooloniga jagatud andmed.</li>
              <li>Süsteem tuvastab automaatselt kumb on <strong>Northing(X)</strong> ja <strong>Easting(Y)</strong>.</li>
              <li>Toetab täielikult ridade kopeerimist katastrikaardilt või muudest keskkondadest.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
