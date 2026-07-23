import React, { useCallback, useEffect, useState } from 'react';
import { UserMinus, UserPlus, Users } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, Input, Skeleton } from '../../design-system';
import { enrollStudent, listClassStudents, removeStudent } from '../../features/classes/classRosterService';

const ClassRoster = ({ classId, addToast }) => {
  const [students, setStudents] = useState([]);
  const [email, setEmail] = useState('');
  const [state, setState] = useState('loading');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!classId) return;
    setState('loading');
    try {
      setStudents(await listClassStudents(classId));
      setState('ready');
    } catch {
      setState('error');
    }
  }, [classId]);

  useEffect(() => { load(); }, [load]);

  const enroll = async event => {
    event.preventDefault();
    setSaving(true);
    try {
      await enrollStudent({ classId, email });
      setEmail('');
      await load();
      addToast('Aluno matriculado na turma.', 'success');
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async student => {
    try {
      await removeStudent({ classId, studentId: student.id });
      setStudents(previous => previous.filter(item => item.id !== student.id));
      addToast('Matrícula encerrada.', 'success');
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  return (
    <Card as="section" className="mt-6">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-100 text-cyan-700"><Users size={20} /></span>
        <div><h2 className="font-black text-slate-900">Alunos da turma</h2><p className="text-sm text-slate-500">Somente contas de aluno previamente autorizadas e ativas.</p></div>
      </div>

      <form className="mt-5 flex flex-col items-end gap-3 sm:flex-row" onSubmit={enroll}>
        <Input label="E-mail do aluno credenciado" type="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="aluno@exemplo.com" />
        <Button type="submit" loading={saving}><UserPlus size={17} /> Matricular</Button>
      </form>

      <div className="mt-5">
        {state === 'loading' && <Skeleton label="Carregando alunos" />}
        {state === 'error' && <ErrorState title="Não foi possível carregar os alunos" onRetry={load} />}
        {state === 'ready' && students.length === 0 && <EmptyState title="Nenhum aluno matriculado" description="Autorize a conta no painel master e depois informe o mesmo e-mail aqui." />}
        {students.map(student => (
          <div key={student.id} className="flex flex-col gap-3 border-t border-slate-100 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="font-bold text-slate-900">{student.name}</p><p className="text-sm text-slate-500">{student.email}</p></div>
            <Button size="sm" variant="danger" onClick={() => remove(student)}><UserMinus size={16} /> Remover</Button>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default ClassRoster;
