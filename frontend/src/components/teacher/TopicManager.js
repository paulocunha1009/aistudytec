import React, { useEffect, useState } from 'react';
import { Plus, Sparkles, Loader2 } from 'lucide-react';
import { api } from '../../api/client';
import { Badge, Button, Dialog, EmptyState, ErrorState, Input, Skeleton } from '../../design-system';

const GRADE_OPTIONS = [
  { value: 'any', label: 'Qualquer ano' },
  { value: '1', label: '1º ano' },
  { value: '2', label: '2º ano' },
  { value: '3', label: '3º ano' },
];

const STATUS_LABEL = { draft: 'Rascunho', generated: 'Gerado (revisar)', published: 'Publicado', archived: 'Arquivado' };
const STATUS_COLOR = { draft: 'bg-slate-100 text-slate-500', generated: 'bg-amber-100 text-amber-700', published: 'bg-green-100 text-green-700', archived: 'bg-slate-100 text-slate-400' };

const TopicManager = ({ apiUrl, currentUser, classId, onSelectTopic, addToast }) => {
  const [topics, setTopics] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', targetGrade: 'any' });
  const [generatingId, setGeneratingId] = useState(null);
  const [loadState, setLoadState] = useState('loading');

  const load = () => {
    setLoadState('loading');
    api.listTopics(apiUrl, { classId }).then(data => { setTopics(data); setLoadState('ready'); }).catch(() => setLoadState('error'));
  };

  useEffect(load, [apiUrl, classId]);

  const createTopic = async () => {
    if (!form.title.trim()) return;
    try {
      await api.createTopic(apiUrl, { ...form, classId, teacherId: currentUser?.data?.id });
      setShowModal(false);
      setForm({ title: '', targetGrade: 'any' });
      load();
    } catch (e) { addToast(e.message, 'error'); }
  };

  const generate = async (topicId) => {
    setGeneratingId(topicId);
    try {
      await api.generateTopic(apiUrl, topicId);
      addToast('Conteúdo gerado — revise antes de publicar', 'success');
      load();
    } catch (e) { addToast(e.message, 'error'); } finally { setGeneratingId(null); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-slate-700">Tópicos da turma</h3>
        <Button onClick={() => setShowModal(true)} size="sm"><Plus size={16} /> Novo tópico</Button>
      </div>

      <div className="grid gap-3">
        {loadState === 'loading' && <Skeleton label="Carregando tópicos" />}
        {loadState === 'error' && <ErrorState title="Não foi possível carregar os tópicos" onRetry={load} />}
        {loadState === 'ready' && topics.length === 0 && <EmptyState title="Nenhum tópico cadastrado" description="Crie um tópico para começar a curadoria do conteúdo." action={<Button size="sm" onClick={() => setShowModal(true)}>Criar tópico</Button>} />}
        {topics.map(t => (
          <div key={t.id} className="p-4 bg-white border rounded-xl flex items-center justify-between gap-3">
            <div className="cursor-pointer flex-1" onClick={() => onSelectTopic(t.id)}>
              <p className="font-bold text-slate-800">{t.title}</p>
              <Badge className={STATUS_COLOR[t.status]}>{STATUS_LABEL[t.status]}</Badge>
            </div>
            {t.status === 'draft' ? (
              <button onClick={() => generate(t.id)} disabled={generatingId === t.id} className="flex items-center gap-2 bg-slate-800 text-white px-3 py-2 rounded-lg text-sm font-bold">
                {generatingId === t.id ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />} Gerar
              </button>
            ) : (
              <button onClick={() => onSelectTopic(t.id)} className="text-blue-600 font-bold text-sm">Revisar →</button>
            )}
          </div>
        ))}
      </div>

      <Dialog open={showModal} title="Novo tópico" onClose={() => setShowModal(false)} onSubmit={createTopic} actions={<><Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Cancelar</Button><Button type="submit" className="flex-1">Criar</Button></>}>
            <div className="space-y-4"><Input label="Título do tópico" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <div><label htmlFor="topic-grade" className="mb-1.5 block text-sm font-bold text-slate-700">Ano-alvo</label><select id="topic-grade" className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" value={form.targetGrade} onChange={e => setForm({ ...form, targetGrade: e.target.value })}>
              {GRADE_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select></div></div>
      </Dialog>
    </div>
  );
};

export default TopicManager;
