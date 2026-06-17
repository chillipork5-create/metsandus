import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Trees, Plus, FolderOpen, Printer, Save, Check, Menu, X, Leaf } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, TabType, makeDefaultProject } from './types';
import { getProjects, saveProjects, generateId, formatDate } from './lib/utils';
import { useFlash, useTimeout } from './lib/useTimeout';
import { PanelContainer } from './components/ui';
import Lisa2Panel from './components/Lisa2Panel';
import Lisa3Panel from './components/Lisa3Panel';
import AbiarvutusedPanel from './components/AbiarvutusedPanel';
import UldinfoPanel from './components/UldinfoPanel';
import ProjectDataPanel from './components/ProjectDataPanel';
import PrintDocument from './components/PrintDocument';

const TABS: { id: TabType; label: string }[] = [
  { id: 'uldinfo',      label: 'Üldinfo' },
  { id: 'lisa2',        label: 'Lisa 2' },
  { id: 'lisa3',        label: 'Lisa 3' },
  { id: 'abiarvutused', label: 'Abiarvutused' },
  { id: 'project',      label: 'Seaded' },
];

export default function App() {
  const [projects, setProjects]         = useState<Project[]>(getProjects);
  const [currentId, setCurrentId]       = useState<string | null>(null);
  const [activeTab, setActiveTab]       = useState<TabType>('uldinfo');
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [newName, setNewName]           = useState('');
  const [viewMode, setViewMode]         = useState<'editor' | 'report'>('editor');
  const [showPH, setShowPH]             = useState(false);
  const [isSaving, setIsSaving]         = useState(false);
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [saveSuccess, flashSaveSuccess] = useFlash(2000);
  const printTimeout  = useTimeout();
  const saveTimeout   = useTimeout();

  const project = useMemo(() => projects.find(p => p.id === currentId), [projects, currentId]);

  useEffect(() => { saveProjects(projects); }, [projects]);
  useEffect(() => { if (projects.length > 0 && !currentId) setCurrentId(projects[0].id); }, []);

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
    if (!newName.trim()) return;
    const newProj = makeDefaultProject(newName, generateId(), formatDate());
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
    saveTimeout.set(() => { setIsSaving(false); flashSaveSuccess(); }, 400);
  };

  const handlePrint = () => {
    setViewMode('report');
    if (window.self !== window.top) { setShowPH(true); }
    else { printTimeout.set(() => { try { window.print(); } catch { } }, 450); }
  };

  const selectProject = (id: string) => { setCurrentId(id); setSidebarOpen(false); };

  /* ── Sidebar ──────────────────────────────────────────────────────────────── */
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-forest-600 rounded-xl flex items-center justify-center shadow-sm shrink-0" aria-hidden="true">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800 leading-tight">Metsanduse</div>
            <div className="text-sm font-semibold text-slate-800 leading-tight">Kalkulaator</div>
          </div>
        </div>
        <div className="mt-3 text-[10px] text-slate-400 font-medium tracking-wider uppercase">
          Metsaseadus § 67 · v11
        </div>
      </div>

      {/* New project */}
      <div className="p-4">
        <button
          onClick={() => { setIsModalOpen(true); setSidebarOpen(false); }}
          className="w-full flex items-center justify-center gap-2 bg-forest-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-forest-700 active:scale-95 transition-all shadow-sm"
          aria-label="Loo uus projekt"
        >
          <Plus className="w-4 h-4" aria-hidden="true" /> Uus projekt
        </button>
      </div>

      {/* Project list */}
      <div className="px-4 mb-2">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Projektid</span>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar pb-4" aria-label="Projektide nimekiri">
        {projects.length === 0 ? (
          <div className="p-8 text-center opacity-40" role="status">
            <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-20" aria-hidden="true" />
            <p className="text-[11px] uppercase tracking-wider font-semibold">Pole projekte</p>
          </div>
        ) : projects.map(p => (
          <button
            key={p.id} onClick={() => selectProject(p.id)}
            className={`sidebar-item ${currentId === p.id ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}
            aria-current={currentId === p.id ? 'page' : undefined}
          >
            <div className={`text-xs font-semibold truncate ${currentId === p.id ? 'text-forest-700' : 'text-slate-700'}`}>
              {p.meta.nimi}
            </div>
            <div className="text-[10px] font-mono text-slate-400 truncate">
              {p.uldinfo?.katastr || p.uldinfo?.eraldis || 'Andmed täitmata'}
            </div>
          </button>
        ))}
      </nav>

      {/* Status chip */}
      <div className="m-4 mt-auto">
        <div className="flex items-center gap-2 px-3 py-2.5 bg-forest-50 border border-forest-200 rounded-xl">
          <div className="w-1.5 h-1.5 bg-forest-500 rounded-full shrink-0" aria-hidden="true" />
          <span className="text-[11px] text-forest-700 font-medium">Valemid MS Lisa 2 kohased</span>
        </div>
      </div>
    </div>
  );

  /* ── Render ───────────────────────────────────────────────────────────────── */
  return (
    <>
      {/* Print / report view */}
      {viewMode === 'report' && (
        <div className="fixed inset-0 z-[100] bg-slate-900 overflow-y-auto pb-16 flex flex-col print:relative print:inset-auto print:bg-white print:overflow-visible">
          <div className="bg-slate-800 border-b border-slate-700 p-4 sticky top-0 z-[110] no-print">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3 text-white">
                <Printer className="w-5 h-5 text-forest-400" aria-hidden="true" />
                <span className="font-semibold text-sm">Trükieelvaade</span>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button onClick={() => setViewMode('editor')} className="flex-1 sm:flex-none btn-secondary !bg-slate-700 !text-white !border-slate-600 hover:!bg-slate-600 font-semibold py-2 px-4">← Tagasi</button>
                <button onClick={() => { if (window.self !== window.top) setShowPH(true); else window.print(); }} className="flex-1 sm:flex-none btn-primary flex items-center justify-center gap-2 py-2 px-5">
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

      {/* Main app shell */}
      <div className="flex h-screen overflow-hidden text-slate-900 font-sans no-print">

        {/* Desktop sidebar */}
        <aside
          id="main-sidebar"
          className="hidden md:flex w-64 bg-white border-r border-slate-100 flex-col shrink-0 z-20"
          aria-label="Külgriba"
        >
          <SidebarContent />
        </aside>

        {/* Mobile sidebar drawer */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-slate-900/40 md:hidden"
                onClick={() => setSidebarOpen(false)} aria-hidden="true"
              />
              <motion.aside
                id="main-sidebar"
                initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                transition={{ type: 'tween', duration: 0.22 }}
                className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-100 flex flex-col md:hidden"
                aria-label="Külgriba"
              >
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
                  aria-label="Sulge külgriba"
                >
                  <X className="w-4 h-4" />
                </button>
                <SidebarContent />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Content area */}
        <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden min-w-0">

          {/* Empty state */}
          {!currentId ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden absolute top-4 left-4 p-2 rounded-xl bg-white border border-slate-200 text-slate-500"
                aria-label="Ava menüü"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="w-16 h-16 bg-forest-50 rounded-2xl flex items-center justify-center mb-5 border border-forest-100">
                <Trees className="w-8 h-8 text-forest-400" aria-hidden="true" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800 mb-2">Vali projekt</h2>
              <p className="text-slate-400 text-sm max-w-xs mb-8">Alustamiseks vali vasakult projekt või loo uus.</p>
              <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" aria-hidden="true" /> Loo projekt
              </button>
            </div>
          ) : (
            <>
              {/* ── Header ── */}
              <header className="h-14 bg-white border-b border-slate-100 flex items-center justify-between px-4 md:px-6 shrink-0 no-print z-10 gap-3">
                {/* Mobile menu toggle */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 shrink-0"
                  aria-label="Ava menüü" aria-expanded={sidebarOpen}
                >
                  <Menu className="w-5 h-5" />
                </button>

                {/* Project name */}
                <div className="hidden sm:flex flex-col min-w-0 shrink">
                  <h2 className="text-sm font-semibold text-slate-800 truncate">{project?.meta.nimi}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono text-slate-400 truncate">#{project?.meta.nr || project?.id.slice(0, 8)}</span>
                    <div className="flex items-center gap-1 border-l border-slate-100 pl-2 shrink-0">
                      <div className="w-1.5 h-1.5 bg-forest-500 rounded-full" aria-hidden="true" />
                      <span className="text-[10px] font-semibold text-forest-600 uppercase tracking-widest">Aktiivne</span>
                    </div>
                  </div>
                </div>

                {/* Tab bar */}
                <nav
                  className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto shrink-0 max-w-full"
                  aria-label="Vahekaardid" role="tablist"
                >
                  {TABS.map(tab => (
                    <button
                      key={tab.id} role="tab"
                      onClick={() => setActiveTab(tab.id)}
                      aria-selected={activeTab === tab.id}
                      className={`tab-btn whitespace-nowrap ${activeTab === tab.id ? 'tab-btn-active' : 'tab-btn-inactive'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleManualSave} disabled={isSaving}
                    aria-label={saveSuccess ? 'Salvestatud' : 'Salvesta projekt'}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-white font-semibold text-xs uppercase tracking-wider cursor-pointer transition-all active:scale-95 disabled:opacity-60 shadow-sm
                      ${saveSuccess ? 'bg-forest-500' : 'bg-forest-600 hover:bg-forest-700'}`}
                  >
                    {saveSuccess
                      ? <><Check className="w-4 h-4" aria-hidden="true" /><span className="hidden sm:inline">Salvestatud</span></>
                      : <><Save className="w-4 h-4" aria-hidden="true" /><span className="hidden sm:inline">{isSaving ? 'Salvestab...' : 'Salvesta'}</span></>}
                  </button>
                  <button
                    onClick={handlePrint} aria-label="Ekspordi PDF"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 font-semibold text-xs uppercase tracking-wider cursor-pointer transition-all"
                  >
                    <Printer className="w-4 h-4" aria-hidden="true" />
                    <span className="hidden sm:inline">PDF</span>
                  </button>
                </div>
              </header>

              {/* ── Main content ── */}
              <main
                className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar"
                role="tabpanel" aria-label="Kalkulaatori sisu"
              >
                <div className="max-w-5xl mx-auto pb-12">
                  {project && (
                    <>
                      <PanelContainer isActive={activeTab === 'uldinfo'}><UldinfoPanel project={project} onUpdate={updateProject} /></PanelContainer>
                      <PanelContainer isActive={activeTab === 'lisa2'}><Lisa2Panel project={project} onUpdate={updateProject} /></PanelContainer>
                      <PanelContainer isActive={activeTab === 'lisa3'}><Lisa3Panel project={project} onUpdate={updateProject} /></PanelContainer>
                      <PanelContainer isActive={activeTab === 'abiarvutused'}><AbiarvutusedPanel project={project} onUpdate={updateProject} /></PanelContainer>
                      <PanelContainer isActive={activeTab === 'project'}><ProjectDataPanel project={project} onUpdate={updateProject} onDelete={handleDeleteProject} /></PanelContainer>
                    </>
                  )}
                </div>
              </main>

              {/* ── Footer ── */}
              <footer
                className="h-9 bg-white border-t border-slate-100 flex items-center px-4 md:px-6 justify-between shrink-0 no-print"
                role="contentinfo"
              >
                <span className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                  <div className="w-1.5 h-1.5 bg-forest-500 rounded-full" aria-hidden="true" />
                  Süsteem aktiivne · MS Lisa 2 §67
                </span>
                <span className="text-[10px] font-mono text-slate-300 hidden sm:block">
                  {project?.id.toUpperCase()}
                </span>
              </footer>
            </>
          )}
        </div>
      </div>

      {/* Hidden print document */}
      {viewMode !== 'report' && <PrintDocument project={project} />}

      {/* Print helper modal */}
      <AnimatePresence>
        {showPH && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="print-modal-title">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPH(false)} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" aria-hidden="true" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 border border-slate-200 p-8">
              <h3 id="print-modal-title" className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Printer className="w-5 h-5 text-forest-600" aria-hidden="true" /> PDF-i eksportimine
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                Vajuta <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-xs">Ctrl + P</kbd> (Macis <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-xs">Cmd + P</kbd>) trükiakna avamiseks.
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" aria-hidden="true" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 border border-slate-200">
              <div className="p-7">
                <h3 id="new-project-title" className="text-base font-semibold text-slate-900 mb-1">Uus projekt</h3>
                <p className="text-slate-400 text-xs mb-6">Sisesta projekti nimi alustamiseks.</p>
                <div>
                  <label className="label-cap block mb-1.5" htmlFor="new-project-name">Projekti nimetus</label>
                  <input
                    id="new-project-name" autoFocus type="text"
                    className="input-field w-full py-2.5 text-sm"
                    placeholder="nt Saare kinnistu eraldis 4"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
                    aria-required="true"
                  />
                </div>
              </div>
              <div className="flex bg-slate-50 p-4 gap-3 border-t border-slate-100">
                <button onClick={() => setIsModalOpen(false)} className="btn-secondary flex-1 py-2.5">Katkesta</button>
                <button onClick={handleCreateProject} className="btn-primary flex-1 py-2.5">Loo projekt</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
