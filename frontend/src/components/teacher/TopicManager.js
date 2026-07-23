import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Badge, Button, Dialog, EmptyState, ErrorState, Input, Skeleton } from '../../design-system';
import {
  createTeacherTopic,
  listClassBlueprintDescriptors,
  listTeacherTopics,
} from '../../features/topics/teacherTopicService';

const GRADE_OPTIONS = [
  { value: 'any', label: 'Qualquer ano' },
  { value: '1', label: '1º ano' },
  { value: '2', label: '2º ano' },
  { value: '3', label: '3º ano' },
];

const STATUS_LABEL = { draft: 'Rascunho', generated: 'Gerado (revisar)', published: 'Publicado' };
const STATUS_COLOR = { draft: 'bg-slate-100 text-slate-500', generated: 'bg-amber-100 text-amber-700', published: 'bg-green-100 text-green-700' };
const EMPTY_FORM = { title: '', targetGrade: 'any', descriptorIds: [] };

const TopicManager = ({ classId, onSelectTopic, addToast }) => {
  const [topics, setTopics] = useState([]);
  const [descriptors, setDescriptors] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [loadState, setLoadState] = useState('loading');

  const load = () => {
    setLoadState('loading');
    Promise.all([listTeacherTopics(classId), listClassBlueprintDescriptors(classId)])
      .then(([topicData, descriptorData]) => {
        setTopics(topicData);
        setDescriptors(descriptorData);
        setLoadState('ready');
      })
      .catch(() => setLoadState('error'));
  };

  useEffect(() => { load(); }, [classId]);

  const createTopic = async () => {
    if (!form.title.trim() || form.descriptorIds.length === 0) {
      addToast('Informe o título e selecione ao menos um descritor.', 'error');
      return;
    }
    setSaving(true);
    try {
      await createTeacherTopic({ ...form, classId });
      setShowModal(false);
      setForm(EMPTY_FORM);
      addToast('Tópico curricular criado como rascunho.', 'success');
      load();
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleDescriptor = descriptorId => {
    setForm(current => ({
      ...current,
      descriptorIds: current.descriptorIds.includes(descriptorId)
        ? current.descriptorIds.filter(id => id !== descriptorId)
        : [...current.descriptorIds, descriptorId],
    }));
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-700">Tópicos da turma</h3>
          <p className="text-xs text-slate-500">Todo tópico nasce vinculado aos descritores validados da turma.</p>
        </div>
        <Button onClick={() => setShowModal(true)} size="sm"><Plus size={16} /> Novo tópico</Button>
      </div>

      <div className="grid gap-3">
        {loadState === 'loading' && <Skeleton label="Carregando tópicos" />}
        {loadState === 'error' && <ErrorState title="Não foi possível carregar os tópicos" onRetry={load} />}
        {loadState === 'ready' && topics.length === 0 && (
          <EmptyState title="Nenhum tópico cadastrado" description="Crie um tópico orientado pelo blueprint curricular."
            action={<Button size="sm" onClick={() => setShowModal(true)}>Criar tópico</Button>} />
        )}
        {topics.map(topic => (
          <div key={topic.id} className="flex items-center justify-between gap-3 rounded-xl border bg-white p-4">
            <button className="flex-1 text-left" onClick={() => onSelectTopic(topic.id)}>
              <p className="font-bold text-slate-800">{topic.title}</p>
              <p className="my-2 text-xs font-semibold text-slate-500">
                {topic.descriptors.map(item => item.code).join(', ')}
              </p>
              <Badge className={STATUS_COLOR[topic.status]}>{STATUS_LABEL[topic.status]}</Badge>
            </button>
            <button onClick={() => onSelectTopic(topic.id)} className="text-sm font-bold text-blue-600">Abrir →</button>
          </div>
        ))}
      </div>

      <Dialog open={showModal} title="Novo tópico curricular" onClose={() => setShowModal(false)}
        onSubmit={createTopic}
        actions={<><Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Cancelar</Button><Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Criando...' : 'Criar rascunho'}</Button></>}>
        <div className="space-y-4">
          <Input label="Título do tópico" required value={form.title}
            onChange={event => setForm({ ...form, title: event.target.value })} />
          <div>
            <label htmlFor="topic-grade" className="mb-1.5 block text-sm font-bold text-slate-700">Ano-alvo</label>
            <select id="topic-grade" className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"
              value={form.targetGrade} onChange={event => setForm({ ...form, targetGrade: event.target.value })}>
              {GRADE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-bold text-slate-700">Descritores que orientarão o conteúdo</legend>
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3">
              {descriptors.map(descriptor => (
                <label key={descriptor.id} className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-slate-50">
                  <input type="checkbox" className="mt-1" checked={form.descriptorIds.includes(descriptor.id)}
                    onChange={() => toggleDescriptor(descriptor.id)} />
                  <span className="text-sm text-slate-700"><strong>{descriptor.code}</strong> — {descriptor.description}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </Dialog>
    </div>
  );
};

export default TopicManager;
