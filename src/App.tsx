import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Trees, Plus, FolderOpen, Printer, Calculator, Save, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, TabType, makeDefaultProject } from './types';
import { getProjects, saveProjects, generateId, formatDate } from './lib/utils';
import { PanelContainer } from './components/ui';
import Lisa2Panel, { SummaryCard } from './components/Lisa2Panel';
import Lisa3Panel from './components/Lisa3Panel';
import KannuPanel from './components/KannuPanel';
import TaiusPanel from './components/TaiusPanel';
import TagavaraPanel from './components/TagavaraPanel';
import ProjectDataPanel from './components/ProjectDataPanel';
import PrintDocument from './components/PrintDocument';

const TABS: { id: TabType; label: string }[] = [
  { id: 'lisa2', label: 'Lisa 2' },
  { id: 'lisa3', label: 'Lisa 3' },
  { id: 'kannu', label: 'Känd' },
  { id: 'taius', label: 'Täius' },
  { id: 'maht',  label: 'Tagavara' },
  { id: 'project', label: 'Seaded' },
];

export default function App() {
  const [projects, setProjects] = useState<Project[]>(getProjects);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('lisa2');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [viewMode, setViewMode] = useState<'editor' | 'report'>('editor');
  const [showPrintHelper, setShowPrintHelper] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const project = useMemo(() => projects.find(p => p.id === currentId), [projects, currentId]);

  // Persist to storage whenever projects change
  useEffect(() => { saveProjects(projects); }, [projects]);

  // Select first project on load
  useEffect(() => {
    if (projects.length > 0 && !currentId) setCurrentId(projects[0].id);
  }, []);

  const updateProject = useCallback((updates: Partial<Project>) => {
    if (!currentId) return;
    setProjects(prev => prev.map(p => p.id === currentId ? { ...p, ...updates } : p));
  }, [currentId]);

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    const newProj = makeDefaultProject(newProjectName, generateId(), formatDate());
    setProjects(prev => [newProj, ...prev]);
    setCurrentId(newProj.id);
    setNewProjectName('');
    setIsModalOpen(false);
  };

  const handleDeleteProject = () => {
    if (!currentId || !window.confirm('Kustuta projekt?')) return;
    setProjects(prev => prev.filter(p => p.id !== currentId));
    setCurrentId(null);
  };

  const handleManualSave = () => {
    setIsSaving(true);
    saveProjects(projects);
    setTimeout(() => { setIsSaving(false); setSaveSuccess(true); setTimeout(() => setSaveSuccess(false), 2000); }, 400);
  };

  const handlePrint = () => {
    setViewMode('report');
    if (window.self !== window.top) { setShowPrintHelper(true); }
    else { setTimeout(() => { try { window.print(); } catch { /* ignore */ } }, 450); }
  };

  return (
    <>
      {/* Print preview mode */}
      {viewMode === 'report' && (
        <div className="fixed inset-0 z-[100] bg-slate-900 overflow-y-auto pb-16 flex flex-col print:relative print:inset-auto print:bg-white print:overflow-visible">
          <div className="bg-slate-800 border-b border-slate-700 p-4 sticky top-0 z-[110] no-print">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3 text-white">
                <Printer className="w-5 h-5 text-indigo-400" />
                <span className="font-bold text-sm">Trükieelvaade</span>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button onClick={() => setViewMode('editor')} className="flex-1 sm:flex-none btn-secondary !bg-slate-700 !text-white !border-slate-600 hover:!bg-slate-600 cursor-pointer font-bold py-2 px-4">
                  ← Tagasi
                </button>
                <button onClick={() => { if (window.self !== window.top) setShowPrintHelper(true); else window.print(); }}
                  className="flex-1 sm:flex-none btn-primary flex items-center justify-center gap-2 cursor-pointer font-bold py-2 px-5">
                  <Printer className="w-4 h-4" /> Ava trükidialoog (PDF)
                </button>
              </div>
            </div>
          </div>
          <div className="flex-grow py-8 px-4 flex justify-center">
            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden">
              <PrintDocument project={project} onScreen />
            </div>
          </div>
        </div>
      )}

      {/* Main editor */}
      <div className="flex h-screen overflow-hidden text-slate-900 font-sans no-print">
        {/* Sidebar */}
        <aside className="w-72 bg-slate-100 border-r border-slate-200 flex flex-col shrink-0 z-20">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-bold text-lg">Σ</div>
              <h1 className="text-sm font-bold tracking-tight text-slate-800">Metsanduse<br />Finantsmootor</h1>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Versioon 5.0</p>
          </div>

          <div className="px-4 mb-4">
            <button onClick={() => setIsModalOpen(true)} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm shadow-sm hover:bg-indigo-700 active:scale-95 transition-all">
              <Plus className="w-4 h-4" /> Uus projekt
            </button>
          </div>

          <div className="px-6 mb-2">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Projektid</h3>
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
                  aria-current={currentId === p.id ? 'true' : undefined}
                >
                  <div className={`text-xs font-bold truncate ${currentId === p.id ? 'text-indigo-600' : 'text-slate-700'}`}>{p.meta.nimi}</div>
                  <div className="text-[10px] font-mono truncate opacity-60">{p.meta.aadress || p.meta.katastr || 'Andmed täitmata'}</div>
                </button>
              ))
            )}
          </div>

          <div className="m-4 bg-indigo-900 rounded-2xl p-5 text-white shadow-lg">
            <p className="text-[10px] uppercase font-bold opacity-60 mb-2">Staatus</p>
            <p className="text-xs font-medium leading-tight">Valemid on lukustatud ja MS Lisa 2 kohased.</p>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden relative">
          {!currentId ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mb-6 border border-slate-200">
                <Trees className="w-10 h-10 text-slate-300" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Vali sisendandmed</h2>
              <p className="text-slate-500 text-sm max-w-sm mb-8 font-medium">Alustamiseks vali vasakult projekt või loo uus.</p>
              <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" /> Loo esmane projekt
              </button>
            </div>
          ) : (
            <>
              {/* Header */}
              <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 no-print z-10">
                <div className="flex items-center space-x-6">
                  <div>
                    <h2 className="text-sm font-bold tracking-tight text-slate-800 uppercase">{project?.meta.nimi}</h2>
                    <div className="flex items-center space-x-3 mt-0.5">
                      <span className="text-[10px] font-mono text-slate-400"># {project?.meta.nr || 'ID_SOURCE_01'}</span>
                      <div className="flex items-center space-x-1 border-l border-slate-200 pl-3">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Aktiivne</span>
                      </div>
                    </div>
                  </div>

                  <nav className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 ml-4" aria-label="Kalkulaatori vahekaardid">
                    {TABS.map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`tab-btn ${activeTab === tab.id ? 'tab-btn-active' : 'tab-btn-inactive'}`}
                        aria-selected={activeTab === tab.id}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kuupäev</div>
                    <div className="text-[11px] font-mono font-medium">{project?.meta.kuupaev}</div>
                  </div>
                  <button onClick={handleManualSave} disabled={isSaving}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white font-bold text-xs uppercase cursor-pointer transition-all active:scale-95 ${saveSuccess ? 'bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                    {saveSuccess ? <><Check className="w-4 h-4" /> Salvestatud!</> : <><Save className="w-4 h-4" /> {isSaving ? 'Salvestab...' : 'Salvesta'}</>}
                  </button>
                  <button onClick={handlePrint} className="btn-secondary flex items-center gap-2 !bg-indigo-50 !text-indigo-600 !border-indigo-100 hover:!bg-indigo-100 cursor-pointer font-bold">
                    <Printer className="w-4 h-4" /> Eksport PDF
                  </button>
                </div>
              </header>

              {/* Panel content */}
              <main className="flex-1 overflow-y-auto p-8 custom-scrollbar" aria-label="Kalkulaatori sisu">
                <div className="max-w-5xl mx-auto pb-12">
                  {project && (
                    <>
                      <PanelContainer isActive={activeTab === 'lisa2'}>
                        <Lisa2Panel project={project} onUpdate={updateProject} />
                      </PanelContainer>
                      <PanelContainer isActive={activeTab === 'lisa3'}>
                        <Lisa3Panel project={project} onUpdate={updateProject} />
                      </PanelContainer>
                      <PanelContainer isActive={activeTab === 'kannu'}>
                        <KannuPanel project={project} onUpdate={updateProject} />
                      </PanelContainer>
                      <PanelContainer isActive={activeTab === 'taius'}>
                        <TaiusPanel project={project} onUpdate={updateProject} />
                      </PanelContainer>
                      <PanelContainer isActive={activeTab === 'maht'}>
                        <TagavaraPanel project={project} onUpdate={updateProject} />
                      </PanelContainer>
                      <PanelContainer isActive={activeTab === 'project'}>
                        <ProjectDataPanel project={project} onUpdate={updateProject} onDelete={handleDeleteProject} />
                      </PanelContainer>
                    </>
                  )}
                </div>
              </main>

              <footer className="h-10 bg-slate-900 text-white flex items-center px-8 justify-between text-[10px] uppercase tracking-widest shrink-0 no-print">
                <span className="flex items-center gap-2 font-bold"><div className="w-2 h-2 bg-emerald-500 rounded-full" />Süsteem: Aktiivne</span>
                <span className="font-mono opacity-50 hidden sm:block">ID: {project?.id.toUpperCase()}</span>
              </footer>
            </>
          )}
        </div>
      </div>

      {/* Hidden print target (for browser print) */}
      {viewMode !== 'report' && <PrintDocument project={project} />}

      {/* Print helper modal */}
      <AnimatePresence>
        {showPrintHelper && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPrintHelper(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative z-10 border border-slate-200 p-8">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Printer className="w-5 h-5 text-indigo-600" /> PDF-i Eksportimine</h3>
              <p className="text-sm text-slate-600 mb-4">Vajuta klaviatuuril <kbd className="px-1.5 py-0.5 bg-slate-100 border rounded font-mono font-bold">Ctrl + P</kbd> (Macis <kbd className="px-1.5 py-0.5 bg-slate-100 border rounded font-mono font-bold">Cmd + P</kbd>) trükiakna avamiseks.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowPrintHelper(false)} className="btn-secondary flex-1">Sule</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New project modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 border border-slate-200">
              <div className="p-8">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Uus projekt</h3>
                <p className="text-slate-500 text-xs mb-6 font-medium">Sisesta projekti nimi.</p>
                <div>
                  <label className="label-cap">Projekti nimetus</label>
                  <input autoFocus type="text" className="input-field w-full py-2.5 text-sm"
                    placeholder="nt Saare kinnistu eraldis 4"
                    value={newProjectName}
                    onChange={e => setNewProjectName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateProject()} />
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
