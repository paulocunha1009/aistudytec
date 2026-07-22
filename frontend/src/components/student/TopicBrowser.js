import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Search, Star, Loader2, ArrowUpRight, ShieldCheck, Zap, Layers } from 'lucide-react';
import { api } from '../../api/client';
import { Badge, Button, Card, Input, Skeleton } from '../../design-system';

const GRADE_LABEL = { '1': '1º ano', '2': '2º ano', '3': '3º ano', any: 'Qualquer ano' };
const PENDING_JOB_KEY = 'aistudytec:pending-generation-job';

const newIdempotencyKey = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `job-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const TopicBrowser = ({ apiUrl, currentUser, onSelectTopic, addToast }) => {
  const [suggested, setSuggested] = useState([]);
  const [freeText, setFreeText] = useState('');
  const [loading, setLoading] = useState(false);
  const [jobStatus, setJobStatus] = useState(null);
  const mountedRef = useRef(true);
  const classId = currentUser?.data?.classId;
  const studentId = currentUser?.type === 'student' ? currentUser.data.id : null;

  useEffect(() => {
    if (!classId) { setSuggested([]); return; }
    api.listTopics(apiUrl, { classId, status: 'published' }).then(setSuggested).catch(() => {});
  }, [apiUrl, classId]);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const finishJob = async (jobId) => {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const job = await api.generationJob(apiUrl, jobId);
      if (!mountedRef.current) return;
      setJobStatus(job.status);
      if (job.status === 'completed') {
        localStorage.removeItem(PENDING_JOB_KEY);
        const detail = await api.getTopic(apiUrl, job.topicId);
        if (mountedRef.current) onSelectTopic(detail);
        return;
      }
      if (job.status === 'failed') {
        localStorage.removeItem(PENDING_JOB_KEY);
        throw new Error(job.error?.message || 'Não foi possível gerar a trilha.');
      }
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    throw new Error('A geração continua em andamento. Atualize a página para retomar o acompanhamento.');
  };

  useEffect(() => {
    const pendingJobId = localStorage.getItem(PENDING_JOB_KEY);
    if (!pendingJobId) return;
    setLoading(true);
    setJobStatus('queued');
    finishJob(pendingJobId).catch(error => addToast(error.message, 'error')).finally(() => {
      if (mountedRef.current) setLoading(false);
    });
  }, []);

  const openTopic = async (topicId) => {
    setLoading(true);
    try {
      const detail = await api.getTopic(apiUrl, topicId);
      onSelectTopic(detail);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFreeText = async () => {
    if (!freeText.trim()) return;
    setLoading(true);
    setJobStatus('queued');
    try {
      const job = await api.createGenerationJob(
        apiUrl,
        { operation: 'freetext', title: freeText, studentId, classId },
        newIdempotencyKey()
      );
      localStorage.setItem(PENDING_JOB_KEY, job.id);
      await finishJob(job.id);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      if (mountedRef.current) { setLoading(false); setJobStatus(null); }
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
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">Explore um assunto por diferentes níveis, teste o que entendeu e descubra o próximo passo — com o professor no controle.</p>
          <div className="mt-7 flex flex-wrap gap-2 text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-2 rounded-full bg-white/[0.07] px-3 py-2"><Layers size={15} className="text-cyan-300" /> 3 níveis de explicação</span>
            <span className="flex items-center gap-2 rounded-full bg-white/[0.07] px-3 py-2"><ShieldCheck size={15} className="text-lime-300" /> Curadoria docente</span>
          </div>
        </div>

        <div className="relative z-10 mx-auto mt-10 hidden h-72 w-72 place-items-center lg:grid" aria-hidden="true">
          <div className="knowledge-orbit knowledge-orbit--outer"><span className="orbit-dot orbit-dot--lime" /></div>
          <div className="knowledge-orbit knowledge-orbit--inner"><span className="orbit-dot orbit-dot--cyan" /></div>
          <div className="grid h-36 w-36 place-items-center rounded-full border border-white/15 bg-gradient-to-br from-blue-500/30 to-violet-500/20 shadow-[0_0_80px_rgba(56,189,248,.22)] backdrop-blur">
            <div className="text-center"><Sparkles className="mx-auto text-cyan-200" size={32} /><span className="mt-2 block text-xs font-black uppercase tracking-[0.2em] text-white">Ideia em órbita</span></div>
          </div>
          <span className="absolute left-0 top-10 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-bold text-cyan-100 backdrop-blur">Entender</span>
          <span className="absolute -right-4 bottom-12 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-bold text-lime-100 backdrop-blur">Praticar</span>
        </div>
      </section>

      <section className="relative z-20 -mt-16 px-2 sm:px-6 lg:-mt-20 lg:px-16">
        <Card as="form" className="command-card p-3 sm:p-4" onSubmit={e => { e.preventDefault(); handleFreeText(); }}>
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-600 text-white"><Search size={16} /></span><div><h2 className="font-black text-slate-900">O que você quer dominar hoje?</h2><p className="text-xs text-slate-500">Digite uma matéria, conceito ou dúvida.</p></div></div>
            <span className="hidden rounded-full bg-lime-100 px-3 py-1 text-xs font-bold text-lime-800 sm:block">IA assistiva</span>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-end">
            <Input label="Tema de estudo" className="flex-1" placeholder="Ex.: Por que o céu muda de cor?" value={freeText} onChange={e => setFreeText(e.target.value)} />
            <Button type="submit" loading={loading} size="lg" className="group shrink-0 bg-[#0b6bff] sm:min-w-36">
              {loading ? <Loader2 className="animate-spin" size={18} /> : <>Explorar <ArrowUpRight className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" size={18} /></>}
            </Button>
          </div>
          <p className="mt-3 flex items-start gap-2 px-1 text-xs leading-relaxed text-slate-500"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-amber-600" /> Temas livres são gerados por IA e aparecem claramente como conteúdo ainda não revisado pelo professor.</p>
        </Card>
        {loading && <div className="mx-4 mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4" role="status">
          <div className="flex items-center gap-3"><Loader2 className="animate-spin text-blue-600" size={20} /><div><p className="font-bold text-slate-800">{jobStatus === 'running' ? 'Construindo sua trilha imersiva…' : 'Sua geração entrou na fila…'}</p><p className="text-xs text-slate-600">Você pode atualizar a página: o acompanhamento será retomado sem criar outro tema.</p></div></div>
          <Skeleton lines={2} label="Gerando conteúdo de aprendizagem" className="mt-3" />
        </div>}
      </section>

      {suggested.length > 0 && (
        <section className="px-2 sm:px-0">
          <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Trilha da turma</p><h2 className="mt-1 flex items-center gap-2 text-2xl font-black tracking-tight text-slate-900"><Star size={20} className="text-amber-500" /> Escolhidos pelo professor</h2></div><p className="hidden max-w-xs text-right text-sm text-slate-500 sm:block">Conteúdos revisados e prontos para aprofundar.</p></div>
          <div className="grid gap-4 md:grid-cols-2">
            {suggested.map(t => (
              <Card as="button" key={t.id} onClick={() => openTopic(t.id)} className="group relative flex min-h-36 w-full items-end justify-between overflow-hidden border-0 bg-white text-left shadow-[0_12px_40px_rgba(15,23,42,.08)] transition hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(37,99,235,.14)]">
                <div className="absolute left-0 top-0 h-1.5 w-full bg-gradient-to-r from-blue-600 via-cyan-400 to-lime-300" />
                <div className="relative">
                  <Badge tone="info">{GRADE_LABEL[t.target_grade] || 'Qualquer ano'}</Badge>
                  <p className="mt-3 text-lg font-black text-slate-900">{t.title}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">Conteúdo oficial da sua turma</p>
                </div>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-950 text-white transition group-hover:rotate-6 group-hover:bg-blue-600"><ArrowUpRight size={20} /></span>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default TopicBrowser;
