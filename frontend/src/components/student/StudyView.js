import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, BookOpen, CheckCircle2, Circle, Compass, Eye, FlaskConical,
  ExternalLink, Info, Lightbulb, MessageCircle, PenLine, Play, RotateCcw, Search, Target, Youtube,
} from 'lucide-react';
import { Badge, Button, Card, EmptyState, Progress } from '../../design-system';

const LEVELS = [
  { key: 'simple', label: 'Descobrir', subtitle: 'Construa a base' },
  { key: 'technical', label: 'Aprofundar', subtitle: 'Domine a linguagem' },
  { key: 'advanced', label: 'Conectar', subtitle: 'Analise e aplique' },
];

const StepCard = ({ icon: Icon, eyebrow, title, tone = 'blue', children }) => {
  const tones = {
    blue: 'border-blue-100 bg-blue-50/70 text-blue-700',
    cyan: 'border-cyan-100 bg-cyan-50/70 text-cyan-700',
    lime: 'border-lime-200 bg-lime-50/70 text-lime-800',
    violet: 'border-violet-100 bg-violet-50/70 text-violet-700',
    amber: 'border-amber-100 bg-amber-50/70 text-amber-800',
  };
  return (
    <section className={`rounded-2xl border p-5 sm:p-6 ${tones[tone]}`}>
      <div className="mb-4 flex items-start gap-3">
        <span className="rounded-xl bg-white p-2 shadow-sm"><Icon size={20} /></span>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">{eyebrow}</p>
          <h3 className="mt-1 text-lg font-black text-slate-900">{title}</h3>
        </div>
      </div>
      <div className="text-sm leading-relaxed text-slate-700 sm:text-base">{children}</div>
    </section>
  );
};

const StudyView = ({ topic, onStartQuiz, onBack }) => {
  const [level, setLevel] = useState('simple');
  const [completed, setCompleted] = useState({});
  const noteKey = `aistudytec:journal:${topic.id || topic.title}:${level}`;
  const [note, setNote] = useState('');
  const path = topic.learningPaths?.[level];
  const videos = topic.videos?.[level] || [];
  const video = videos.find(v => v.approved) || videos[0];

  useEffect(() => {
    try { setNote(localStorage.getItem(noteKey) || ''); } catch (_) { setNote(''); }
  }, [noteKey]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try { localStorage.setItem(noteKey, note); } catch (_) { /* armazenamento indisponível */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [note, noteKey]);

  const tasks = useMemo(() => path ? [
    { key: 'read', label: 'Li e destaquei as ideias essenciais' },
    { key: 'research', label: 'Comparei duas fontes na investigação' },
    { key: 'watch', label: 'Assisti com uma missão e fiz anotações' },
    { key: 'create', label: 'Produzi a evidência do desafio prático' },
    { key: 'reflect', label: 'Registrei minha conclusão no diário' },
  ] : [], [path]);
  const levelCompleted = completed[level] || {};
  const completedCount = tasks.filter(task => levelCompleted[task.key]).length;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
  const toggleTask = key => setCompleted(current => ({
    ...current,
    [level]: { ...(current[level] || {}), [key]: !(current[level] || {})[key] },
  }));

  return (
    <div className="mx-auto max-w-5xl">
      <Card className="overflow-hidden shadow-xl">
        <header className="relative overflow-hidden bg-slate-950 px-5 py-7 text-white sm:px-9 sm:py-9">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-cyan-300">Laboratório de aprendizagem</p>
              <h2 className="max-w-3xl break-words text-3xl font-black capitalize sm:text-4xl">{topic.title}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">Explore, investigue, assista com intenção, produza algo e explique o que descobriu.</p>
            </div>
            <Button onClick={onBack} variant="ghost" size="sm" aria-label="Voltar aos tópicos" className="shrink-0 px-2 text-white hover:bg-white/10"><RotateCcw /></Button>
          </div>
        </header>

        <div className="p-5 sm:p-8">
          {topic.origin === 'student' && (
            <div role="note" className="mb-6 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <Info size={14} className="mt-0.5 shrink-0" /> Conteúdo gerado por IA e ainda não revisado pelo professor. Compare informações importantes com fontes confiáveis.
            </div>
          )}

          <div className="mb-8 grid gap-2 sm:grid-cols-3" role="tablist" aria-label="Trilha de profundidade">
            {LEVELS.map((item, index) => (
              <button key={item.key} role="tab" aria-selected={level === item.key} onClick={() => setLevel(item.key)}
                className={`min-h-16 rounded-xl border px-4 py-3 text-left transition ${level === item.key ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-200' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200'}`}>
                <span className="block text-[10px] font-black uppercase tracking-widest opacity-70">Etapa {index + 1}</span>
                <span className="mt-0.5 block font-black">{item.label}</span>
                <span className="block text-xs opacity-80">{item.subtitle}</span>
              </button>
            ))}
          </div>

          {!path ? (
            <>
              {topic.explanations?.[level] ? <div className="prose mb-6 max-w-none"><p className="whitespace-pre-line text-base leading-relaxed text-slate-700 sm:text-lg">{topic.explanations[level]}</p></div> : <EmptyState className="mb-6" title="Explicação indisponível" description="Escolha outro nível ou tente novamente mais tarde." />}
              <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">Este tema foi criado antes da nova experiência imersiva. Gere-o novamente para receber a trilha completa.</div>
            </>
          ) : (
            <div className="space-y-5">
              <section className="rounded-2xl bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-700 p-6 text-white sm:p-8">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-200"><Compass size={18} /> Comece pela curiosidade</div>
                <p className="mt-4 text-xl font-black leading-snug sm:text-2xl">{path.hook}</p>
              </section>

              <StepCard icon={Target} eyebrow="Rota" title="O que você será capaz de fazer">
                <ul className="grid gap-3 sm:grid-cols-2">{path.objectives.map((item, index) => <li key={index} className="flex gap-2 rounded-xl bg-white/80 p-3"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-blue-600" /><span>{item}</span></li>)}</ul>
              </StepCard>

              <section className="rounded-2xl border border-slate-200 p-5 sm:p-7">
                <div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-slate-900 p-2 text-white"><BookOpen size={20} /></span><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Leitura guiada</p><h3 className="text-xl font-black text-slate-900">Entenda o conceito</h3></div></div>
                <p className="whitespace-pre-line text-base leading-8 text-slate-700 sm:text-lg">{topic.explanations?.[level]}</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">{path.keyIdeas.map((idea, index) => <div key={index} className="rounded-xl border border-slate-100 bg-slate-50 p-4"><span className="text-xs font-black text-blue-600">IDEIA {index + 1}</span><p className="mt-2 text-sm leading-relaxed text-slate-700">{idea}</p></div>)}</div>
              </section>

              <StepCard icon={Lightbulb} eyebrow="Conexão" title="Onde isso aparece no mundo real" tone="lime"><p>{path.realWorldConnection}</p></StepCard>

              <StepCard icon={Search} eyebrow="Investigue" title={path.guidedInvestigation.question} tone="cyan">
                <ol className="space-y-3">{path.guidedInvestigation.steps.map((step, index) => <li key={index} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-700 text-xs font-black text-white">{index + 1}</span><span>{step}</span></li>)}</ol>
                <div className="mt-5"><p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-500">Termos para começar</p><div className="flex flex-wrap gap-2">{path.guidedInvestigation.searchTerms.map(term => <a key={term} href={`https://www.google.com/search?q=${encodeURIComponent(term)}`} target="_blank" rel="noreferrer" className="rounded-full bg-white px-3 py-2 text-xs font-bold text-cyan-800 shadow-sm hover:ring-2 hover:ring-cyan-300">{term} ↗</a>)}</div></div>
              </StepCard>

              <StepCard icon={Eye} eyebrow="Assista com intenção" title="Sua missão no vídeo" tone="violet">
                <div className="grid gap-3 sm:grid-cols-3">{[['Antes', path.watchMission.before], ['Durante', path.watchMission.during], ['Depois', path.watchMission.after]].map(([label, text]) => <div key={label} className="rounded-xl bg-white/80 p-4"><p className="text-xs font-black uppercase tracking-widest text-violet-600">{label}</p><p className="mt-2 text-sm">{text}</p></div>)}</div>
                {video && <a href={`https://www.youtube.com/watch?v=${video.youtube_video_id}`} target="_blank" rel="noreferrer" className="mt-5 flex flex-col items-start gap-4 rounded-xl border border-violet-100 bg-white p-4 hover:shadow-md sm:flex-row sm:items-center">{video.thumbnail_url && <img src={video.thumbnail_url} alt="" loading="lazy" className="aspect-video w-full rounded-lg object-cover sm:w-36" />}<div className="flex-1"><p className="font-black text-slate-800">{video.title}</p><Badge className="mt-2">{video.channel_title || 'YouTube'}</Badge></div><Youtube className="text-red-500" size={28} /></a>}
              </StepCard>

              <StepCard icon={FlaskConical} eyebrow="Mão na massa" title={path.handsOnChallenge.title} tone="amber"><p>{path.handsOnChallenge.instructions}</p><div className="mt-4 rounded-xl border border-amber-200 bg-white p-4"><p className="text-xs font-black uppercase tracking-widest text-amber-700">Sua entrega</p><p className="mt-1">{path.handsOnChallenge.deliverable}</p></div></StepCard>

              <section className="grid gap-5 lg:grid-cols-2">
                <StepCard icon={MessageCircle} eyebrow="Pense e converse" title="Defenda sua ideia">
                  <p className="font-bold text-slate-900">{path.discussionPrompt}</p><ul className="mt-4 space-y-2">{path.reflectionQuestions.map((question, index) => <li key={index} className="flex gap-2"><ArrowRight size={16} className="mt-1 shrink-0 text-blue-500" />{question}</li>)}</ul>
                </StepCard>
                <StepCard icon={PenLine} eyebrow="Metacognição" title="Meu diário de aprendizagem" tone="violet">
                  <label htmlFor="learning-journal" className="mb-2 block text-sm font-bold text-slate-700">O que mudou no seu entendimento? Que dúvida ainda ficou?</label>
                  <textarea id="learning-journal" value={note} onChange={event => setNote(event.target.value)} rows={7} placeholder="Escreva com suas palavras, cite uma evidência e formule uma nova pergunta..." className="w-full resize-y rounded-xl border border-violet-200 bg-white p-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-violet-400" />
                  <p className="mt-2 text-xs text-slate-500">Salvo automaticamente neste dispositivo.</p>
                </StepCard>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white sm:p-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Painel de autonomia</p><h3 className="mt-1 text-xl font-black">Você está pronto para testar o que aprendeu?</h3></div><span className="text-3xl font-black text-lime-300">{progress}%</span></div>
                <Progress value={progress} className="my-5" />
                <div className="grid gap-2 sm:grid-cols-2">{tasks.map(task => <button key={task.key} onClick={() => toggleTask(task.key)} className="flex items-start gap-2 rounded-xl bg-white/5 p-3 text-left text-sm hover:bg-white/10">{levelCompleted[task.key] ? <CheckCircle2 className="shrink-0 text-lime-300" size={19} /> : <Circle className="shrink-0 text-slate-500" size={19} />}<span>{task.label}</span></button>)}</div>
              </section>

              {topic.sources?.length > 0 && <section className="rounded-2xl border border-slate-200 p-5 sm:p-7">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Confira as evidências</p>
                <h3 className="mt-1 text-xl font-black text-slate-900">Fontes usadas neste material</h3>
                <p className="mt-1 text-sm text-slate-500">Leia mais de uma fonte, compare abordagens e registre o que sustenta sua conclusão.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">{topic.sources.map(source =>
                  <a key={source.id || source.url} href={source.url} target="_blank" rel="noreferrer" className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:bg-blue-50/50">
                    <div className="min-w-0"><p className="line-clamp-2 font-bold text-slate-900">{source.title}</p><p className="mt-1 text-xs text-slate-500">{source.domain}</p></div><ExternalLink size={17} className="shrink-0 text-blue-600" />
                  </a>)}</div>
              </section>}
            </div>
          )}

          <Button onClick={onStartQuiz} size="lg" className="mt-7 w-full bg-gradient-to-r from-blue-600 to-teal-600 shadow-lg hover:from-blue-700 hover:to-teal-700"><Play fill="currentColor" /> Testar meu entendimento</Button>
        </div>
      </Card>
    </div>
  );
};

export default StudyView;
