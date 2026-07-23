import React, { useEffect, useState } from 'react';
import { ArrowLeft, Youtube, CheckCircle2, RefreshCw, Send, Trash2, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, ErrorState, Skeleton } from '../../design-system';
import {
  deleteTopicQuestion,
  buildTopicGate,
  generateTopicContent,
  getTopicReview,
  publishTopic,
  saveTopicExplanation,
  saveTopicQuestion,
  setVideoApproval,
} from '../../features/topics/topicReviewService';

const LEVELS = [
  { key: 'simple', label: 'Simples' },
  { key: 'technical', label: 'Técnico' },
  { key: 'advanced', label: 'Avançado' },
];

const TopicReview = ({ topicId, onBack, addToast }) => {
  const [topic, setTopic] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [pendingSaves, setPendingSaves] = useState(0);
  const [loadState, setLoadState] = useState('loading');
  const [confirmation, setConfirmation] = useState(null);

  const load = () => {
    setLoadState('loading');
    getTopicReview(topicId).then(data => { setTopic(data); setLoadState('ready'); }).catch(e => { setLoadState('error'); addToast(e.message, 'error'); });
  };

  useEffect(() => { load(); }, [topicId]);

  const persist = async (operation) => {
    setPendingSaves(count => count + 1);
    setSaveStatus('saving');
    try {
      await operation();
      setSaveStatus('saved');
    } catch (e) {
      setSaveStatus('error');
      addToast(e.message, 'error');
      throw e;
    } finally {
      setPendingSaves(count => Math.max(0, count - 1));
    }
  };

  const saveExplanation = (level, content) => persist(() => saveTopicExplanation({ topicId, level, content }));

  const saveQuestion = async (qid, patch) => {
    try { await persist(() => saveTopicQuestion({ questionId: qid, patch })); } catch (_) { /* toast em persist */ }
  };

  const removeQuestion = async (qid) => {
    setBusy(true);
    try { await deleteTopicQuestion(qid); setConfirmation(null); addToast('Questão excluída', 'success'); load(); } catch (e) { addToast(e.message, 'error'); } finally { setBusy(false); }
  };

  const approveVideo = async (video) => {
    try { await setVideoApproval({ videoId: video.id, approved: !video.approved }); load(); } catch (e) { addToast(e.message, 'error'); }
  };

  const regenerate = async (part) => {
    setBusy(true);
    try {
      await generateTopicContent({ topicId, part });
      addToast('Material gerado. Revise tudo antes de publicar.', 'success');
      load();
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    setBusy(true);
    try {
      await publishTopic(topicId);
      setConfirmation(null);
      addToast('Tópico publicado para a turma!', 'success');
      load();
    } catch (e) {
      addToast(e.missing ? `Faltando: ${e.missing.join(', ')}` : e.message, 'error');
    } finally { setBusy(false); }
  };

  if (loadState === 'loading') return <Skeleton lines={6} label="Carregando revisão do tópico" />;
  if (loadState === 'error') return <ErrorState title="Não foi possível carregar a revisão" onRetry={load} />;
  if (!topic) return null;
  const gate = buildTopicGate(topic);
  const gateReady = gate.every(item => item.ready);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Button onClick={onBack} variant="ghost" size="sm"><ArrowLeft size={18} /> Voltar</Button>
        <div className="flex gap-2 items-center">
          <Badge tone={topic.status === 'published' ? 'success' : 'neutral'}>{topic.status}</Badge>
          <Button onClick={() => setConfirmation({ type: 'publish' })} disabled={busy || topic.status === 'published'} size="sm"><Send size={16} /> {topic.status === 'published' ? 'Publicado' : 'Publicar'}</Button>
        </div>
      </div>

      <div className="min-h-6 flex justify-end" role="status" aria-live="polite">
        {(saveStatus === 'saving' || pendingSaves > 0) && (
          <span className="inline-flex items-center gap-2 text-sm text-slate-500"><Loader2 size={15} className="animate-spin" /> Salvando alterações...</span>
        )}
        {saveStatus === 'saved' && pendingSaves === 0 && (
          <span className="inline-flex items-center gap-2 text-sm text-green-700"><CheckCircle2 size={15} /> Alterações salvas</span>
        )}
        {saveStatus === 'error' && pendingSaves === 0 && (
          <span className="inline-flex items-center gap-2 text-sm text-red-700"><AlertCircle size={15} /> Não foi possível salvar</span>
        )}
      </div>

      <h2 className="text-2xl font-bold">{topic.title}</h2>

      <Card as="section" className={gateReady ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/40'}>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Gate de publicação</p><h3 className="mt-1 text-xl font-black text-slate-900">{gateReady ? 'Material pronto para decisão docente' : 'Curadoria ainda necessária'}</h3></div>
          <Badge tone={gateReady ? 'success' : 'warning'}>{gate.filter(item => item.ready).length}/{gate.length} critérios</Badge>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {gate.map(item => <div key={item.key} className="flex items-start gap-3 rounded-xl bg-white p-3 shadow-sm">
            {item.ready ? <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={19} /> : <AlertCircle className="mt-0.5 shrink-0 text-amber-600" size={19} />}
            <span className="text-sm font-semibold text-slate-700">{item.label}</span>
          </div>)}
        </div>
      </Card>

      <Card as="section">
        <div className="mb-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Transparência acadêmica</p><h3 className="mt-1 text-xl font-black text-slate-900">Fontes consultadas pela pesquisa fundamentada</h3><p className="mt-1 text-sm text-slate-500">Abra e confira as fontes antes de aprovar o material.</p></div>
        {topic.sources.length ? <div className="grid gap-3 sm:grid-cols-2">{topic.sources.map(source =>
          <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:bg-blue-50/40">
            <div className="min-w-0"><p className="line-clamp-2 font-bold text-slate-900">{source.title}</p><p className="mt-1 text-xs text-slate-500">{source.domain}</p></div><ExternalLink size={17} className="shrink-0 text-blue-600" />
          </a>)}</div> : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Nenhuma fonte fundamentada foi registrada para esta versão.</p>}
      </Card>

      <Card as="section">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-700">Explicações</h3>
          <button onClick={() => regenerate('explanations')} disabled={busy} className="flex items-center gap-2 text-xs font-bold text-slate-500"><RefreshCw size={14} /> Regerar</button>
        </div>
        <div className="grid gap-4">
          {LEVELS.map(l => (
            <div key={l.key}>
              <label className="text-xs font-bold text-slate-400 uppercase">{l.label}</label>
              <textarea
                aria-label={`Explicação ${l.label}`}
                className="w-full p-3 border rounded-lg mt-1 text-sm"
                rows={4}
                defaultValue={topic.explanations?.[l.key] || ''}
                onBlur={e => saveExplanation(l.key, e.target.value).catch(() => {})}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card as="section">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-700">Questões ({topic.questions.length})</h3>
          <button onClick={() => regenerate('questions')} disabled={busy} className="flex items-center gap-2 text-xs font-bold text-slate-500"><RefreshCw size={14} /> Regerar</button>
        </div>
        <div className="space-y-4">
          {topic.questions.map(q => (
            <div key={q.id} className="border rounded-xl p-4">
              <div className="flex justify-between gap-2">
                <textarea aria-label="Enunciado da questão" className="flex-1 p-2 border rounded mb-2 text-sm font-medium" defaultValue={q.question} onBlur={e => saveQuestion(q.id, { question: e.target.value })} />
                <button aria-label="Excluir questão" onClick={() => setConfirmation({ type: 'delete-question', questionId: q.id })} className="self-start rounded-lg p-2 text-red-500 hover:bg-red-50 hover:text-red-700"><Trash2 size={16} /></button>
              </div>
              <div className="grid md:grid-cols-2 gap-2 mb-2">
                {q.options.map((opt, i) => (
                  <input key={i} aria-label={`Alternativa ${i + 1}`} className="p-2 border rounded text-sm" defaultValue={opt}
                    onBlur={e => { const opts = [...q.options]; opts[i] = e.target.value; saveQuestion(q.id, { options: opts }); }} />
                ))}
              </div>
              <div className="flex flex-wrap gap-2 items-center text-sm">
                <span className="text-slate-400">Resposta certa</span>
                <input aria-label="Resposta certa" className="w-14 p-1 border rounded text-center font-bold" defaultValue={q.correct_option} onBlur={e => saveQuestion(q.id, { correctOption: e.target.value.toUpperCase() })} />
                <span className="text-slate-400 ml-4">Habilidade</span>
                <input aria-label="Habilidade" className="flex-1 min-w-[180px] p-1 border rounded" defaultValue={q.skill} onBlur={e => saveQuestion(q.id, { skill: e.target.value })} />
                <select aria-label="Dificuldade" className="p-1 border rounded" defaultValue={q.difficulty} onChange={e => saveQuestion(q.id, { difficulty: e.target.value })}>
                  <option value="facil">Fácil</option>
                  <option value="medio">Médio</option>
                  <option value="dificil">Difícil</option>
                </select>
              </div>
              <textarea aria-label="Explicação do feedback" className="w-full p-2 border rounded mt-2 text-xs text-slate-500" placeholder="Explicação do feedback" defaultValue={q.explanation || ''} onBlur={e => saveQuestion(q.id, { explanation: e.target.value })} />
            </div>
          ))}
        </div>
      </Card>

      <Card as="section">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-700">Vídeos sugeridos</h3>
          <button onClick={() => regenerate('videos')} disabled={busy} className="flex items-center gap-2 text-xs font-bold text-slate-500"><RefreshCw size={14} /> Regerar</button>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {LEVELS.map(l => (
            <div key={l.key}>
              <p className="text-xs font-bold text-slate-400 uppercase mb-2">{l.label}</p>
              <div className="space-y-2">
                {(topic.videos?.[l.key] || []).map(v => (
                  <button key={v.id} onClick={() => approveVideo(v)} className={`w-full text-left p-2 border rounded-lg flex items-center gap-2 ${v.approved ? 'border-green-500 bg-green-50' : ''}`}>
                    <Youtube className="text-red-500 shrink-0" size={18} />
                    <span className="text-xs line-clamp-2 flex-1">{v.title}</span>
                    {v.approved && <CheckCircle2 className="text-green-500 shrink-0" size={16} />}
                  </button>
                ))}
                {(!topic.videos?.[l.key] || topic.videos[l.key].length === 0) && <p className="text-xs text-slate-300">Nenhum candidato</p>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <ConfirmDialog open={confirmation?.type === 'publish'} title="Publicar tópico?" description="O conteúdo ficará disponível para toda a turma. Confirme que explicações, questões e vídeos foram revisados." confirmLabel="Publicar para a turma" tone="primary" busy={busy} onConfirm={publish} onCancel={() => setConfirmation(null)} />
      <ConfirmDialog open={confirmation?.type === 'delete-question'} title="Excluir esta questão?" description="Esta ação remove a questão do tópico e não pode ser desfeita." confirmLabel="Excluir questão" busy={busy} onConfirm={() => removeQuestion(confirmation.questionId)} onCancel={() => setConfirmation(null)} />
    </div>
  );
};

export default TopicReview;
