import React from 'react';
import { BookOpen, GraduationCap, Briefcase, Settings, LogOut, Menu, CircuitBoard, Sparkles, Users } from 'lucide-react';

const Sidebar = ({ isOpen, setIsOpen, activeTab, setActiveTab, currentUser, onLogout }) => {
  const navigate = (tab) => {
    setActiveTab(tab);
    if (window.innerWidth < 768) setIsOpen(false);
  };

  return (
    <>
      {!isOpen && (
        <button aria-label="Abrir menu" onClick={() => setIsOpen(true)} className="fixed left-4 top-4 z-40 rounded-2xl border border-white/10 bg-slate-950 p-3 text-white shadow-xl md:hidden">
          <Menu />
        </button>
      )}
      {isOpen && <button aria-label="Fechar menu" onClick={() => setIsOpen(false)} className="fixed inset-0 z-40 bg-slate-950/40 md:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex h-full w-72 flex-col overflow-hidden bg-[#07111f] text-white shadow-2xl transition-[transform,width] duration-300 ease-out md:relative md:translate-x-0 ${isOpen ? 'translate-x-0 md:w-72' : '-translate-x-full md:w-24'}`}>
    <div className="pointer-events-none absolute -left-20 top-16 h-52 w-52 rounded-full bg-blue-600/20 blur-3xl" />
    <div className="pointer-events-none absolute -right-20 bottom-24 h-52 w-52 rounded-full bg-cyan-400/10 blur-3xl" />
    <div className="relative flex h-28 items-center justify-between px-5">
      <div className="flex items-center gap-3 whitespace-nowrap font-black tracking-tight">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan-300 via-blue-500 to-violet-600 shadow-lg shadow-blue-500/20"><CircuitBoard size={23} /></span>
        <span className="text-lg">AI<span className="text-cyan-300">STUDY</span>TEC</span>
      </div>
      <button aria-label="Recolher menu" onClick={() => setIsOpen(!isOpen)} className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white"><Menu /></button>
    </div>
    <div className="relative mx-4 mb-5 overflow-hidden rounded-2xl border border-cyan-300/15 bg-white/[0.06] p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-300"><Sparkles size={14} /> Laboratório</div>
      <p className="mt-2 text-xs leading-relaxed text-slate-400">Aprenda no seu ritmo. A IA propõe; você explora.</p>
    </div>
    <nav aria-label="Navegação principal" className="relative flex-1 space-y-2 px-4">
      <button onClick={() => navigate('home')} className={`group flex min-h-12 w-full items-center gap-4 rounded-2xl px-4 font-bold transition ${activeTab === 'home' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-white/[0.07] hover:text-white'}`}><BookOpen /> <span>Explorar</span></button>
      <button onClick={() => navigate('student-area')} className={`group flex min-h-12 w-full items-center gap-4 rounded-2xl px-4 font-bold transition ${activeTab === 'student-area' ? 'bg-gradient-to-r from-cyan-600 to-teal-500 text-white shadow-lg shadow-cyan-600/20' : 'text-slate-400 hover:bg-white/[0.07] hover:text-white'}`}><GraduationCap /> <span>Minha jornada</span></button>
      {(currentUser?.type === 'teacher' || currentUser?.type === 'master') && (
        <button onClick={() => navigate('teacher')} className={`flex min-h-12 w-full items-center gap-4 rounded-2xl px-4 font-bold transition ${activeTab === 'teacher' ? 'bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white' : 'text-slate-400 hover:bg-white/[0.07] hover:text-white'}`}><Briefcase /> Gestão</button>
      )}
      {currentUser?.type === 'master' && (
        <button onClick={() => navigate('access-management')} className={`flex min-h-12 w-full items-center gap-4 rounded-2xl px-4 font-bold transition ${activeTab === 'access-management' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950' : 'text-slate-400 hover:bg-white/[0.07] hover:text-white'}`}><Users /> Acessos</button>
      )}
      <button onClick={() => navigate('settings')} className={`flex min-h-12 w-full items-center gap-4 rounded-2xl px-4 font-bold transition ${activeTab === 'settings' ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/[0.07] hover:text-white'}`}><Settings /> Configurações</button>
    </nav>
    {currentUser && <div className="relative border-t border-white/10 p-4"><button onClick={() => onLogout('local')} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 font-bold text-rose-300 hover:bg-rose-400/10"><LogOut /> Sair</button></div>}
      </aside>
    </>
  );
};

export default Sidebar;
