import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Trees, 
  Plus, 
  FolderOpen, 
  Download, 
  Upload, 
  Printer, 
  Calculator, 
  Settings, 
  Trash2, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
  Variable,
  Dna,
  FileText,
  Save,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, TabType, Lisa2Row } from './types';
import MapPolygonSelector from './components/MapPolygonSelector';
// FIX: correct import paths (files live in src/lib/)
import { getProjects, saveProjects, generateId, formatDate, totalToWords } from './lib/utils';
import { getLisa2Rate, getLisa3Rate, calcKorrigeeritudPindala, stumpToD13, d13ToStump, calcG, getGn, calcTreeVolume, calcStandFactor, calcNormVolume, calcYoungStandVolume } from './lib/calculations';
import { 
  LISA2_DATA, 
  LISA2_STEP, 
  KANDU_CONV_COEFFS, 
  STD_TABLE, 
  MAHT_KORDAJAD, 
  VORMIARV_K, 
  NORM_TAGAVARA_K, 
  TAGAVARA2_K, 
  LISA3_RATES 
} from './lib/constants';

// --- Components ---

const PanelContainer = ({ children, isActive }: { children: React.ReactNode, isActive: boolean }) => (
  <AnimatePresence mode="wait">
    {isActive && (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="space-y-6"
      >
        {children}
      </motion.div>
    )}
  </AnimatePresence>
);

const SectionTitle = ({ children, icon: Icon }: { children: React.ReactNode, icon?: any }) => (
  <div className="flex items-center gap-2 mb-4">
    <div className="w-2 h-4 bg-indigo-500 rounded-sm"></div>
    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">{children}</h3>
  </div>
);

const ResultBox = ({ label, value, subtext, type = 'info' }: { label: string, value: string | number, subtext?: string, type?: 'info' | 'success' | 'warn' | 'danger' }) => {
  const styles = {
    info: 'bg-white border-slate-200 text-slate-900',
    success: 'bg-emerald-50 border-emerald-100 text-emerald-900',
    warn: 'bg-amber-50 border-amber-100 text-amber-900',
    danger: 'bg-rose-50 border-rose-100 text-rose-900'
  };

  return (
    <div className={`p-5 rounded-xl border ${styles[type]} shadow-sm`}>
      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">{label}</div>
      <div className="text-2xl font-bold leading-tight tracking-tight">{value}</div>
      {subtext && <div className="text-[11px] mt-2 opacity-60 font-medium italic">{subtext}</div>}
    </div>
  );
};

export default function App() {
  const [projects, setProjects] = useState<Project[]>(getProjects());
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('lisa2');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [showPrintHelper, setShowPrintHelper] = useState(false);
  const [viewMode, setViewMode] = useState<'editor' | 'report'>('editor');

  const project = useMemo(() => projects.find(p => p.id === currentId), [projects, currentId]);

  // FIX: store project in sessionStorage for print, avoids URL length overflow
  const printUrl = useMemo(() => {
    if (!project) return `${window.location.origin}${window.location.pathname}`;
    try {
      sessionStorage.setItem('print_project_' + project.id, JSON.stringify(project));
    } catch { /* ignore */ }
    return `${window.location.origin}${window.location.pathname}?print=true&project=${project.id}`;
  }, [project]);

  useEffect(() => {
    saveProjects(projects);
  }, [projects]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isPrintMode = params.get('print') === 'true';
    const projId = params.get('project');
    const urlProjectData = params.get('project_data');

    let loadedProjectFromUrl = false;

    if (urlProjectData) {
      try {
        const parsedProject = JSON.parse(decodeURIComponent(urlProjectData));
        if (parsedProject && parsedProject.id) {
          setProjects(prev => {
            const exists = prev.some(p => p.id === parsedProject.id);
            if (!exists) return [parsedProject, ...prev];
            return prev.map(p => p.id === parsedProject.id ? parsedProject : p);
          });
          setCurrentId(parsedProject.id);
          loadedProjectFromUrl = true;
        }
      } catch (e) {
        console.error("Failed to parse project from URL:", e);
      }
    }

    // FIX: also try sessionStorage for print (new URL strategy)
    if (!loadedProjectFromUrl && projId) {
      const storedData = (() => {
        try { return sessionStorage.getItem('print_project_' + projId); } catch { return null; }
      })();
      if (storedData) {
        try {
          const parsedProject = JSON.parse(storedData);
          setProjects(prev => {
            const exists = prev.some(p => p.id === parsedProject.id);
            if (!exists) return [parsedProject, ...prev];
            return prev.map(p => p.id === parsedProject.id ? parsedProject : p);
          });
          setCurrentId(parsedProject.id);
          loadedProjectFromUrl = true;
        } catch { /* ignore */ }
      } else {
        const found = projects.find(p => p.id === projId);
        if (found) {
          setCurrentId(projId);
          loadedProjectFromUrl = true;
        }
      }
    }

    if (!loadedProjectFromUrl && projects.length > 0 && !currentId) {
      setCurrentId(projects[0].id);
    }

    if (isPrintMode) {
      setViewMode('report');
      const timer = setTimeout(() => {
        try { window.print(); } catch (e) { console.error(e); }
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    const newProj: Project = {
      id: generateId(),
      nimi: newProjectName,
      nr: '',
      aadress: '',
      katastr: '',
      pindala: '',
      koostaja: '',
      kuupaev: formatDate(),
      raieliik: '',
      puuliik: 'mand',
      vanus: '',
      korgus: '',
      diam: '',
      g: '',
      taius: '',
      lisa2rows: [],
      lisa3rows: [],
      lisa2kordaja: '1',
      kahju: '0'
    };
    setProjects([newProj, ...projects]);
    setCurrentId(newProj.id);
    setNewProjectName('');
    setIsModalOpen(false);
  };

  const updateProject = useCallback((updates: Partial<Project>) => {
    if (!currentId) return;
    setProjects(prev => prev.map(p => p.id === currentId ? { ...p, ...updates } : p));
  }, [currentId]);

  const deleteProject = () => {
    if (!currentId || !window.confirm('Kustuta projekt?')) return;
    setProjects(prev => prev.filter(p => p.id !== currentId));
    setCurrentId(null);
  };

  const handlePrint = () => {
    setViewMode('report');
    const isIframe = window.self !== window.top;
    if (isIframe) {
      setShowPrintHelper(true);
    } else {
      setTimeout(() => {
        try { window.print(); } catch (e) { console.error(e); }
      }, 450);
    }
  };

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleManualSave = () => {
    setIsSaving(true);
    saveProjects(projects);
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }, 400);
  };

  return (
    <>
      {viewMode === 'report' && (
        <div className="fixed inset-0 z-[100] min-h-screen bg-slate-900 overflow-y-auto pb-16 flex flex-col print:relative print:inset-auto print:bg-white print:min-h-0 print:pb-0 print:overflow-visible">
          <div className="bg-slate-800 border-b border-slate-700 p-4 sticky top-0 z-[110] no-print shadow-md">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3 text-white">
                <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Arvutusprotokolli Trükieelvaade</h3>
                  <p className="text-xs text-slate-400">Genereeritud Metsaseaduse ja MS § 67 Lisa 2 kohaselt</p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setViewMode('editor')}
                  className="flex-1 sm:flex-none btn-secondary !bg-slate-700 !text-white !border-slate-600 hover:!bg-slate-600 flex items-center justify-center gap-2 cursor-pointer font-bold py-2 px-4 transition-all"
                >
                  ← Tagasi redaktorisse
                </button>
                <button
                  onClick={() => {
                    const isIframe = window.self !== window.top;
                    if (isIframe) { setShowPrintHelper(true); }
                    else { try { window.print(); } catch (e) { console.error(e); } }
                  }}
                  className="flex-1 sm:flex-none btn-primary flex items-center justify-center gap-2 cursor-pointer font-bold py-2 px-5 bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all text-white rounded-lg"
                >
                  <Printer className="w-4 h-4" /> Ava trükidialoog (Salvesta PDF)
                </button>
              </div>
            </div>
          </div>

          <div className="flex-grow py-8 px-4 bg-slate-900 print:bg-white print:p-0 flex justify-center items-start overflow-y-auto">
            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-700/50 print:border-none print:shadow-none print:rounded-none">
              <PrintDocument project={project} lisa2rows={project?.lisa2rows || []} onScreen={true} />
            </div>
          </div>
        </div>
      )}

      <div className="flex h-screen overflow-hidden text-slate-900 font-sans no-print">
        {/* Sidebar */}
        <aside className="w-72 bg-slate-100 border-r border-slate-200 flex flex-col no-print shrink-0 z-20">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-bold text-lg">
                Σ
              </div>
              <h1 className="text-sm font-bold tracking-tight text-slate-800">Metsanduse<br />Finantsmootor</h1>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Versioon 4.2.2</p>
          </div>

          <div className="px-4 mb-4">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl transition-all font-bold text-sm shadow-sm hover:bg-indigo-700 active:scale-95"
            >
              <Plus className="w-4 h-4" /> Uus projekt
            </button>
          </div>

          <div className="px-6 mb-2">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Koondnäitajad</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto px-4 space-y-2 custom-scrollbar pb-6">
            {projects.length === 0 ? (
              <div className="p-8 text-center opacity-40">
                <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="text-[11px] uppercase tracking-wider font-bold">Pole projekte</p>
              </div>
            ) : (
              projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => setCurrentId(p.id)}
                  className={`sidebar-item ${currentId === p.id ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}
                >
                  <div className={`text-xs font-bold truncate ${currentId === p.id ? 'text-indigo-600' : 'text-slate-700'}`}>{p.nimi}</div>
                  <div className="text-[10px] font-mono truncate opacity-60">{p.aadress || p.katastr || 'Andmed täitmata'}</div>
                  {p.kahju && p.kahju !== '0' && (
                    <div className="text-[10px] font-bold text-emerald-600 mt-1 flex items-center gap-1">
                      <Variable className="w-3 h-3" /> {p.kahju}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>

          <div className="m-4 bg-indigo-900 rounded-2xl p-5 text-white shadow-lg">
            <p className="text-[10px] uppercase font-bold opacity-60 mb-2">Staatus</p>
            <p className="text-xs font-medium leading-tight">Valemid on lukustatud ja MS Lisa 2 kohased.</p>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden relative">
          {!currentId ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mb-6 border border-slate-200">
                <Trees className="w-10 h-10 text-slate-300" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Vali sisendandmed</h2>
              <p className="text-slate-500 text-sm max-w-sm mb-8 font-medium">Andmeanalüüsi alustamiseks vali vasakult olemasolev projekt või lisa uus baastabelisse.</p>
              <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" /> Loo esmane projekt
              </button>
            </div>
          ) : (
            <>
              {/* Header */}
              <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 no-print z-10">
                <div className="flex items-center space-x-6">
                  <div className="flex flex-col">
                    <h2 className="text-sm font-bold tracking-tight text-slate-800 uppercase">{project?.nimi}</h2>
                    <div className="flex items-center space-x-3 mt-0.5">
                      <span className="text-[10px] font-mono text-slate-400"># {project?.nr || 'ID_SOURCE_01'}</span>
                      <div className="flex items-center space-x-1 border-l border-slate-200 pl-3">
                         <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                         <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Aktiivne</span>
                      </div>
                    </div>
                  </div>

                  <nav className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 ml-4">
                    {(['lisa2', 'lisa3', 'kannu', 'taius', 'maht', 'project'] as TabType[]).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`tab-btn ${activeTab === tab ? 'tab-btn-active' : 'tab-btn-inactive'}`}
                      >
                        {tab === 'lisa2' && 'Lisa 2'}
                        {tab === 'lisa3' && 'Lisa 3'}
                        {tab === 'kannu' && 'Känd'}
                        {tab === 'taius' && 'Täius'}
                        {tab === 'maht' && 'Tagavara'}
                        {tab === 'project' && 'Seaded'}
                      </button>
                    ))}
                  </nav>
                </div>

                <div className="flex items-center gap-4">
                   <div className="text-right hidden sm:block">
                     <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Viimati arvutatud</div>
                     <div className="text-[11px] font-mono font-medium">{project?.kuupaev}</div>
                   </div>
                   <button 
                     onClick={handleManualSave}
                     disabled={isSaving}
                     className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white font-bold text-xs uppercase cursor-pointer transition-all active:scale-95 duration-200 ${
                       saveSuccess 
                         ? '!bg-emerald-600 hover:!bg-emerald-700' 
                         : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm'
                     }`}
                   >
                     {saveSuccess ? <><Check className="w-4 h-4" /> Salvestatud!</> : <><Save className="w-4 h-4" /> {isSaving ? 'Salvestab...' : 'Salvesta'}</>}
                   </button>
                   <button 
                    onClick={handlePrint}
                    className="btn-secondary flex items-center gap-2 !bg-indigo-50 !text-indigo-600 !border-indigo-100 hover:!bg-indigo-100/90 active:scale-95 duration-200 transition-all cursor-pointer font-bold"
                  >
                    <Printer className="w-4 h-4" /> Eksport PDF
                  </button>
                </div>
              </header>

              {/* Viewport */}
              <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="max-w-5xl mx-auto pb-12">
                  
                  {activeTab === 'lisa2' && project && (
                    <PanelContainer isActive>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                          <section className="card p-6">
                            <SectionTitle icon={Plus}>Puu Lisamine</SectionTitle>
                            <Lisa2Form 
                              onAdd={(row) => {
                                const rows = project.lisa2rows || [];
                                updateProject({ lisa2rows: [...rows, { ...row, id: generateId() }] });
                              }} 
                            />
                          </section>

                          <section className="card">
                            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                              <SectionTitle icon={Layers}>Raiutud puud</SectionTitle>
                              <div className="flex items-center gap-2">
                                <label className="label-cap !mb-0">Kaitseala kordaja:</label>
                                <select 
                                  className="input-field py-1"
                                  value={project.lisa2kordaja}
                                  onChange={e => updateProject({ lisa2kordaja: e.target.value })}
                                >
                                  <option value="1">1.0 (Puudub)</option>
                                  <option value="3">3.0 (Hoiuala)</option>
                                  <option value="5">5.0 (Reservaat)</option>
                                </select>
                              </div>
                            </div>
                            <Lisa2Table 
                              rows={project.lisa2rows || []} 
                              kordaja={parseFloat(project.lisa2kordaja || '1')}
                              onRemove={(id) => updateProject({ lisa2rows: (project.lisa2rows || []).filter(r => r.id !== id) })}
                              onUpdateTotal={(val) => updateProject({ kahju: val })}
                            />
                          </section>
                        </div>

                        <div className="space-y-6">
                          <div className="sticky top-0 space-y-6">
                            <SummaryCard project={project} />
                            <div className="card p-4 bg-emerald-50 border-emerald-100 font-sans">
                               <h4 className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest flex items-center gap-2 mb-2">
                                 <Info className="w-3 h-3" /> Info
                               </h4>
                               <p className="text-[11px] text-emerald-700 leading-relaxed font-medium">
                                 Märgi kännu diameetrid 2cm sammuga. Arvutus käib Metsaseadus Lisa 2 järgi. Kui puuliiki pole loendis, vali sarnane grupp.
                               </p>
                            </div>
                            <Lisa2ReferenceTable />
                          </div>
                        </div>
                      </div>
                    </PanelContainer>
                  )}

                  {activeTab === 'lisa3' && project && (
                    <PanelContainer isActive>
                      <Lisa3Panel project={project} onUpdate={updateProject} />
                    </PanelContainer>
                  )}

                  {activeTab === 'kannu' && project && (
                     <PanelContainer isActive>
                       <KannuPanel project={project} onUpdate={updateProject} />
                     </PanelContainer>
                  )}

                  {activeTab === 'taius' && project && (
                     <PanelContainer isActive>
                       <TaiusPanel project={project} onUpdate={updateProject} />
                     </PanelContainer>
                  )}

                  {activeTab === 'maht' && project && (
                     <PanelContainer isActive>
                       <TagavaraPanel project={project} onUpdate={updateProject} />
                     </PanelContainer>
                  )}

                  {activeTab === 'project' && project && (
                    <PanelContainer isActive>
                      <ProjectDataPanel project={project} onUpdate={updateProject} onDelete={deleteProject} />
                    </PanelContainer>
                  )}

                </div>
              </main>
              <footer className="h-10 bg-slate-900 text-white flex items-center px-8 justify-between text-[10px] uppercase tracking-widest shrink-0 no-print">
                <div className="flex space-x-6 font-bold">
                  <span className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div>Süsteem: Aktiivne</span>
                  <span className="opacity-50 text-indigo-300">Struktuurne terviklus: 100%</span>
                </div>
                <div className="font-mono opacity-50 hidden sm:block">
                  SECURED_TRANSACTION_ID: {project?.id.toUpperCase()}
                </div>
              </footer>
            </>
          )}
        </div>
      </div>

      {viewMode !== 'report' && (
        <PrintDocument project={project} lisa2rows={project?.lisa2rows || []} />
      )}

      <AnimatePresence>
        {showPrintHelper && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPrintHelper(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10 border border-slate-200 p-6 md:p-8">
              <div className="flex items-center gap-3 text-indigo-600 mb-4">
                <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center">
                  <Printer className="w-5 h-5 text-indigo-600 animate-pulse" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">PDF-i Eksportimine ja Trükkimine</h3>
              </div>
              <div className="space-y-4 text-slate-600 text-sm leading-relaxed mb-6">
                <p>Käivitasime süsteemse trükivormi genereerimise! Kuna rakendus töötab arenduskeskkonna liivakastis (iframe), võib brauser turvapiirangute tõttu automaatse trükiakna blokeerida.</p>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-950 flex gap-3 text-xs">
                  <Info className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <span className="font-bold">Kõige kiirem lahendus:</span> Vajuta klaviatuuril klahve <kbd className="px-1.5 py-0.5 bg-white border rounded font-mono font-bold">Ctrl + P</kbd> (Macis <kbd className="px-1.5 py-0.5 bg-white border rounded font-mono font-bold">Cmd + P</kbd>).
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => setShowPrintHelper(false)} className="btn-secondary flex-1 py-2.5 cursor-pointer font-bold text-xs uppercase">Sule teavitus</button>
                <a href={printUrl} target="_blank" rel="noopener noreferrer" className="btn-primary flex-1 py-2.5 text-center flex items-center justify-center gap-2 cursor-pointer font-bold text-xs uppercase bg-indigo-600 hover:bg-indigo-700 text-white">
                  Ava uues vahekaardis ↗
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 border border-slate-200">
              <div className="p-8">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Uus sisendandmete allikas</h3>
                <p className="text-slate-500 text-xs mb-6 font-medium">Sisesta projekti või protokolli nimi baastabeli loomiseks.</p>
                <div className="space-y-4">
                  <div>
                    <label className="label-cap">Andmeallika nimetus</label>
                    <input autoFocus type="text" className="input-field w-full py-2.5 text-sm font-sans" placeholder="nt Saare kinnistu eraldis 4" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateProject()} />
                  </div>
                </div>
              </div>
              <div className="flex bg-slate-50 p-4 gap-3 border-t border-slate-100">
                <button onClick={() => setIsModalOpen(false)} className="btn-secondary flex-1 py-2.5">Katkesta</button>
                <button onClick={handleCreateProject} className="btn-primary flex-1 py-2.5">Kinnita</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// --- Reference Tables ---

function Lisa2ReferenceTable() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="card overflow-hidden border border-slate-200 shadow-sm">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors text-left">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-500" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Lisa 2 kahjumäärade tabel</span>
        </div>
        <div className="text-xs text-indigo-600 font-semibold flex items-center gap-1">
          {isOpen ? <>Peida <ChevronUp className="w-4 h-4" /></> : <>Näita <ChevronDown className="w-4 h-4" /></>}
        </div>
      </button>
      {isOpen && (
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="overflow-x-auto max-h-[300px] custom-scrollbar rounded-xl border border-slate-200 bg-white shadow-xs">
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
                {LISA2_DATA.map((row) => (
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
              {/* FIX: Added missing species per law — Lehis, Nulg (Grp1); Jalakas, Vaher (Grp2); Pappel, Põõsad (Grp3) */}
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

function Lisa3ReferenceTable() {
  const [isOpen, setIsOpen] = useState(false);
  const speciesLabels: Record<string, string> = {
    mand: 'Mänd',
    kuusk: 'Kuusk / Kask / Sanglepp',
    tamm: 'Tamm / Saar / Vaher / Jalakas',
    haab: 'Haab',
  };
  // Show only the representative species per legal group
  const displaySpecies = ['mand', 'kuusk', 'tamm', 'haab'];

  return (
    <div className="card overflow-hidden border border-slate-200 shadow-sm">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors text-left">
        <div className="flex items-center gap-2">
          <Variable className="w-4 h-4 text-indigo-500" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Lisa 3 kahjumäärade tabel</span>
        </div>
        <div className="text-xs text-indigo-600 font-semibold flex items-center gap-1">
          {isOpen ? <>Peida <ChevronUp className="w-4 h-4" /></> : <>Näita <ChevronDown className="w-4 h-4" /></>}
        </div>
      </button>
      {isOpen && (
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="overflow-x-auto max-h-[300px] custom-scrollbar rounded-xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2 border-r border-slate-100">Enamuspuuliik</th>
                  <th className="px-3 py-2 text-right">Vanus (a)</th>
                  <th className="px-3 py-2 text-right">Määr (€/m²/ha)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displaySpecies.map(species => {
                  const rates = LISA3_RATES[species];
                  return (
                    <React.Fragment key={species}>
                      {rates.map((row, idx) => {
                        const previousAge = idx === 0 ? 0 : rates[idx - 1][0];
                        const displayAge = row[0] === 999
                          ? `üle ${previousAge}`
                          : `${previousAge + 1} kuni ${row[0]}`;
                        return (
                          <tr key={`${species}-${row[0]}`} className="hover:bg-slate-50">
                            {idx === 0 ? (
                              <td rowSpan={rates.length} className="px-3 py-1.5 font-bold text-slate-800 border-r border-slate-100 bg-slate-50/20 align-top text-xs">
                                {speciesLabels[species]}
                              </td>
                            ) : null}
                            <td className="px-3 py-1 font-mono text-right text-slate-500 border-r border-slate-100">{displayAge} a</td>
                            <td className="px-3 py-1 font-mono text-right text-slate-900 font-bold">
                              {row[1] > 0 ? `€${row[1].toFixed(0)}` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 p-3 bg-indigo-50/70 rounded-lg text-[10px] leading-relaxed text-indigo-900 border border-indigo-100/50">
            <p className="font-bold uppercase tracking-wider text-indigo-700 mb-1">Märkus:</p>
            <p>Kahjumäär on eurodes iga rinnaspindala (m²/ha) puudujääva osa kohta, mille võrra puistu rinnaspindala on viidud alla lubatud alammäära. Vanuse 0–20 ja 101+ korral kahju ei arvestata (—).</p>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Sub-Panels ---

function Lisa2Form({ onAdd }: { onAdd: (row: Omit<Lisa2Row, 'id'>) => void }) {
  const [data, setData] = useState({ liik: 'Mänd', grupp: 1, diam: '', arv: '' });

  const handleAdd = () => {
    const d = parseFloat(data.diam);
    const a = parseInt(data.arv);
    if (!d || !a) return;
    onAdd({ liik: data.liik, grupp: data.grupp, diam: d, arv: a });
    setData({ ...data, diam: '', arv: '' });
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
      <div className="flex flex-col">
        <label className="label-cap">Puuliik</label>
        <select 
          className="input-field"
          value={`${data.grupp}|${data.liik}`}
          onChange={e => {
            const [g, l] = e.target.value.split('|');
            setData({ ...data, grupp: parseInt(g), liik: l });
          }}
        >
          {/* FIX: Added missing species — Lehis, Nulg (Grp1); Jalakas, Vaher (Grp2); Pappel (Grp3) */}
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
        <label className="label-cap">Kännu ∅ (cm)</label>
        <input type="number" className="input-field" placeholder="17.4" value={data.diam} onChange={e => setData({ ...data, diam: e.target.value })} />
      </div>
      <div className="flex flex-col">
        <label className="label-cap">Arv (tk)</label>
        <input type="number" className="input-field" placeholder="5" value={data.arv} onChange={e => setData({ ...data, arv: e.target.value })} onKeyDown={e => e.key === 'Enter' && handleAdd()} />
      </div>
      <button onClick={handleAdd} className="btn-primary h-10 flex items-center justify-center gap-2">
        <Plus className="w-4 h-4" /> Lisa
      </button>
    </div>
  );
}

function Lisa2Table({ rows, kordaja, onRemove, onUpdateTotal }: { rows: Lisa2Row[], kordaja: number, onRemove: (id: string) => void, onUpdateTotal: (v: string) => void }) {
  const total = rows.reduce((acc, r) => acc + (getLisa2Rate(r.diam, r.grupp) * r.arv * kordaja), 0);

  // FIX: add onUpdateTotal to deps array
  useEffect(() => {
    onUpdateTotal(total.toFixed(2) + ' €');
  }, [total, onUpdateTotal]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">#</th>
            <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Puuliik</th>
            <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Kännu ∅</th>
            <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Kogus</th>
            <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Ühikumäär</th>
            <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Summa</th>
            <th className="px-6 py-4 w-12"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-xs italic font-medium">Andmebaas on tühi. Sisesta puid ülemisest paneelist.</td>
            </tr>
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
                  <td className="px-6 py-4 text-xs font-mono font-bold text-right text-slate-900 text-base">€{kahju.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => onRemove(r.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-rose-500">
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
              <td></td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

function ProjectDataPanel({ project, onUpdate, onDelete }: { project: Project, onUpdate: (u: Partial<Project>) => void, onDelete: () => void }) {
  return (
    <div className="space-y-6">
      <section className="card p-8">
        <SectionTitle icon={FileText}>Üldandmed</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-1">
             <label className="label-cap">Projekti nimetus</label>
             <input type="text" className="input-field w-full" value={project.nimi} onChange={e => onUpdate({ nimi: e.target.value })} />
           </div>
           <div className="space-y-1">
             <label className="label-cap">Juhtumi number</label>
             <input type="text" className="input-field w-full" value={project.nr} onChange={e => onUpdate({ nr: e.target.value })} />
           </div>
           <div className="space-y-1">
             <label className="label-cap">Aadress</label>
             <input type="text" className="input-field w-full" value={project.aadress} onChange={e => onUpdate({ aadress: e.target.value })} />
           </div>
           <div className="space-y-1">
             <label className="label-cap">Katastrinumber</label>
             <input type="text" className="input-field w-full" value={project.katastr} onChange={e => onUpdate({ katastr: e.target.value })} />
           </div>
        </div>
      </section>

      <section className="card p-8">
        <SectionTitle icon={Info}>Märkused ja Koostaja</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
           <div className="space-y-1">
             <label className="label-cap">Koostaja</label>
             <input type="text" className="input-field w-full" value={project.koostaja} onChange={e => onUpdate({ koostaja: e.target.value })} />
           </div>
           <div className="space-y-1">
             <label className="label-cap">Kuupäev</label>
             <input type="text" className="input-field w-full" value={project.kuupaev} onChange={e => onUpdate({ kuupaev: e.target.value })} />
           </div>
           <div className="space-y-1">
             <label className="label-cap">Raie liik</label>
             <input type="text" className="input-field w-full" value={project.raieliik} onChange={e => onUpdate({ raieliik: e.target.value })} />
           </div>
        </div>
        <div className="space-y-1">
          <label className="label-cap">Märkused</label>
          <textarea className="input-field w-full min-h-[100px] resize-none" value={project.markused} onChange={e => onUpdate({ markused: e.target.value })} placeholder="Lisa täiendavat infot siia..." />
        </div>
      </section>

      <div className="flex justify-end pt-4">
        <button onClick={onDelete} className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-all font-bold text-xs uppercase cursor-pointer">
          <Trash2 className="w-4 h-4" /> Kustuta projekt jäädavalt
        </button>
      </div>
    </div>
  );
}

function SummaryCard({ project }: { project: Project }) {
  const rows = project.lisa2rows || [];
  const total = rows.reduce((acc, r) => acc + (getLisa2Rate(r.diam, r.grupp) * r.arv * parseFloat(project.lisa2kordaja || '1')), 0);
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">Koondnäitajad</h3>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center min-h-[140px] relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
           <Calculator className="w-12 h-12 text-indigo-600" />
        </div>
        <p className="text-xs text-slate-500 mb-1 font-medium italic">Kogukahju (MS § 67)</p>
        <p className="text-4xl font-bold text-slate-900 tracking-tight">€{total.toLocaleString('et-EE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
          <span>Süsteemne arvutus OK</span>
        </div>
      </div>
    </section>
  );
}

function Lisa3Panel({ project, onUpdate }: { project: Project, onUpdate: (u: Partial<Project>) => void }) {
  const [inData, setInData] = useState({
    puuliik: project.lisa3puuliik || 'mand',
    vanus: project.lisa3vanus || '',
    kordaja: project.lisa3kordaja || '1',
    alammaar: project.lisa3alammaar || '',
    tegelik: project.lisa3tegelik || '',
    measuredArea: project.lisa3measuredArea || '',
    perimeter: project.lisa3perimeter || ''
  });

  useEffect(() => {
    setInData({
      puuliik: project.lisa3puuliik || 'mand',
      vanus: project.lisa3vanus || '',
      kordaja: project.lisa3kordaja || '1',
      alammaar: project.lisa3alammaar || '',
      tegelik: project.lisa3tegelik || '',
      measuredArea: project.lisa3measuredArea || '',
      perimeter: project.lisa3perimeter || ''
    });
  }, [project.id]);

  const updateField = (key: string, value: string) => {
    const updated = { ...inData, [key]: value };
    setInData(updated);
    onUpdate({
      lisa3puuliik: updated.puuliik,
      lisa3vanus: updated.vanus,
      lisa3alammaar: updated.alammaar,
      lisa3tegelik: updated.tegelik,
      lisa3measuredArea: updated.measuredArea,
      lisa3perimeter: updated.perimeter,
      lisa3kordaja: updated.kordaja
    });
  };

  // FIX: auto-update area+perimeter AND save to project immediately when map geometry changes
  const handleMapGeometryApply = (areaHa: number, perimeter: number) => {
    const updated = {
      ...inData,
      measuredArea: areaHa.toString(),
      perimeter: perimeter.toString()
    };
    setInData(updated);
    onUpdate({
      lisa3measuredArea: updated.measuredArea,
      lisa3perimeter: updated.perimeter,
    });
  };

  const [panelSaved, setPanelSaved] = useState(false);
  const handleSave = () => {
    onUpdate({
      lisa3puuliik: inData.puuliik,
      lisa3vanus: inData.vanus,
      lisa3alammaar: inData.alammaar,
      lisa3tegelik: inData.tegelik,
      lisa3measuredArea: inData.measuredArea,
      lisa3perimeter: inData.perimeter,
      lisa3kordaja: inData.kordaja
    });
    setPanelSaved(true);
    setTimeout(() => setPanelSaved(false), 2000);
  };

  const pindala = useMemo(() => {
    return calcKorrigeeritudPindala(parseFloat(inData.perimeter), parseFloat(inData.measuredArea));
  }, [inData.perimeter, inData.measuredArea]);

  const calculatedG = useMemo(() => {
    if (!pindala || pindala <= 0) return 0;
    const rows = project.lisa3rows || [];
    // FIX: use canonical Math.PI formula (same as calcG in calculations.ts)
    const totalG = rows.reduce((acc, row) => {
      return acc + (Math.PI * Math.pow(row.diam / 200, 2) * row.arv);
    }, 0);
    return totalG / pindala;
  }, [project.lisa3rows, pindala]);

  const effectiveG = (project.lisa3rows || []).length > 0 ? calculatedG : parseFloat(inData.tegelik);

  const vanusNum = parseFloat(inData.vanus);
  // FIX: detect age out of range (0-20 or 101+) to show informative message
  const ageOutOfRange = !isNaN(vanusNum) && (vanusNum <= 20 || vanusNum > 100 && inData.puuliik !== 'mand' && inData.puuliik !== 'tamm' && inData.puuliik !== 'saar' && inData.puuliik !== 'vaher' && inData.puuliik !== 'jalakas');
  const ageZeroRate = !isNaN(vanusNum) && getLisa3Rate(inData.puuliik, vanusNum) === 0 && vanusNum > 0;

  const result = useMemo(() => {
    const v = parseFloat(inData.vanus);
    const am = parseFloat(inData.alammaar);
    const teg = effectiveG;
    const k = parseFloat(inData.kordaja);
    
    if (isNaN(v) || isNaN(am) || isNaN(teg) || !pindala) return null;
    
    const shortfall = am - teg;
    if (shortfall <= 0) return { shortfall, kahju: 0, status: 'ok' };
    
    const rate = getLisa3Rate(inData.puuliik, v);
    // If rate is 0 (age out of range), kahju = 0
    if (rate === 0) return { shortfall, kahju: 0, rate, status: 'no_rate' };
    const kahju = shortfall * rate * k * pindala;
    
    return { shortfall, kahju, rate, status: 'violation' };
  }, [inData, pindala, effectiveG]);

  const [treeData, setTreeData] = useState({ liik: 'Mänd', diam: '', arv: '' });

  const handleAddTree = () => {
    const d = parseFloat(treeData.diam);
    const a = parseInt(treeData.arv);
    if (!d || !a) return;
    const rows = project.lisa3rows || [];
    const newRows = [...rows, { id: generateId(), liik: treeData.liik, grupp: 1, diam: d, arv: a }];
    onUpdate({ lisa3rows: newRows });
    setTreeData({ ...treeData, diam: '', arv: '' });
  };

  return (
    <div className="space-y-6">
      <MapPolygonSelector 
        onApply={handleMapGeometryApply}
        initialArea={inData.measuredArea}
        initialPerimeter={inData.perimeter}
        initialPoints={project.lisa3coords}
        onPointsChange={(ptsStr) => onUpdate({ lisa3coords: ptsStr })}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <section className="card p-8">
            <SectionTitle icon={Plus}>Kasvavad puud (Analüüsiks)</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 items-end">
              <div className="space-y-1">
                <label className="label-cap">Puuliik</label>
                <select className="input-field w-full" value={treeData.liik} onChange={e => setTreeData({ ...treeData, liik: e.target.value })}>
                  <option value="Mänd">Mänd</option>
                  <option value="Kuusk">Kuusk</option>
                  <option value="Kask">Kask</option>
                  <option value="Haab">Haab</option>
                  <option value="Sanglepp">Sanglepp</option>
                  <option value="Hall lepp">Hall lepp</option>
                  <option value="Tamm/Saar">Tamm / Saar</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="label-cap">Diameeter d₁.₃ (cm)</label>
                <input type="number" className="input-field w-full" value={treeData.diam} onChange={e => setTreeData({ ...treeData, diam: e.target.value })} placeholder="24" />
              </div>
              <div className="space-y-1">
                <label className="label-cap">Arv (tk)</label>
                <div className="flex gap-2">
                  <input type="number" className="input-field w-full" value={treeData.arv} onChange={e => setTreeData({ ...treeData, arv: e.target.value })} onKeyDown={e => e.key === 'Enter' && handleAddTree()} placeholder="10" />
                  <button onClick={handleAddTree} className="btn-primary p-2.5"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[300px] custom-scrollbar border rounded-xl">
               <table className="w-full text-[11px] text-left">
                  <thead className="bg-slate-50 border-b sticky top-0">
                    <tr>
                      <th className="px-4 py-2 font-bold text-slate-500 uppercase tracking-wider">Puuliik</th>
                      <th className="px-4 py-2 font-bold text-slate-500 uppercase tracking-wider text-right">d₁.₃</th>
                      <th className="px-4 py-2 font-bold text-slate-500 uppercase tracking-wider text-right">Arv</th>
                      <th className="px-4 py-2 font-bold text-slate-500 uppercase tracking-wider text-right">g (m²)</th>
                      <th className="px-4 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(project.lisa3rows || []).length === 0 ? (
                      <tr><td colSpan={5} className="p-4 text-center text-slate-400 italic font-medium">Kasvavaid puid pole lisatud.</td></tr>
                    ) : (
                      (project.lisa3rows || []).map(r => {
                        const g = Math.PI * Math.pow(r.diam / 200, 2) * r.arv;
                        return (
                          <tr key={r.id} className="hover:bg-slate-50 group">
                            <td className="px-4 py-2 font-bold">{r.liik}</td>
                            <td className="px-4 py-2 text-right font-mono">{r.diam.toFixed(1)}</td>
                            <td className="px-4 py-2 text-right font-mono">{r.arv}</td>
                            <td className="px-4 py-2 text-right font-mono text-slate-500">{g.toFixed(3)}</td>
                            <td className="px-4 py-2 text-right">
                               <button onClick={() => onUpdate({ lisa3rows: (project.lisa3rows || []).filter(x => x.id !== r.id) })} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <Trash2 className="w-3 h-3" />
                               </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
               </table>
            </div>
            {(project.lisa3rows || []).length > 0 && (
               <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex justify-between items-center">
                  <div>
                     <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Arvutatud G kokku</div>
                     <div className="text-lg font-bold text-indigo-900">{calculatedG.toFixed(2)} m²/ha</div>
                  </div>
                  <div className="text-[10px] text-indigo-400 italic text-right max-w-[150px]">
                     Korrigeeritud pindala: {pindala?.toFixed(4)} ha
                  </div>
               </div>
            )}
          </section>

          <section className="card p-8">
            <SectionTitle icon={Variable}>Kahju parameetrid</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1">
                 <label className="label-cap">Enamuspuuliik</label>
                 <select className="input-field w-full" value={inData.puuliik} onChange={e => updateField('puuliik', e.target.value)}>
                   <option value="mand">Mänd</option>
                   <option value="kuusk">Kuusk</option>
                   <option value="kask">Kask</option>
                   <option value="sanglepp">Sanglepp</option>
                   <option value="tamm">Tamm / Saar / Vaher / Jalakas</option>
                   <option value="haab">Haab</option>
                 </select>
               </div>
               <div className="space-y-1">
                 <label className="label-cap">Puistu vanus (a)</label>
                 <input type="number" className="input-field w-full" value={inData.vanus} onChange={e => updateField('vanus', e.target.value)} />
                 {/* FIX: warn user when age gives 0 rate */}
                 {ageZeroRate && (
                   <p className="text-[10px] text-amber-600 font-bold mt-1 flex items-center gap-1">
                     <Info className="w-3 h-3" /> Sellele vanusele kahju määra ei rakendata (MS Lisa 3).
                   </p>
                 )}
               </div>
               <div className="space-y-1">
                 <label className="label-cap">Alammäär G (m²/ha)</label>
                 <input type="number" className="input-field w-full" value={inData.alammaar} onChange={e => updateField('alammaar', e.target.value)} />
               </div>
               <div className="space-y-1">
                 <label className="label-cap">Tegelik G pärast raiet</label>
                 <input 
                   type="number" 
                   className={`input-field w-full ${(project.lisa3rows || []).length > 0 ? 'bg-indigo-50 text-indigo-900 font-bold border-indigo-200' : ''}`}
                   readOnly={(project.lisa3rows || []).length > 0}
                   value={(project.lisa3rows || []).length > 0 ? calculatedG.toFixed(2) : inData.tegelik} 
                   onChange={e => updateField('tegelik', e.target.value)} 
                 />
                 {(project.lisa3rows || []).length > 0 && <p className="text-[10px] text-indigo-500 font-medium italic mt-1">G arvutatakse tabeli põhjal.</p>}
               </div>
               <div className="space-y-1">
                 <label className="label-cap">Kaitseala kordaja</label>
                 <select className="input-field w-full" value={inData.kordaja} onChange={e => updateField('kordaja', e.target.value)}>
                   <option value="1">1.0 (Puudub)</option>
                   <option value="3">3.0 (Piiranguvöönd / Hoiuala)</option>
                   <option value="5">5.0 (Reservaat)</option>
                 </select>
               </div>
            </div>
          </section>

          <section className="card p-8">
            <SectionTitle icon={Dna}>Pindala korrigeerimine</SectionTitle>
            <div className="grid grid-cols-2 gap-4 items-end">
               <div className="space-y-1">
                 <label className="label-cap">Mõõdetud pindala (ha)</label>
                 <input type="number" className="input-field w-full" value={inData.measuredArea} onChange={e => updateField('measuredArea', e.target.value)} placeholder="1.20"/>
               </div>
               <div className="space-y-1">
                 <label className="label-cap">Ümbermõõt (m)</label>
                 <input type="number" className="input-field w-full" value={inData.perimeter} onChange={e => updateField('perimeter', e.target.value)} placeholder="550" />
               </div>
            </div>
            <div className="mt-4 p-4 bg-slate-50 rounded-lg text-xs font-mono border border-slate-200">
              Korrigeeritud pindala: <span className="font-bold text-indigo-600">{pindala?.toFixed(4) || '0.0000'} ha</span>
              <div className="text-[10px] text-slate-400 mt-1">Viga = (2,5 × ümbermõõt) / 10 000 ha</div>
            </div>
          </section>

          <button
            onClick={handleSave}
            className={`w-full py-3 px-4 flex items-center justify-center gap-2 rounded-xl font-bold text-xs uppercase cursor-pointer transition-all active:scale-95 duration-200 ${
              panelSaved ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
            }`}
          >
            {panelSaved ? <><Check className="w-4 h-4" /> Andmed salvestatud!</> : <><Save className="w-4 h-4" /> Salvesta Lisa 3 andmed</>}
          </button>
        </div>

        <div className="space-y-6">
          {result ? (
            <div className="space-y-6">
              <div className="card p-8 bg-indigo-900 text-white border-none">
                <ResultBox 
                  label="Arvutuslik Keskkonnakahju (Lisa 3)" 
                  value={result.kahju.toFixed(2) + ' €'} 
                  type={result.status === 'ok' || result.status === 'no_rate' ? 'success' : 'danger'}
                  subtext={
                    result.status === 'ok' 
                      ? 'Puistu tihedusnorm on täidetud. Kahju ei teki.'
                      : result.status === 'no_rate'
                      ? `Puudujääk: ${result.shortfall?.toFixed(1)} m²/ha, kuid sellele vanusele/liigile kahju määra ei rakendata.`
                      : `Puudujääk: ${result.shortfall?.toFixed(1)} m²/ha. Määr: ${result.rate} €/m²/ha.`
                  }
                />
                {result.status === 'violation' && (
                  <div className="mt-6 pt-6 border-t border-emerald-800/50 space-y-2">
                     <div className="flex justify-between text-xs opacity-60">
                       <span>Valem</span>
                       <span className="font-mono">Kahju = ∆G × Määr × K × P</span>
                     </div>
                     <div className="flex justify-between text-xs font-mono">
                       <span>Arvutus</span>
                       <span>{result.shortfall?.toFixed(2)} × {result.rate} × {inData.kordaja} × {pindala.toFixed(2)}</span>
                     </div>
                  </div>
                )}
              </div>
            </div>
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

function TaiusPanel({ project, onUpdate }: { project: Project, onUpdate: (u: Partial<Project>) => void }) {
  const [data, setData] = useState({
    species: project.taiusSpecies || 'mand',
    height: project.taiusHeight || '',
    g: project.taiusG || ''
  });
  const [showRef, setShowRef] = useState(false);

  useEffect(() => {
    setData({
      species: project.taiusSpecies || 'mand',
      height: project.taiusHeight || '',
      g: project.taiusG || ''
    });
  }, [project.id]);

  const updateField = (key: string, value: string) => {
    setData(prev => {
      const updated = { ...prev, [key]: value };
      onUpdate({ taiusSpecies: updated.species, taiusHeight: updated.height, taiusG: updated.g });
      return updated;
    });
  };

  const [panelSaved, setPanelSaved] = useState(false);
  const handleSave = () => {
    onUpdate({ taiusSpecies: data.species, taiusHeight: data.height, taiusG: data.g });
    setPanelSaved(true);
    setTimeout(() => setPanelSaved(false), 2000);
  };

  const gn = getGn(data.species, parseFloat(data.height));
  const taius = data.g && gn ? (parseFloat(data.g) / gn) * 100 : 0;

  return (
    <div className="space-y-8">
      <section className="card p-8">
        <SectionTitle icon={Variable}>Täiuse arvutamine</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end mb-6">
           <div className="space-y-1">
             <label className="label-cap">Puuliik (liigiomane Gn)</label>
             <select className="input-field w-full" value={data.species} onChange={e => updateField('species', e.target.value)}>
               <option value="mand">Männik / Lehis</option>
               <option value="kuusk">Kuusik / Nulg</option>
               <option value="kask">Kaasik / Pärn</option>
               <option value="sanglepp">Sanglepik / Haavik</option>
               <option value="kovleht">Tamm / Saar / Vaher</option>
             </select>
           </div>
           <div className="space-y-1">
             <label className="label-cap">Puistu kõrgus H (m)</label>
             <input type="number" className="input-field w-full" value={data.height} onChange={e => updateField('height', e.target.value)} />
           </div>
           <div className="space-y-1">
             <label className="label-cap">Mõõdetud G (m²/ha)</label>
             <input type="number" className="input-field w-full" value={data.g} onChange={e => updateField('g', e.target.value)} />
           </div>
        </div>
        <button onClick={handleSave} className={`w-full py-2.5 px-4 flex items-center justify-center gap-2 rounded-xl font-bold text-xs uppercase cursor-pointer transition-all active:scale-95 duration-200 ${panelSaved ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'}`}>
          {panelSaved ? <><Check className="w-4 h-4" /> Andmed salvestatud!</> : <><Save className="w-4 h-4" /> Salvesta andmed</>}
        </button>
      </section>

      {taius > 0 && (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <ResultBox label="Normaalpuistu rinnaspindala (Gn)" value={gn.toFixed(1) + ' m²/ha'} subtext={`H=${data.height}m kohane etalonväärtus`} />
           <ResultBox label="Täius (T = G / Gn × 100)" value={taius.toFixed(1) + ' %'} type={taius < 30 ? 'danger' : taius < 60 ? 'warn' : 'success'} subtext={taius < 30 ? 'Uuendamiskohustus (alla 30%)' : 'Tihedus on normis.'} />
         </div>
      )}

      <section className="card">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setShowRef(!showRef)}>
           <SectionTitle icon={Layers}>Standardtabel Gn (m²/ha) — 100% täius</SectionTitle>
           <div className="flex items-center gap-4">
             <span className="text-[10px] font-bold text-slate-400">MKJ LISA 13</span>
             {showRef ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
           </div>
        </div>
        {showRef && (
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] font-mono border-collapse">
               <thead className="bg-slate-50 border-b border-slate-200">
                 <tr>
                   <th className="p-2 text-left">H (m)</th>
                   <th className="p-2 text-right">Mänd</th>
                   <th className="p-2 text-right">Kuusk</th>
                   <th className="p-2 text-right">Kask</th>
                   <th className="p-2 text-right">Haab</th>
                   <th className="p-2 text-right">Tamm/Saar</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {Object.entries(STD_TABLE).map(([h, vals]) => (
                    <tr key={h} className={data.height === h ? 'bg-indigo-50 font-bold' : 'hover:bg-slate-50'}>
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

function KannuPanel({ project, onUpdate }: { project: Project, onUpdate: (u: Partial<Project>) => void }) {
  const [data, setData] = useState({
    species: project.kannuSpecies || 'mand',
    dStump: project.kannudStump || '',
    d13: project.kannud13 || ''
  });
  const [showRef, setShowRef] = useState(false);

  useEffect(() => {
    setData({ species: project.kannuSpecies || 'mand', dStump: project.kannudStump || '', d13: project.kannud13 || '' });
  }, [project.id]);

  const updateField = (key: string, value: string) => {
    setData(prev => {
      const updated = { ...prev, [key]: value };
      onUpdate({ kannuSpecies: updated.species, kannudStump: updated.dStump, kannud13: updated.d13 });
      return updated;
    });
  };

  const [panelSaved, setPanelSaved] = useState(false);
  const handleSave = () => {
    onUpdate({ kannuSpecies: data.species, kannudStump: data.dStump, kannud13: data.d13 });
    setPanelSaved(true);
    setTimeout(() => setPanelSaved(false), 2000);
  };

  const d13Result = stumpToD13(data.species, parseFloat(data.dStump));
  const stumpResult = d13ToStump(data.species, parseFloat(data.d13));

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="card p-8">
          <SectionTitle icon={Variable}>Känd → D₁.₃</SectionTitle>
          <div className="space-y-4">
             <div className="space-y-1">
               <label className="label-cap">Puuliik</label>
               <select className="input-field w-full" value={data.species} onChange={e => updateField('species', e.target.value)}>
                 {Object.keys(KANDU_CONV_COEFFS).map(k => (
                    <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>
                 ))}
               </select>
             </div>
             <div className="space-y-1">
               <label className="label-cap">Kännu ∅ (cm)</label>
               <input type="number" className="input-field w-full" value={data.dStump} onChange={e => updateField('dStump', e.target.value)} />
             </div>
             {d13Result > 0 && (
               <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                  <div className="text-[10px] uppercase font-bold text-indigo-400 mb-1">Tulemus d₁.₃</div>
                  <div className="text-2xl font-bold text-indigo-900">{d13Result.toFixed(2)} cm</div>
               </div>
             )}
          </div>
        </section>

        <section className="card p-8 text-slate-400">
          <SectionTitle icon={Variable}>D₁.₃ → Känd (Pöördvalem)</SectionTitle>
          <div className="space-y-4">
             <div className="space-y-1">
               <label className="label-cap">Rinnasdiameeter D (cm)</label>
               <input type="number" className="input-field w-full" value={data.d13} onChange={e => updateField('d13', e.target.value)} />
             </div>
             {stumpResult > 0 && (
               <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Tulemus d_känd</div>
                  <div className="text-2xl font-bold text-slate-700">{stumpResult.toFixed(2)} cm</div>
               </div>
             )}
          </div>
        </section>
      </div>

      <button onClick={handleSave} className={`w-full py-2.5 px-4 flex items-center justify-center gap-2 rounded-xl font-bold text-xs uppercase cursor-pointer transition-all active:scale-95 duration-200 ${panelSaved ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'}`}>
        {panelSaved ? <><Check className="w-4 h-4" /> Andmed salvestatud!</> : <><Save className="w-4 h-4" /> Salvesta andmed</>}
      </button>

      <section className="card overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setShowRef(!showRef)}>
           <SectionTitle>Kordajad (Metsatööd Tabel 7)</SectionTitle>
           {showRef ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
        {showRef && (
          <table className="w-full text-xs border-collapse">
             <thead className="bg-slate-50 border-b border-slate-200">
               <tr>
                 <th className="p-3 text-left label-cap !mb-0">Puuliik</th>
                 <th className="p-3 text-right label-cap !mb-0">a</th>
                 <th className="p-3 text-right label-cap !mb-0">b</th>
                 <th className="p-3 text-right label-cap !mb-0">Valem (d₁.₃ =)</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100 font-mono">
                {Object.entries(KANDU_CONV_COEFFS).map(([k, v]) => (
                  <tr key={k} className={data.species === k ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}>
                    <td className="p-3 font-sans font-bold capitalize">{k}</td>
                    <td className="p-3 text-right">{v.a.toFixed(2)}</td>
                    <td className="p-3 text-right">{v.b.toFixed(2)}</td>
                    <td className="p-3 text-right text-slate-400">{v.a} + {v.b} × d_känd</td>
                  </tr>
                ))}
             </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function TagavaraPanel({ project, onUpdate }: { project: Project, onUpdate: (u: Partial<Project>) => void }) {
  const [data, setData] = useState({
    species: project.tagavaraSpecies || 'mand',
    g: project.tagavaraG || '',
    h: project.tagavaraH || ''
  });
  const [showRef, setShowRef] = useState(false);

  useEffect(() => {
    setData({ species: project.tagavaraSpecies || 'mand', g: project.tagavaraG || '', h: project.tagavaraH || '' });
  }, [project.id]);

  const updateField = (key: string, value: string) => {
    setData(prev => {
      const updated = { ...prev, [key]: value };
      onUpdate({ tagavaraSpecies: updated.species, tagavaraG: updated.g, tagavaraH: updated.h });
      return updated;
    });
  };

  const [panelSaved, setPanelSaved] = useState(false);
  const handleSave = () => {
    onUpdate({ tagavaraSpecies: data.species, tagavaraG: data.g, tagavaraH: data.h });
    setPanelSaved(true);
    setTimeout(() => setPanelSaved(false), 2000);
  };

  const f = calcStandFactor(data.species, parseFloat(data.h));
  const m = parseFloat(data.g) * parseFloat(data.h) * f;

  return (
    <div className="space-y-8">
      <section className="card p-8">
        <SectionTitle icon={Variable}>Puistu tagavara (H ≥ 6 m)</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end mb-6">
           <div className="space-y-1">
             <label className="label-cap">Puuliik</label>
             <select className="input-field w-full" value={data.species} onChange={e => updateField('species', e.target.value)}>
               <option value="mand">Mänd / Lehis</option>
               <option value="kuusk">Kuusik / Nulg</option>
               <option value="kask">Kask / Pärn</option>
               <option value="haab">Haab / Sanglepp</option>
               <option value="tamm">Tamm / Saar</option>
             </select>
           </div>
           <div className="space-y-1">
             <label className="label-cap">G (m²/ha)</label>
             <input type="number" className="input-field w-full" value={data.g} onChange={e => updateField('g', e.target.value)} />
           </div>
           <div className="space-y-1">
             <label className="label-cap">Keskmine kõrgus H (m)</label>
             <input type="number" className="input-field w-full" value={data.h} onChange={e => updateField('h', e.target.value)} />
           </div>
        </div>
        <button onClick={handleSave} className={`w-full py-2.5 px-4 flex items-center justify-center gap-2 rounded-xl font-bold text-xs uppercase cursor-pointer transition-all active:scale-95 duration-200 ${panelSaved ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'}`}>
          {panelSaved ? <><Check className="w-4 h-4" /> Andmed salvestatud!</> : <><Save className="w-4 h-4" /> Salvesta andmed</>}
        </button>
      </section>

      {m > 0 && (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <ResultBox label="Vormiarv (F)" value={f.toFixed(4)} subtext="Matemaatiline mudel (lisa 11 p 1.2)" />
           <ResultBox label="Tagavara (M = G × H × F)" value={m.toFixed(1) + ' tm/ha'} type="success" subtext="Hektari tagavara tihumeetrites." />
         </div>
      )}

      <section className="card overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setShowRef(!showRef)}>
           <SectionTitle>Üksikpuu mahu kordajad (Lisa 11 p 1.3)</SectionTitle>
           {showRef ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
        {showRef && (
          <table className="w-full text-[10px] font-mono border-collapse">
             <thead className="bg-slate-50 border-b border-slate-200">
               <tr>
                 <th className="p-2 text-left">Puuliik</th>
                 <th className="p-2 text-right">a</th>
                 <th className="p-2 text-right">b</th>
                 <th className="p-2 text-right">c</th>
                 <th className="p-2 text-right">d</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100 text-slate-500">
                {Object.entries(MAHT_KORDAJAD).map(([k, v]) => (
                  <tr key={k} className={data.species === k ? 'bg-indigo-50 font-bold text-slate-800' : 'hover:bg-slate-50'}>
                    <td className="p-2 font-sans font-medium uppercase tracking-tighter capitalize">{k}</td>
                    <td className="p-2 text-right">{v.a.toFixed(4)}</td>
                    <td className="p-2 text-right">{v.b.toFixed(3)}</td>
                    <td className="p-2 text-right">{v.c.toFixed(3)}</td>
                    <td className="p-2 text-right">{v.d.toFixed(3)}</td>
                  </tr>
                ))}
             </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

// --- Print Component ---

function PrintDocument({ project, lisa2rows, onScreen = false }: { project: Project | undefined, lisa2rows: Lisa2Row[], onScreen?: boolean }) {
  if (!project) return null;

  const lisa2Rows = project.lisa2rows || [];
  const lisa2Kordaja = parseFloat(project.lisa2kordaja || '1');
  const lisa2Total = lisa2Rows.reduce((acc, r) => acc + (getLisa2Rate(r.diam, r.grupp) * r.arv * lisa2Kordaja), 0);
  const hasLisa2 = lisa2Rows.length > 0;

  const lisa3Species = project.lisa3puuliik || 'mand';
  const lisa3Vanus = parseFloat(project.lisa3vanus || '0');
  const lisa3Alammaar = parseFloat(project.lisa3alammaar || '0');
  const lisa3Kordaja = parseFloat(project.lisa3kordaja || '1');
  const lisa3Area = parseFloat(project.lisa3measuredArea || '0');
  const lisa3Perimeter = parseFloat(project.lisa3perimeter || '0');
  const lisa3Tegelik = parseFloat(project.lisa3tegelik || '0');

  const lisa3Pindala = calcKorrigeeritudPindala(lisa3Perimeter, lisa3Area) || 0;
  const lisa3CalculatedG = (() => {
    if (!lisa3Pindala || lisa3Pindala <= 0) return 0;
    const rows = project.lisa3rows || [];
    const totalG = rows.reduce((acc, row) => acc + (Math.PI * Math.pow(row.diam / 200, 2) * row.arv), 0);
    return totalG / lisa3Pindala;
  })();

  const lisa3EffectiveG = (project.lisa3rows || []).length > 0 ? lisa3CalculatedG : lisa3Tegelik;
  const lisa3Shortfall = lisa3Alammaar - lisa3EffectiveG;
  const lisa3Rate = getLisa3Rate(lisa3Species, lisa3Vanus) || 0;
  const lisa3Total = (lisa3Shortfall > 0 && lisa3Pindala > 0) ? (lisa3Shortfall * lisa3Rate * lisa3Kordaja * lisa3Pindala) : 0;
  const hasLisa3 = !!(project.lisa3measuredArea && parseFloat(project.lisa3measuredArea) > 0);

  const combinedTotal = (hasLisa2 ? lisa2Total : 0) + (hasLisa3 ? lisa3Total : 0);

  let points: any[] = [];
  if (project.lisa3coords) {
    try { points = JSON.parse(project.lisa3coords); } catch { points = []; }
  }

  const defaultCenter = { x: 6528701, y: 563500 };
  const bounds = (() => {
    if (points.length === 0) return { cx: defaultCenter.x, cy: defaultCenter.y, dx: 150, dy: 100 };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const dx = Math.max(maxX - minX, 10);
    const dy = Math.max(maxY - minY, 10);
    return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, dx: dx * 1.3, dy: dy * 1.3 };
  })();

  const viewWidth = 500, viewHeight = 220;
  const scale = Math.min(viewWidth / bounds.dy, viewHeight / bounds.dx);
  const worldToScreen = (wx: number, wy: number) => ({
    x: viewWidth / 2 + (wy - bounds.cy) * scale,
    y: viewHeight / 2 - (wx - bounds.cx) * scale
  });

  const speciesLabels: Record<string, string> = {
    mand: 'Mänd', kuusk: 'Kuusk', kask: 'Kask', sanglepp: 'Sanglepp',
    tamm: 'Tamm / Saar / Vaher / Jalakas', haab: 'Haab'
  };

  return (
    <div 
      className={onScreen ? "p-6 md:p-12 bg-white text-slate-900 font-sans" : "print-only hidden print:block p-10 bg-white min-h-screen text-slate-900 font-sans"} 
      style={{ color: '#000' }}
    >
      {/* HEADER */}
      <div className="border-b-4 border-slate-900 pb-5 mb-6 flex justify-between items-end">
        <div>
          <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest mb-1">
            Metsaseaduse Kohane Keskkonnakahju Arvutusprotokoll
          </div>
          <h1 className="text-3xl font-black text-slate-900 leading-none">{project.nimi}</h1>
          {project.nr && <div className="text-xs font-mono text-slate-500 mt-1.5">Protokolli kood / Viide: {project.nr}</div>}
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-slate-800">{project.koostaja || 'Koostaja täitmata'}</div>
          <div className="text-xs text-slate-400 mt-0.5">{project.kuupaev}</div>
        </div>
      </div>

      {/* METADATA */}
      <div className="grid grid-cols-2 gap-6 mb-8 border-b border-slate-200 pb-6">
        <div>
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Asukoha andmed</div>
          <table className="w-full text-xs"><tbody>
            <tr><td className="py-1 text-slate-500 w-32">Kinnistu aadress:</td><td className="py-1 font-bold text-slate-800">{project.aadress || '—'}</td></tr>
            <tr><td className="py-1 text-slate-500">Katastritunnus:</td><td className="py-1 font-bold text-slate-800">{project.katastr || '—'}</td></tr>
            <tr><td className="py-1 text-slate-500">Raie liik:</td><td className="py-1 font-bold text-slate-800">{project.raieliik || '—'}</td></tr>
          </tbody></table>
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Protokolli seaded</div>
          <table className="w-full text-xs"><tbody>
            <tr><td className="py-1 text-slate-500 w-32">Eraldise pindala:</td><td className="py-1 font-bold text-slate-800">{project.pindala ? `${project.pindala} ha` : '—'}</td></tr>
            <tr><td className="py-1 text-slate-500">Kaitseala staatus:</td><td className="py-1 font-bold text-slate-800">{lisa2Kordaja > 1 ? `Kaitsealune (Kordaja ×${lisa2Kordaja})` : 'Tavavöönd (Kordaja ×1)'}</td></tr>
          </tbody></table>
        </div>
      </div>

      {/* LISA 2 */}
      {hasLisa2 && (
        <div className="mb-8">
          <div className="border-b-2 border-slate-300 pb-1.5 mb-3">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">LISA 2: Kasvavate puude ebaseadusliku raiumise kahjuarvutus (MS § 67 L2)</h2>
          </div>
          <table className="w-full text-xs mb-4 border-collapse">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200">
                <th className="p-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Puuliik</th>
                <th className="p-2 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Grupp</th>
                <th className="p-2 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Diameeter (cm)</th>
                <th className="p-2 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Arv (tk)</th>
                <th className="p-2 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Hinnamäär (€)</th>
                <th className="p-2 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Summa (€)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lisa2Rows.map(r => (
                <tr key={r.id}>
                  <td className="p-2 font-bold text-slate-700">{r.liik}</td>
                  <td className="p-2 text-right font-mono text-slate-500">{r.grupp}</td>
                  <td className="p-2 text-right font-mono">{r.diam.toFixed(1)}</td>
                  <td className="p-2 text-right font-mono">{r.arv}</td>
                  <td className="p-2 text-right font-mono">{getLisa2Rate(r.diam, r.grupp).toFixed(2)}</td>
                  <td className="p-2 text-right font-mono font-bold text-slate-800">{(getLisa2Rate(r.diam, r.grupp) * r.arv * lisa2Kordaja).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-300 font-bold bg-slate-50">
                <td colSpan={5} className="p-2 text-right text-slate-500 uppercase tracking-wider text-[10px]">Lisa 2 kahjusumma kokku:</td>
                <td className="p-2 text-right font-mono text-slate-900">{lisa2Total.toFixed(2)} €</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* LISA 3 */}
      {hasLisa3 && (
        <div className="mb-8 avoid-break">
          <div className="border-b-2 border-slate-300 pb-1.5 mb-3">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">LISA 3: Puistu rinnaspindala kahjustamise kahjuarvutus (MS § 67 L3)</h2>
          </div>
          <div className="grid grid-cols-2 gap-6 mb-4 items-start">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Andmed ja parameetrid</div>
              <table className="w-full text-xs divide-y divide-slate-100"><tbody>
                <tr><td className="py-1.5 text-slate-500">Enamuspuuliik:</td><td className="py-1.5 font-bold text-slate-800">{speciesLabels[lisa3Species] || lisa3Species}</td></tr>
                <tr><td className="py-1.5 text-slate-500">Puistu vanus:</td><td className="py-1.5 font-bold text-slate-800">{lisa3Vanus} aastat</td></tr>
                <tr><td className="py-1.5 text-slate-500">Alammäär G (norm):</td><td className="py-1.5 font-bold text-slate-800">{lisa3Alammaar.toFixed(1)} m²/ha</td></tr>
                <tr><td className="py-1.5 text-slate-500">Tegelik rinnaspindala:</td><td className="py-1.5 font-bold text-indigo-700">{lisa3EffectiveG.toFixed(2)} m²/ha</td></tr>
                <tr><td className="py-1.5 text-slate-500">Kaitseala kordaja K:</td><td className="py-1.5 font-bold text-slate-800">×{lisa3Kordaja}</td></tr>
                <tr><td className="py-1.5 text-slate-500">Mõõdetud pindala:</td><td className="py-1.5 font-bold text-slate-800">{lisa3Area.toFixed(2)} ha (Ümbermõõt: {lisa3Perimeter.toFixed(0)} m)</td></tr>
                <tr className="bg-slate-50 font-bold"><td className="py-1.5 px-1 text-slate-600">Korrigeeritud pindala P:</td><td className="py-1.5 px-1 font-mono text-indigo-700">{lisa3Pindala.toFixed(4)} ha</td></tr>
              </tbody></table>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Lisa 3 Arvutuskäik</div>
              <div className="space-y-2.5 text-xs text-slate-700">
                <div className="flex justify-between items-center text-[11px] pb-1.5 border-b border-slate-200">
                  <span>Rinnaspindala puudujääk (∆G):</span>
                  <span className="font-mono font-bold">{lisa3Shortfall > 0 ? `${lisa3Shortfall.toFixed(2)} m²/ha` : '0.00 m²/ha (Puudub)'}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] pb-1.5 border-b border-slate-200">
                  <span>Määr puuliigile ja vanusele:</span>
                  <span className="font-mono font-bold">{lisa3Rate > 0 ? `${lisa3Rate} €/m²/ha` : '— (kohaldub vanusepiir)'}</span>
                </div>
                <div className="text-[10px] text-slate-500 leading-relaxed font-mono">
                  Valem: Kahju = ∆G × Määr × K × P<br/>
                  Arvutus: {lisa3Shortfall > 0 ? lisa3Shortfall.toFixed(2) : '0'} × {lisa3Rate} × {lisa3Kordaja} × {lisa3Pindala.toFixed(3)}
                </div>
                <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg flex justify-between items-center text-indigo-900 font-bold mt-1">
                  <span>Arvutuslik Lisa 3 kahju:</span>
                  <span className="font-mono text-sm">{lisa3Total.toFixed(2)} €</span>
                </div>
              </div>
            </div>
          </div>

          {points.length >= 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 avoid-break">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Virtuaalne L-EST'97 Kaardiväli (Visuaal)</div>
                <div className="border border-slate-300 rounded-xl overflow-hidden p-2 bg-slate-100 flex items-center justify-center">
                  <svg viewBox={`0 0 ${viewWidth} ${viewHeight}`} className="w-full max-w-[500px] h-[220px]">
                    <rect width="100%" height="100%" fill="#f8fafc" />
                    <defs>
                      <pattern id="print-map-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                        <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(148, 163, 184, 0.15)" strokeWidth="0.5" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#print-map-grid)" />
                    <polygon points={points.map(p => { const sp = worldToScreen(p.x, p.y); return `${sp.x},${sp.y}`; }).join(' ')} fill="rgba(79, 70, 229, 0.08)" stroke="#4f46e5" strokeWidth="2" strokeDasharray="4,2" strokeLinejoin="round" />
                    {points.map((p, idx) => {
                      const sp = worldToScreen(p.x, p.y);
                      return (
                        <g key={p.id}>
                          <circle cx={sp.x} cy={sp.y} r={6} fill="#ffffff" stroke="#1e1b4b" strokeWidth="1.5" />
                          <text x={sp.x} y={sp.y + 2.5} fontSize="8" fontWeight="bold" fill="#1e1b4b" textAnchor="middle">{idx + 1}</text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Piiri tippude koordinaadid (L-EST'97 / GPS)</div>
                <div className="overflow-x-auto border border-slate-300 rounded-xl">
                  <table className="w-full text-left text-[9px] border-collapse">
                    <thead><tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
                      <th className="p-2 w-8 text-center">Tipp</th>
                      <th className="p-2 font-mono">X (Põhi)</th>
                      <th className="p-2 font-mono">Y (Ida)</th>
                      <th className="p-2">GPS (Lat / Lon)</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-200">
                      {points.map((p, idx) => (
                        <tr key={p.id} className="text-slate-800">
                          <td className="p-1.5 font-bold text-center bg-slate-50">{idx + 1}</td>
                          <td className="p-1.5 font-mono text-slate-600">{Math.round(p.x)}</td>
                          <td className="p-1.5 font-mono text-slate-600">{Math.round(p.y)}</td>
                          <td className="p-1.5 text-slate-500 font-mono">{p.lat.toFixed(6)}° N, {p.lon.toFixed(6)}° E</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUMMARY */}
      <div className="mt-8 border-t-4 border-slate-900 pt-6 avoid-break">
        <div className="grid grid-cols-2 gap-6 items-end">
          <div className="p-4 bg-slate-100 rounded-xl border border-slate-300">
            <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Määratud kahju summa sõnadega</div>
            <div className="text-xs italic text-slate-700 font-bold leading-relaxed">{totalToWords(combinedTotal)}</div>
          </div>
          <div className="text-right">
            <table className="w-full text-xs font-medium ml-auto max-w-[325px]"><tbody>
              {hasLisa2 && <tr><td className="py-1 text-slate-500">Puunormide kahjuarvutus (Lisa 2):</td><td className="py-1 font-mono text-slate-900 font-bold text-right">{lisa2Total.toFixed(2)} €</td></tr>}
              {hasLisa3 && <tr><td className="py-1 text-slate-500">Tiheduse kahjuarvutus (Lisa 3):</td><td className="py-1 font-mono text-indigo-800 font-bold text-right">{lisa3Total.toFixed(2)} €</td></tr>}
              <tr className="border-t-2 border-slate-900 font-black text-sm bg-slate-50">
                <td className="p-2.5 text-slate-850 uppercase tracking-widest text-[10px]">KOKKU MÄÄRATUD KESKKONNAKAHJU:</td>
                <td className="p-2.5 font-mono text-lg text-slate-950 text-right">{combinedTotal.toFixed(2)} €</td>
              </tr>
            </tbody></table>
          </div>
        </div>
      </div>

      {project.markused && (
        <div className="mt-8 border-t border-slate-250 pt-4 avoid-break">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">Märkused ja asjaolud</div>
          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap italic bg-slate-50 p-4 border rounded-xl">{project.markused}</p>
        </div>
      )}

      <div className="mt-20 grid grid-cols-2 gap-12 avoid-break">
        <div className="border-t border-slate-350 pt-3 text-center text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">Hinnangu koostaja allkiri / Digitempel</div>
        <div className="border-t border-slate-350 pt-3 text-center text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">Allkirjastamise kuupäev</div>
      </div>
    </div>
  );
}
