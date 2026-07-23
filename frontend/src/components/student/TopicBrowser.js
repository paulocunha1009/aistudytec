import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Layers, Loader2, Search, ShieldCheck, Sparkles, Star, Zap } from 'lucide-react';
import { Badge, Card, Input } from '../../design-system';
import { getPublishedTopic, listStudentPublishedTopics } from '../../features/student/studentTopicService';

const GRADE_LABEL = { '1': '1º ano', '2': '2º ano', '3': '3º ano', any: 'Qualquer ano' };

const TopicBrowser = ({ onSelectTopic, addToast }) => {
  const [topics, setTopics] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    listStudentPublishedTopics().then(setTopics)
      .catch(error => addToast(error.message, 'error'))
      .finally(() => setLoading(false));
  }, [addToast]);

  const displayedTopics = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    return normalized
      ? topics.filter(topic => topic.title.toLocaleLowerCase('pt-BR').includes(normalized))
      : topics;
  }, [query, topics]);

  const openTopic = async topicId => {
    setLoading(true);
    try {
      onSelectTopic(await getPublishedTopic(topicId));
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-10">
      <section className="relative isolate overflow-hidden rounded-[2rem] bg-[#081525] px-5 py-8 text-white shadow-2xl shadow-blue-950/15 sm:px-8 sm:py-10 lg:grid lg:min-h-[410px] lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:px-12">
        <div className="home-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="pointer-events-none absolute -left-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-blue-600/25 blur-3xl" />
        <div className="relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">
            <Zap size={14} fill="currentColor" /> Seu laboratório de aprendizagem
          </div>
          <h1 className="max-w-2xl text-4xl font-black leading-[0.98] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
            Transforme curiosidade em <span className="hero-gradient-text">domínio.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">Explore materiais publicados pelo professor, investigue evidências e teste o que aprendeu com segurança.</p>
          <div className="mt-7 flex flex-wrap gap-2 text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-2 rounded-full bg-white/[0.07] px-3 py-2"><Layers size={15} className="text-cyan-300" /> 3 níveis de profundidade</span>
            <span className="flex items-center gap-2 rounded-full bg-white/[0.07] px-3 py-2"><ShieldCheck size={15} className="text-lime-300" /> Curadoria docente</span>
          </div>
        </div>
        <div className="relative z-10 mx-auto mt-10 hidden h-72 w-72 place-items-center lg:grid" aria-hidden="true">
          <div className="knowledge-orbit knowledge-orbit--outer"><span className="orbit-dot orbit-dot--lime" /></div>
          <div className="knowledge-orbit knowledge-orbit--inner"><span className="orbit-dot orbit-dot--cyan" /></div>
          <div className="grid h-36 w-36 place-items-center rounded-full border border-white/15 bg-gradient-to-br from-blue-500/30 to-violet-500/20 shadow-[0_0_80px_rgba(56,189,248,.22)] backdrop-blur">
            <div className="text-center"><Sparkles className="mx-auto text-cyan-200" size={32} /><span className="mt-2 block text-xs font-black uppercase tracking-[0.2em]">Ideia em órbita</span></div>
          </div>
        </div>
      </section>

      <section className="relative z-20 -mt-16 px-2 sm:px-6 lg:-mt-20 lg:px-16">
        <Card className="command-card p-4">
          <div className="mb-3 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-600 text-white"><Search size={16} /></span><div><h2 className="font-black text-slate-900">O que você quer estudar hoje?</h2><p className="text-xs text-slate-500">Pesquise entre os materiais publicados pelo professor.</p></div></div>
          <Input label="Buscar material" placeholder="Ex.: hardware, segurança digital..." value={query} onChange={event => setQuery(event.target.value)} />
          <p className="mt-3 flex items-start gap-2 text-xs text-slate-500"><ShieldCheck size={15} className="shrink-0 text-emerald-600" /> Somente materiais revisados e publicados aparecem para o aluno.</p>
        </Card>
      </section>

      <section className="px-2 sm:px-0">
        <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Trilha da turma</p><h2 className="mt-1 flex items-center gap-2 text-2xl font-black text-slate-900"><Star size={20} className="text-amber-500" /> Escolhidos pelo professor</h2></div>{loading && <Loader2 className="animate-spin text-blue-600" />}</div>
        {!loading && displayedTopics.length === 0 ? <Card className="text-center text-sm text-slate-500">Nenhum material publicado corresponde à busca.</Card> : <div className="grid gap-4 md:grid-cols-2">
          {displayedTopics.map(topic => <Card as="button" key={topic.id} onClick={() => openTopic(topic.id)} className="group relative flex min-h-36 w-full items-end justify-between overflow-hidden border-0 bg-white text-left shadow-[0_12px_40px_rgba(15,23,42,.08)] transition hover:-translate-y-1">
            <div className="absolute left-0 top-0 h-1.5 w-full bg-gradient-to-r from-blue-600 via-cyan-400 to-lime-300" />
            <div><div className="flex flex-wrap gap-2"><Badge tone="info">{GRADE_LABEL[topic.target_grade]}</Badge><Badge>{topic.className}</Badge></div><p className="mt-3 text-lg font-black text-slate-900">{topic.title}</p><p className="mt-1 text-xs text-slate-500">Versão {topic.version} · publicação docente</p></div>
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-white group-hover:bg-blue-600"><ArrowUpRight size={20} /></span>
          </Card>)}
        </div>}
      </section>
    </div>
  );
};

export default TopicBrowser;
