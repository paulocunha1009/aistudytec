import React from 'react';
import { BookOpenCheck, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '../design-system';

const PrivateAccessPortal = ({ onOpenLogin, error }) => (
  <main className="relative grid min-h-screen overflow-hidden bg-[#07111f] px-5 py-10 text-white lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:px-16">
    <div className="pointer-events-none absolute -left-32 top-10 h-96 w-96 rounded-full bg-blue-600/25 blur-3xl" />
    <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl" />
    <section className="relative mx-auto max-w-3xl">
      <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-200"><Sparkles size={15} /> Ambiente educacional privado</div>
      <h1 className="mt-7 text-5xl font-black leading-[.98] sm:text-7xl">Aprendizagem com acesso responsável.</h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">O AISTUDYTEC é um laboratório de aprendizagem assistida por IA. Nesta fase, somente alunos e professores previamente autorizados podem entrar.</p>
      {error && <p role="alert" className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4 text-rose-100">{error}</p>}
      <Button size="lg" className="mt-8 bg-cyan-300 text-slate-950 hover:bg-cyan-200" onClick={onOpenLogin}><Lock size={20} /> Entrar com acesso autorizado</Button>
      <p className="mt-3 text-sm text-slate-400">Use exatamente o e-mail Google liberado pelo administrador.</p>
    </section>
    <section className="relative mx-auto mt-12 grid w-full max-w-xl gap-4 lg:mt-0">
      <article className="rounded-3xl border border-white/10 bg-white/[0.07] p-6 backdrop-blur"><ShieldCheck className="text-lime-300" /><h2 className="mt-4 text-xl font-black">Identidade verificada</h2><p className="mt-2 text-slate-300">Cadastro fechado, autenticação Google, perfis por função e ações administrativas com MFA.</p></article>
      <article className="ml-8 rounded-3xl border border-white/10 bg-gradient-to-br from-blue-500/20 to-violet-500/20 p-6 backdrop-blur sm:ml-20"><BookOpenCheck className="text-cyan-300" /><h2 className="mt-4 text-xl font-black">Ambiente protegido para aprender</h2><p className="mt-2 text-slate-300">Conteúdo, progresso e gestão ficam disponíveis somente após a autorização.</p></article>
    </section>
  </main>
);

export default PrivateAccessPortal;
