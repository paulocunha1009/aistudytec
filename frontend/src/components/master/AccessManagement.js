import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, KeyRound, RefreshCw, XCircle, UserPlus2, Users } from 'lucide-react';
import { Button, Card, Input } from '../../design-system';
import { createAccessGrant, listAccessGrants, revokeAccessGrant } from '../../features/access/accessGrantService';

const roleNames = { student: 'Aluno', teacher: 'Professor' };
const statusNames = { pending: 'Aguardando cadastro', consumed: 'Acesso ativado', revoked: 'Revogado', expired: 'Expirado' };

const effectiveStatus = grant => (
  grant.status === 'pending' && new Date(grant.expires_at) <= new Date() ? 'expired' : grant.status
);

const AccessManagement = ({ currentUser, addToast }) => {
  const [grants, setGrants] = useState([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('student');
  const [validDays, setValidDays] = useState('7');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setGrants(await listAccessGrants());
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => grants.reduce((result, grant) => {
    const status = effectiveStatus(grant);
    result[status] = (result[status] || 0) + 1;
    return result;
  }, {}), [grants]);

  const authorize = async event => {
    event.preventDefault();
    setSaving(true);
    try {
      const days = Number(validDays);
      if (!Number.isInteger(days) || days < 1 || days > 30) throw new Error('Escolha uma validade entre 1 e 30 dias.');
      const expiresAt = new Date(Date.now() + days * 86400000).toISOString();
      const created = await createAccessGrant({ email, role, grantedBy: currentUser.data.id, expiresAt });
      setGrants(previous => [created, ...previous]);
      setEmail('');
      addToast('Usuário autorizado com sucesso.', 'success');
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const revoke = async grant => {
    try {
      await revokeAccessGrant(grant.id);
      setGrants(previous => previous.map(item => item.id === grant.id
        ? { ...item, status: 'revoked', revoked_at: new Date().toISOString() }
        : item));
      addToast('Autorização revogada.', 'success');
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-violet-700"><KeyRound size={17} /> Controle master</div>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Gestão de acessos</h1>
        <p className="mt-2 max-w-3xl text-slate-600">Autorize previamente cada pessoa. O cadastro somente será criado quando o mesmo e-mail entrar pelo Google.</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Resumo das autorizações">
        <Card className="flex items-center gap-4"><Clock3 className="text-amber-600" /><div><strong className="text-2xl">{counts.pending || 0}</strong><p className="text-sm text-slate-500">Aguardando cadastro</p></div></Card>
        <Card className="flex items-center gap-4"><CheckCircle2 className="text-emerald-600" /><div><strong className="text-2xl">{counts.consumed || 0}</strong><p className="text-sm text-slate-500">Acessos ativados</p></div></Card>
        <Card className="flex items-center gap-4"><XCircle className="text-rose-600" /><div><strong className="text-2xl">{(counts.revoked || 0) + (counts.expired || 0)}</strong><p className="text-sm text-slate-500">Revogados ou expirados</p></div></Card>
      </section>

      <Card as="section" className="p-6">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-700"><UserPlus2 /></span><div><h2 className="text-xl font-black">Autorizar novo usuário</h2><p className="text-sm text-slate-500">Nenhuma senha é criada ou compartilhada.</p></div></div>
        <form className="mt-5 grid items-end gap-4 lg:grid-cols-[1fr_180px_150px_auto]" onSubmit={authorize}>
          <Input label="E-mail autorizado" type="email" required placeholder="usuario@exemplo.com" value={email} onChange={event => setEmail(event.target.value)} />
          <label className="block text-sm font-bold text-slate-700">Perfil
            <select className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3" value={role} onChange={event => setRole(event.target.value)}>
              <option value="student">Aluno</option>
              <option value="teacher">Professor</option>
            </select>
          </label>
          <Input label="Validade (dias)" type="number" min="1" max="30" required value={validDays} onChange={event => setValidDays(event.target.value)} />
          <Button type="submit" loading={saving}><UserPlus2 size={18} /> Autorizar</Button>
        </form>
      </Card>

      <Card as="section" className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <div className="flex items-center gap-3"><Users className="text-blue-600" /><div><h2 className="font-black">Histórico de autorizações</h2><p className="text-sm text-slate-500">Registro auditável de convites e ativações.</p></div></div>
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}><RefreshCw size={16} /> Atualizar</Button>
        </div>
        {loading ? <p role="status" className="p-6 text-slate-500">Carregando autorizações…</p> : grants.length === 0 ? (
          <p className="p-6 text-slate-500">Nenhuma autorização registrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="p-4">Usuário</th><th className="p-4">Perfil</th><th className="p-4">Status</th><th className="p-4">Validade</th><th className="p-4 text-right">Ação</th></tr></thead>
              <tbody>{grants.map(grant => {
                const status = effectiveStatus(grant);
                return <tr key={grant.id} className="border-t border-slate-100">
                  <td className="p-4 font-bold text-slate-900">{grant.email}</td>
                  <td className="p-4">{roleNames[grant.role]}</td>
                  <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${status === 'consumed' ? 'bg-emerald-100 text-emerald-800' : status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'}`}>{statusNames[status]}</span></td>
                  <td className="p-4 text-slate-600">{new Date(grant.expires_at).toLocaleDateString('pt-BR')}</td>
                  <td className="p-4 text-right">{status === 'pending' && <Button variant="danger" size="sm" onClick={() => revoke(grant)}>Revogar</Button>}</td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AccessManagement;
