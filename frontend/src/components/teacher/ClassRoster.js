import React, { useCallback, useEffect, useState } from 'react';
import { UserMinus, UserPlus, Users } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, Input, Skeleton } from '../../design-system';
import {
  authorizeOrEnrollStudent,
  listClassStudents,
  listPendingStudentGrants,
  removeStudent,
  revokePendingStudentGrant,
} from '../../features/classes/classRosterService';

const ClassRoster = ({ classId, addToast }) => {
  const [students, setStudents] = useState([]);
  const [pendingGrants, setPendingGrants] = useState([]);
  const [email, setEmail] = useState('');
  const [state, setState] = useState('loading');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!classId) return;
    setState('loading');
    try {
      const [studentData, grantData] = await Promise.all([
        listClassStudents(classId),
        listPendingStudentGrants(classId),
      ]);
      setStudents(studentData);
      setPendingGrants(grantData);
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
      const result = await authorizeOrEnrollStudent({ classId, email });
      setEmail('');
      await load();
      addToast(result.status === 'enrolled'
        ? 'Aluno matriculado na turma.'
        : 'Aluno autorizado. A matrícula será concluída no primeiro acesso com Google.', 'success');
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

  const revoke = async grant => {
    try {
      await revokePendingStudentGrant(grant.id);
      setPendingGrants(previous => previous.filter(item => item.id !== grant.id));
      addToast('Autorização do aluno revogada.', 'success');
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  return (
    <Card as="section" className="mt-6">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-100 text-cyan-700"><Users size={20} /></span>
        <div><h2 className="font-black text-slate-900">Alunos da turma</h2><p className="text-sm text-slate-500">Cadastre um aluno por e-mail. Contas novas entram com Google e são vinculadas automaticamente.</p></div>
      </div>

      <form className="mt-5 flex flex-col items-end gap-3 sm:flex-row" onSubmit={enroll}>
        <Input label="E-mail do aluno" type="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="aluno@exemplo.com" />
        <Button type="submit" loading={saving}><UserPlus size={17} /> Cadastrar ou matricular</Button>
      </form>

      <div className="mt-5">
        {state === 'loading' && <Skeleton label="Carregando alunos" />}
        {state === 'error' && <ErrorState title="Não foi possível carregar os alunos" onRetry={load} />}
        {state === 'ready' && students.length === 0 && <EmptyState title="Nenhum aluno matriculado" description="Informe o e-mail do aluno. O professor não pode criar professores nem alterar papéis." />}
        {students.map(student => (
          <div key={student.id} className="flex flex-col gap-3 border-t border-slate-100 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="font-bold text-slate-900">{student.name}</p><p className="text-sm text-slate-500">{student.email}</p></div>
            <Button size="sm" variant="danger" onClick={() => remove(student)}><UserMinus size={16} /> Remover</Button>
          </div>
        ))}
      </div>

      {pendingGrants.length > 0 && (
        <div className="mt-6 border-t border-slate-200 pt-5">
          <h3 className="font-black text-slate-900">Aguardando primeiro acesso</h3>
          <p className="mb-2 text-sm text-slate-500">Autorizações criadas por você para esta turma.</p>
          {pendingGrants.map(grant => (
            <div key={grant.id} className="flex flex-col gap-3 border-t border-slate-100 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-slate-900">{grant.email}</p>
                <p className="text-xs text-slate-500">Válido até {new Date(grant.expires_at).toLocaleDateString('pt-BR')}</p>
              </div>
              <Button size="sm" variant="danger" onClick={() => revoke(grant)}>Revogar autorização</Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default ClassRoster;
