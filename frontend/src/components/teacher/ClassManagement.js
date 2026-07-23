import React, { useEffect, useState } from 'react';
import { Plus, School, Copy } from 'lucide-react';
import { Button, Dialog, EmptyState, ErrorState, Input, Skeleton } from '../../design-system';
import { createOwnedClass, listOwnedClasses } from '../../features/classes/teacherClassService';
import { listCurriculumComponents } from '../../features/curriculum/curriculumService';

const GRADE_OPTIONS = [
  { value: 'any', label: 'Qualquer ano' },
  { value: '1', label: '1º ano' },
  { value: '2', label: '2º ano' },
  { value: '3', label: '3º ano' },
];

const ClassManagement = ({ currentUser, selectedClassId, onSelectClass, addToast }) => {
  const [classes, setClasses] = useState([]);
  const [curriculumComponents, setCurriculumComponents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    theme: '',
    gradeYear: 'any',
    curriculumComponentIds: [],
    curriculumDescriptorIds: [],
  });
  const [loadState, setLoadState] = useState('loading');
  const teacherId = currentUser?.data?.id;

  const load = async () => {
    if (!teacherId) return;
    setLoadState('loading');
    try {
      setClasses(await listOwnedClasses(teacherId));
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  };

  useEffect(() => { load(); }, [teacherId]);
  useEffect(() => {
    listCurriculumComponents().then(setCurriculumComponents).catch(() => {
      addToast('A referência curricular não pôde ser carregada.', 'error');
    });
  }, [addToast]);

  const createClass = async () => {
    if (!form.name.trim()) return;
    try {
      const created = await createOwnedClass(form);
      setShowModal(false);
      setForm({
        name: '',
        theme: '',
        gradeYear: 'any',
        curriculumComponentIds: [],
        curriculumDescriptorIds: [],
      });
      addToast('Turma criada', 'success');
      await load();
      onSelectClass(created.id);
    } catch (e) { addToast(e.message, 'error'); }
  };

  const toggleComponent = component => {
    const selected = form.curriculumComponentIds.includes(component.id);
    const descriptorIds = component.descriptors.map(descriptor => descriptor.id);
    setForm(previous => ({
      ...previous,
      curriculumComponentIds: selected
        ? previous.curriculumComponentIds.filter(id => id !== component.id)
        : [...previous.curriculumComponentIds, component.id],
      curriculumDescriptorIds: selected
        ? previous.curriculumDescriptorIds.filter(id => !descriptorIds.includes(id))
        : previous.curriculumDescriptorIds,
    }));
  };

  const toggleDescriptor = descriptorId => {
    setForm(previous => ({
      ...previous,
      curriculumDescriptorIds: previous.curriculumDescriptorIds.includes(descriptorId)
        ? previous.curriculumDescriptorIds.filter(id => id !== descriptorId)
        : [...previous.curriculumDescriptorIds, descriptorId],
    }));
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
                {c.curriculumComponents?.length > 0 && <p className="mt-1 text-xs font-semibold text-blue-700">{c.curriculumComponents.map(component => component.name).join(' · ')}</p>}
                {c.curriculumDescriptors?.length > 0 && <p className="mt-1 text-xs text-slate-500">{c.curriculumDescriptors.map(descriptor => descriptor.code).join(', ')}</p>}
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
            <fieldset>
              <legend className="text-sm font-bold text-slate-700">Componentes curriculares</legend>
              <p className="mt-1 text-xs text-slate-500">Selecione um ou mais componentes do curso Técnico em Informática.</p>
              <div className="mt-3 max-h-44 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                {curriculumComponents.map(component => (
                  <label key={component.id} className="flex cursor-pointer items-start gap-3 rounded-lg bg-white p-3">
                    <input type="checkbox" className="mt-1 h-4 w-4" checked={form.curriculumComponentIds.includes(component.id)} onChange={() => toggleComponent(component)} />
                    <span><strong className="block text-sm text-slate-800">{component.name}</strong><span className="text-xs text-slate-500">{component.descriptors.length} descritores disponíveis</span></span>
                  </label>
                ))}
              </div>
            </fieldset>
            {form.curriculumComponentIds.length > 0 && (
              <fieldset>
                <legend className="text-sm font-bold text-slate-700">Descritores que orientarão a turma</legend>
                <p className="mt-1 text-xs text-slate-500">As competências são derivadas automaticamente. Marque os descritores que a IA deverá respeitar.</p>
                <div className="mt-3 max-h-64 space-y-4 overflow-y-auto rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                  {curriculumComponents.filter(component => form.curriculumComponentIds.includes(component.id)).map(component => (
                    <div key={component.id}>
                      <h4 className="text-sm font-black text-blue-950">{component.name}</h4>
                      <div className="mt-2 space-y-2">
                        {component.descriptors.map(descriptor => (
                          <label key={descriptor.id} className="flex cursor-pointer items-start gap-3 rounded-lg bg-white p-3">
                            <input type="checkbox" className="mt-1 h-4 w-4" checked={form.curriculumDescriptorIds.includes(descriptor.id)} onChange={() => toggleDescriptor(descriptor.id)} />
                            <span className="text-sm"><strong>{descriptor.code}</strong> <span className="text-xs font-bold uppercase text-blue-700">· {descriptor.level}</span><span className="mt-1 block text-slate-600">{descriptor.description}</span></span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs font-bold text-blue-800">{form.curriculumDescriptorIds.length} descritor(es) selecionado(s)</p>
              </fieldset>
            )}
            <div><label htmlFor="class-grade" className="mb-1.5 block text-sm font-bold text-slate-700">Ano escolar</label><select id="class-grade" className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5" value={form.gradeYear} onChange={e => setForm({ ...form, gradeYear: e.target.value })}>
              {GRADE_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select></div></div>
      </Dialog>
    </div>
  );
};

export default ClassManagement;
