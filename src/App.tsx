import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Trees, Plus, FolderOpen, Printer, Save, Check, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, TabType, makeDefaultProject } from './types';
import { getProjects, saveProjects, generateId, formatDate } from './lib/utils';
import { useFlash, useTimeout } from './lib/useTimeout';
import { PanelContainer } from './components/ui';
import Lisa2Panel from './components/Lisa2Panel';
import Lisa3Panel from './components/Lisa3Panel';
import KannuPanel from './components/KannuPanel';
import TaiusPanel from './components/TaiusPanel';
import TagavaraPanel from './components/TagavaraPanel';
import ProjectDataPanel from './components/ProjectDataPanel';
import UldinfoPanel from './components/UldinfoPanel';
import PrintDocument from './components/PrintDocument';

const TABS: { id: TabType; label: string }[] = [
  { id: 'uldinfo', label: 'Üldinfo' },
  { id: 'lisa2',   label: 'Lisa 2' },
  { id: 'lisa3',   label: 'Lisa 3' },
  { id: 'kannu',   label: 'Känd' },
  { id: 'taius',   label: 'Täius' },
  { id: 'maht',    label: 'Tagavara' },
  { id: 'project', label: 'Seaded' },
];

export default function App() {
  const [projects, setProjects]         = useState<Project[]>(getProjects);
  const [currentId, setCurrentId]       = useState<string | null>(null);
  const [activeTab, setActiveTab]       = useState<TabType>('uldinfo');
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [newProjectName, setNewName]    = useState('');
  const [viewMode, setViewMode]         = useState<'editor' | 'report'>('editor');
  const [showPrintHelper, setShowPH]    = useState(false);
  const [isSaving, setIsSaving]         = useState(false);
  const [saveSuccess, flashSaveSuccess] = useFlash(2000);
  const printTimeout = useTimeout();
  // FIX: mobile sidebar toggle
  const [sidebarOpen, setSidebarOpen]   = useState(false);

  const project = useMemo(() => projects.find(p => p.id === currentId), [projects, currentId]);

  useEffect(() => { saveProjects(projects); }, [projects]);
  useEffect(() => { if (projects.length > 0 && !currentId) setCurrentId(projects[0].id); }, []);

  // Close sidebar on outside click (mobile)
  useEffect(() => {
    if (!sidebarOpen) return;
    const handler = (e: MouseEvent) => {
      const sidebar = document.getElementById('main-sidebar');
      if (sidebar && !sidebar.contains(e.target as Node)) setSidebarOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [sidebarOpen]);

  const updateProject = useCallback((updates: Partial<Project>) => {
    if (!currentId) return;
    setProjects(prev => prev.map(p => p.id === currentId ? { ...p, ...updates } : p));
  }, [currentId]);

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    const newProj = makeDefaultProject(newProjectName, generateId(), formatDate());
    setProjects(prev => [newProj, ...prev]);
    setCurrentId(newProj.id);
    setNewName('');
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
    printTimeout.set(() => {
      setIsSaving(false);
      flashSaveSuccess();
    }, 400);
  };

  const handlePrint = () => {
    setViewMode('report');
    if (window.self !== window.top) { setShowPH(true); }
    else { printTimeout.set(() => { try { window.print(); } catch { /* ignore */ } }, 450); }
  };

  const selectProject = (id: string) => {
    setCurrentId(id);
    setSidebarOpen(false); // close on mobile after selection
  };

  // Sidebar content — shared between desktop and mobile drawer
  const SidebarContent = () => (
    <>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-bold text-lg" aria-hidden="true">Σ</div>
          <h1 className="text-sm font-bold tracking-tight text-slate-800">Metsanduse<br />Finantsmootor</h1>
        </div>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Versioon 5.0.0</p>
      </div>

      <div className="px-4 mb-4">
        <button
          onClick={() => { setIsModalOpen(true); setSidebarOpen(false); }}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm shadow-sm hover:bg-indigo-700 active:scale-95 transition-all"
          aria-label="Loo uus projekt"
        >
          <Plus className="w-4 h-4" aria-hidden="true" /> Uus projekt
        </button>
      </div>

      <div className="px-6 mb-2">
        <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Projektid</h2>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 space-y-2 custom-scrollbar pb-6" aria-label="Projektide nimekiri">
        {projects.length === 0 ? (
          <div className="p-8 text-center opacity-40" role="status">
            <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-20" aria-hidden="true" />
            <p className="text-[11px] uppercase tracking-wider font-bold">Pole projekte</p>
          </div>
        ) : (
          projects.map(p => (
            <button
              key={p.id}
              onClick={() => selectProject(p.id)}
              className={`sidebar-item ${currentId === p.id ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}
              aria-current={currentId === p.id ? 'page' : undefined}
            >
              <div className={`text-xs font-bold truncate ${currentId === p.id ? 'text-indigo-600' : 'text-slate-700'}`}>
                {p.meta.nimi}
              </div>
              <div className="text-[10px] font-mono truncate opacity-60">
                {p.uldinfo?.katastr || p.uldinfo?.eraldis || 'Andmed täitmata'}
              </div>
            </button>
          ))
        )}
      </nav>

      <div className="m-4 bg-indigo-900 rounded-2xl p-5 text-white shadow-lg">
        <p className="text-[10px] uppercase font-bold opacity-60 mb-2">Staatus</p>
        <p className="text-xs font-medium leading-tight">Valemid on lukustatud ja MS Lisa 2 kohased.</p>
      </div>
    </>
  );

  return (
    <>
      {/* ── Print preview ── */}
      {viewMode === 'report' && (
        <div className="fixed inset-0 z-[100] bg-slate-900 overflow-y-auto pb-16 flex flex-col print:relative print:inset-auto print:bg-white print:overflow-visible">
          <div className="bg-slate-800 border-b border-slate-700 p-4 sticky top-0 z-[110] no-print">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3 text-white">
                <Printer className="w-5 h-5 text-indigo-400" aria-hidden="true" />
                <span className="font-bold text-sm">Trükieelvaade</span>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button onClick={() => setViewMode('editor')} className="flex-1 sm:flex-none btn-secondary !bg-slate-700 !text-white !border-slate-600 hover:!bg-slate-600 cursor-pointer font-bold py-2 px-4">
                  ← Tagasi
                </button>
                <button
                  onClick={() => { if (window.self !== window.top) setShowPH(true); else window.print(); }}
                  className="flex-1 sm:flex-none btn-primary flex items-center justify-center gap-2 cursor-pointer font-bold py-2 px-5"
                >
                  <Printer className="w-4 h-4" aria-hidden="true" /> Ava trükidialoog (PDF)
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

      {/* ── Main layout ── */}
      <div className="flex h-screen overflow-hidden text-slate-900 font-sans no-print">

        {/* Desktop sidebar — hidden on mobile */}
        <aside
          id="main-sidebar"
          className="hidden md:flex w-72 bg-slate-100 border-r border-slate-200 flex-col shrink-0 z-20"
          aria-label="Külgriba"
        >
          <SidebarContent />
        </aside>

        {/* Mobile sidebar drawer */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-slate-900/50 md:hidden"
                onClick={() => setSidebarOpen(false)}
                aria-hidden="true"
              />
              {/* Drawer */}
              <motion.aside
                id="main-sidebar"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'tween', duration: 0.22 }}
                className="fixed inset-y-0 left-0 z-50 w-72 bg-slate-100 border-r border-slate-200 flex flex-col md:hidden"
                aria-label="Külgriba"
              >
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors"
                  aria-label="Sulge külgriba"
                >
                  <X className="w-4 h-4" />
                </button>
                <SidebarContent />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main content */}
        <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden relative min-w-0">
          {!currentId ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              {/* Mobile menu button when no project selected */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden absolute top-4 left-4 p-2 rounded-lg bg-white border border-slate-200 text-slate-600"
                aria-label="Ava menüü"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mb-6 border border-slate-200">
                <Trees className="w-10 h-10 text-slate-300" aria-hidden="true" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Vali sisendandmed</h2>
              <p className="text-slate-500 text-sm max-w-sm mb-8 font-medium">Alustamiseks vali vasakult projekt või loo uus.</p>
              <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" aria-hidden="true" /> Loo esmane projekt
              </button>
            </div>
          ) : (
            <>
              {/* Header */}
              <header className="h-14 md:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0 no-print z-10 gap-3">
                {/* Mobile hamburger */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors shrink-0"
                  aria-label="Ava menüü"
                  aria-expanded={sidebarOpen}
                >
                  <Menu className="w-5 h-5" />
                </button>

                {/* Project name — hidden on very small screens */}
                <div className="hidden sm:flex flex-col min-w-0 shrink">
                  <h2 className="text-sm font-bold tracking-tight text-slate-800 uppercase truncate">{project?.meta.nimi}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono text-slate-400 truncate"># {project?.meta.nr || 'ID_SOURCE_01'}</span>
                    <div className="flex items-center gap-1 border-l border-slate-200 pl-2 shrink-0">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" aria-hidden="true" />
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Aktiivne</span>
                    </div>
                  </div>
                </div>

                {/* Tab navigation — scrollable on mobile */}
                <nav
                  className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto shrink-0 max-w-full"
                  aria-label="Kalkulaatori vahekaardid"
                  role="tablist"
                >
                  {TABS.map(tab => (
                    <button
                      key={tab.id}
                      role="tab"
                      onClick={() => setActiveTab(tab.id)}
                      className={`tab-btn whitespace-nowrap ${activeTab === tab.id ? 'tab-btn-active' : 'tab-btn-inactive'}`}
                      aria-selected={activeTab === tab.id}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleManualSave}
                    disabled={isSaving}
                    aria-label={saveSuccess ? 'Salvestatud' : 'Salvesta projekt'}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-white font-bold text-xs uppercase cursor-pointer transition-all active:scale-95 disabled:opacity-60 ${saveSuccess ? 'bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                  >
                    {saveSuccess
                      ? <><Check className="w-4 h-4" aria-hidden="true" /><span className="hidden sm:inline">Salvestatud</span></>
                      : <><Save className="w-4 h-4" aria-hidden="true" /><span className="hidden sm:inline">{isSaving ? 'Salvestab...' : 'Salvesta'}</span></>
                    }
                  </button>
                  <button
                    onClick={handlePrint}
                    aria-label="Ekspordi PDF"
                    className="btn-secondary flex items-center gap-1.5 !bg-indigo-50 !text-indigo-600 !border-indigo-100 hover:!bg-indigo-100 cursor-pointer font-bold px-3 py-2"
                  >
                    <Printer className="w-4 h-4" aria-hidden="true" />
                    <span className="hidden sm:inline">PDF</span>
                  </button>
                </div>
              </header>

              {/* Tab panels */}
              <main
                className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar"
                role="tabpanel"
                aria-label="Kalkulaatori sisu"
              >
                <div className="max-w-5xl mx-auto pb-12">
                  {project && (
                    <>
                      <PanelContainer isActive={activeTab === 'uldinfo'}>
                        <UldinfoPanel project={project} onUpdate={updateProject} />
                      </PanelContainer>
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

              <footer className="h-10 bg-slate-900 text-white flex items-center px-4 md:px-8 justify-between text-[10px] uppercase tracking-widest shrink-0 no-print" role="contentinfo">
                <span className="flex items-center gap-2 font-bold">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" aria-hidden="true" />
                  Süsteem: Aktiivne
                </span>
                <span className="font-mono opacity-50 hidden sm:block">ID: {project?.id.toUpperCase()}</span>
              </footer>
            </>
          )}
        </div>
      </div>

      {/* Hidden print target */}
      {viewMode !== 'report' && <PrintDocument project={project} />}

      {/* Print helper modal */}
      <AnimatePresence>
        {showPrintHelper && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="print-modal-title">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPH(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" aria-hidden="true" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative z-10 border border-slate-200 p-8">
              <h3 id="print-modal-title" className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-600" aria-hidden="true" /> PDF-i Eksportimine
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Vajuta klaviatuuril{' '}
                <kbd className="px-1.5 py-0.5 bg-slate-100 border rounded font-mono font-bold">Ctrl + P</kbd>
                {' '}(Macis{' '}
                <kbd className="px-1.5 py-0.5 bg-slate-100 border rounded font-mono font-bold">Cmd + P</kbd>
                ) trükiakna avamiseks.
              </p>
              <button onClick={() => setShowPH(false)} className="btn-secondary w-full">Sule</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New project modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="new-project-title">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" aria-hidden="true" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 border border-slate-200">
              <div className="p-8">
                <h3 id="new-project-title" className="text-xl font-bold text-slate-900 mb-2">Uus projekt</h3>
                <p className="text-slate-500 text-xs mb-6 font-medium">Sisesta projekti nimi.</p>
                <div>
                  <label className="label-cap" htmlFor="new-project-name">Projekti nimetus</label>
                  <input
                    id="new-project-name"
                    autoFocus
                    type="text"
                    className="input-field w-full py-2.5 text-sm"
                    placeholder="nt Saare kinnistu eraldis 4"
                    value={newProjectName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
                    aria-required="true"
                  />
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
