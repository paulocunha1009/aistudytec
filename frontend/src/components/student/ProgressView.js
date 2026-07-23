import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, Clock3, History, Map, RefreshCw, Sparkles, Target } from 'lucide-react';
import { Badge, Button, Card, EmptyState, ErrorState, Progress, Skeleton } from '../../design-system';
import { buildProgressModel, STAGE_META } from '../../features/progress/progressModel';
import { loadStudentProgress, openProgressTopic } from '../../features/progress/progressService';

const ProgressView = ({ currentUser, onOpenTopic, onExplore }) => {
  const [mastery, setMastery] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [history, setHistory] = useState([]);
  const [loadState, setLoadState] = useState('loading');
  const [openingId, setOpeningId] = useState(null);
  const studentId = currentUser?.data?.id;

  const load = () => {
    setLoadState('loading');
    loadStudentProgress(studentId).then(data => {
      setMastery(data.mastery);
      setReviews(data.reviews);
      setHistory(data.history);
      setLoadState('ready');
    }).catch(() => setLoadState('error'));
  };

  useEffect(load, [studentId]);
  const model = useMemo(() => buildProgressModel({ mastery, reviews, history }), [mastery, reviews, history]);

  const openPlanItem = async (item) => {
    if (!item.topicId) { onExplore(); return; }
    setOpeningId(item.id);
    try { onOpenTopic(await openProgressTopic(item.topicId)); }
    finally { setOpeningId(null); }
  };

  if (loadState === 'loading') return <Skeleton lines={7} label="Carregando seu progresso" className="mx-auto max-w-5xl pt-8" />;
  if (loadState === 'error') return <ErrorState title="Não foi possível carregar seu progresso" onRetry={load} className="mx-auto max-w-xl" />;

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-10">
      <header className="relative overflow-hidden rounded-[2rem] bg-[#07111f] p-6 text-white shadow-xl sm:p-8">
        <div className="home-grid pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div><p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Sua jornada agora</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Olá, {currentUser.data.name}</h1><p className="mt-2 max-w-xl text-slate-300">Seu plano usa apenas tentativas, habilidades e revisões já registradas.</p></div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/[0.07] px-4 py-3"><strong className="block text-2xl text-cyan-300">{model.summary.consistent}</strong><span className="text-xs text-slate-400">consistentes</span></div>
            <div className="rounded-2xl bg-white/[0.07] px-4 py-3"><strong className="block text-2xl text-lime-300">{model.summary.attempts}</strong><span className="text-xs text-slate-400">tentativas</span></div>
            <div className="rounded-2xl bg-white/[0.07] px-4 py-3"><strong className="block text-2xl text-amber-300">{model.summary.dueReviews}</strong><span className="text-xs text-slate-400">revisões</span></div>
          </div>
        </div>
      </header>

      <section aria-labelledby="today-title">
        <div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Próximo passo</p><h2 id="today-title" className="mt-1 text-2xl font-black text-slate-900">Plano de hoje</h2></div><CalendarDays className="text-blue-500" aria-hidden="true" /></div>
        {model.plan.length ? <div className="grid gap-4 md:grid-cols-2">{model.plan.map((item, index) => (
          <Card key={item.id} className={`relative overflow-hidden border-0 shadow-lg ${index === 0 ? 'bg-blue-600 text-white' : ''}`}>
            <div className="flex items-start justify-between gap-4"><span className={`grid h-11 w-11 place-items-center rounded-2xl ${index === 0 ? 'bg-white/15' : 'bg-blue-50 text-blue-600'}`}>{item.kind === 'review' ? <RefreshCw size={20} /> : <BookOpen size={20} />}</span>{item.dueDate && <Badge tone={index === 0 ? 'warning' : 'neutral'}>Venceu em {item.dueDate.split('-').reverse().join('/')}</Badge>}</div>
            <h3 className="mt-5 text-xl font-black">{item.title}</h3><p className={`mt-1 text-sm ${index === 0 ? 'text-blue-100' : 'text-slate-500'}`}>{item.context}</p>
            <Button variant={index === 0 ? 'secondary' : 'primary'} className="mt-5 w-full" loading={openingId === item.id} onClick={() => openPlanItem(item)}>Começar agora <ArrowRight size={17} /></Button>
          </Card>
        ))}</div> : <EmptyState title="Nenhuma revisão vencida" description="Explore um novo tema ou aguarde o próximo item programado." action={<Button onClick={onExplore}>Explorar conteúdo</Button>} />}
      </section>

      <section aria-labelledby="skills-title">
        <div className="mb-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Evidências acumuladas</p><h2 id="skills-title" className="mt-1 flex items-center gap-2 text-2xl font-black"><Map className="text-violet-500" /> Mapa de habilidades</h2></div>
        {model.skills.length ? <div className="grid gap-4 md:grid-cols-2">{model.skills.map(skill => {
          const stage = STAGE_META[skill.stage];
          return <Card key={skill.id} className="border-0 shadow-[0_12px_35px_rgba(15,23,42,.07)]"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-slate-900">{skill.skill}</h3><p className="mt-1 text-xs text-slate-500">{skill.correct_count} acertos em {skill.total_count} respostas</p></div><Badge tone={stage.tone}>{stage.label}</Badge></div><Progress value={skill.mastery_pct} label="Evidência de domínio" className="mt-5" /><p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><Clock3 size={14} /> Última prática: {skill.last_practiced_at ? new Date(skill.last_practiced_at).toLocaleDateString('pt-BR') : 'não registrada'}</p></Card>;
        })}</div> : <EmptyState title="Nenhuma habilidade medida" description="As habilidades aparecem após respostas identificadas em quizzes." />}
      </section>

      <section aria-labelledby="history-title">
        <div className="mb-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-teal-600">Trajetória verificável</p><h2 id="history-title" className="mt-1 flex items-center gap-2 text-2xl font-black"><History className="text-teal-500" /> Linha do tempo</h2></div>
        {model.timeline.length ? <Card className="divide-y p-0">{model.timeline.slice(0, 8).map(item => <div key={item.id} className="flex items-center gap-4 p-5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-700"><CheckCircle2 size={19} /></span><div className="min-w-0 flex-1"><p className="truncate font-bold text-slate-900">{item.theme || 'Quiz concluído'}</p><p className="text-xs text-slate-500">{item.date} · {item.score}/{item.total} respostas corretas</p></div><strong className="text-lg text-teal-700">{item.percentage}%</strong></div>)}</Card> : <EmptyState title="Nenhuma tentativa registrada" description="Sua linha do tempo será construída a partir dos quizzes concluídos." />}
      </section>

      <Card className="flex flex-col items-start justify-between gap-4 border-blue-100 bg-blue-50 sm:flex-row sm:items-center"><div className="flex gap-3"><Target className="shrink-0 text-blue-600" /><div><h2 className="font-black text-blue-950">Como o mapa funciona</h2><p className="mt-1 text-sm text-blue-800">Consistente significa 70% ou mais. Uma revisão vencida muda a prioridade para “Revisar”. Nenhum nível é estimado sem respostas.</p></div></div><Sparkles className="hidden shrink-0 text-blue-400 sm:block" /></Card>
    </div>
  );
};

export default ProgressView;
