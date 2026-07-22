import React, { useEffect, useState } from 'react';
import { Plus, School, Copy } from 'lucide-react';
import { api } from '../../api/client';
import { Button, Dialog, EmptyState, ErrorState, Input, Skeleton } from '../../design-system';

const GRADE_OPTIONS = [
  { value: 'any', label: 'Qualquer ano' },
  { value: '1', label: '1º ano' },
  { value: '2', label: '2º ano' },
  { value: '3', label: '3º ano' },
];

const ClassManagement = ({ apiUrl, currentUser, selectedClassId, onSelectClass, addToast }) => {
  const [classes, setClasses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', theme: '', gradeYear: 'any' });
  const [loadState, setLoadState] = useState('loading');
  const teacherId = currentUser?.data?.id;

  const load = () => {
    if (!teacherId) return;
    setLoadState('loading');
    api.listClasses(apiUrl, teacherId).then(data => { setClasses(data); setLoadState('ready'); }).catch(() => setLoadState('error'));
  };

  useEffect(load, [apiUrl, teacherId]);

  const createClass = async () => {
    if (!form.name.trim()) return;
    try {
      await api.createClass(apiUrl, { ...form, teacherId });
      setShowModal(false);
      setForm({ name: '', theme: '', gradeYear: 'any' });
      addToast('Turma criada', 'success');
      load();
    } catch (e) { addToast(e.message, 'error'); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-slate-700">Minhas turmas</h3>
        <Button onClick={() => setShowModal(true)} size="sm"><Plus size={16} /> Nova turma</Button>
      </div>

      <div className="grid gap-3">
        {loadState === 'loading' && <Skeleton label="Carregando turmas" />}
        {loadState === 'error' && <ErrorState title="Não foi possível carregar as turmas" onRetry={load} />}
        {loadState === 'ready' && classes.length === 0 && <EmptyState title="Nenhuma turma ainda" description="Crie a primeira turma para organizar tópicos e estudantes." action={<Button size="sm" onClick={() => setShowModal(true)}>Criar turma</Button>} />}
        {classes.map(c => (
          <button key={c.id} onClick={() => onSelectClass(c.id)} className={`text-left p-4 rounded-xl border flex items-center justify-between ${selectedClassId === c.id ? 'border-purple-500 bg-purple-50' : 'bg-white hover:border-purple-300'}`}>
            <div className="flex items-center gap-3">
              <School className="text-purple-400" />
              <div>
                <p className="font-bold text-slate-800">{c.name}</p>
                <p className="text-xs text-slate-400">{GRADE_OPTIONS.find(g => g.value === c.grade_year)?.label || 'Qualquer ano'}</p>
              </div>
            </div>
            <span className="flex items-center gap-1 font-mono text-xs bg-slate-100 px-2 py-1 rounded">{c.code} <Copy size={12} /></span>
          </button>
        ))}
      </div>

      <Dialog open={showModal} title="Nova turma" onClose={() => setShowModal(false)} onSubmit={createClass} actions={<><Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Cancelar</Button><Button type="submit" className="flex-1">Criar</Button></>}>
            <div className="space-y-4">
            <Input label="Nome da turma" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <Input label="Disciplina ou tema" hint="Opcional" value={form.theme} onChange={e => setForm({ ...form, theme: e.target.value })} />
            <div><label htmlFor="class-grade" className="mb-1.5 block text-sm font-bold text-slate-700">Ano escolar</label><select id="class-grade" className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" value={form.gradeYear} onChange={e => setForm({ ...form, gradeYear: e.target.value })}>
              {GRADE_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select></div></div>
      </Dialog>
    </div>
  );
};

export default ClassManagement;
