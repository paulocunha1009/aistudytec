import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, BarChart3, Clock3, SearchCheck, Users } from 'lucide-react';
import { api } from '../../api/client';
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton } from '../../design-system';
import { buildInterventions, INTERVENTION_META } from '../../features/teacher-dashboard/interventionModel';

const formatDate = value => value ? new Date(value).toLocaleDateString('pt-BR') : 'sem prática registrada';

const TeacherDashboard = ({ apiUrl, classId, onSelectTopic }) => {
  const [data, setData] = useState(null);
  const [loadState, setLoadState] = useState('idle');

  const load = () => {
    if (!classId) { setData(null); setLoadState('idle'); return; }
    setLoadState('loading');
    api.classDashboard(apiUrl, classId).then(result => { setData(result); setLoadState('ready'); }).catch(() => setLoadState('error'));
  };

  useEffect(() => { load(); }, [apiUrl, classId]);
  const interventions = useMemo(() => buildInterventions(data?.students || []), [data]);

  if (!classId) return <EmptyState title="Selecione uma turma" description="Os indicadores aparecerão depois que uma turma for selecionada." />;
  if (loadState === 'loading') return <Skeleton lines={6} label="Carregando intervenções da turma" />;
  if (loadState === 'error') return <ErrorState title="Não foi possível carregar as intervenções" onRetry={load} />;
  if (!data?.students.length) return <EmptyState title="Nenhum estudante cadastrado" description="As intervenções aparecerão quando houver estudantes e atividades na turma." />;

  return (
    <div className="space-y-8">
      <header className="relative overflow-hidden rounded-[2rem] bg-[#07111f] p-6 text-white sm:p-8"><div className="home-grid pointer-events-none absolute inset-0 opacity-30" /><div className="relative"><p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Decisão apoiada por evidência</p><h2 className="mt-2 text-3xl font-black">Intervenções da turma</h2><p className="mt-2 max-w-2xl text-sm text-slate-300">A fila organiza sinais objetivos; a decisão pedagógica continua sendo do professor.</p><div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4"><div className="rounded-2xl bg-white/[0.07] p-3"><strong className="block text-2xl text-white">{data.summary.students}</strong><span className="text-xs text-slate-400">estudantes</span></div><div className="rounded-2xl bg-white/[0.07] p-3"><strong className="block text-2xl text-rose-300">{data.summary.dueReviews}</strong><span className="text-xs text-slate-400">revisões vencidas</span></div><div className="rounded-2xl bg-white/[0.07] p-3"><strong className="block text-2xl text-amber-300">{data.summary.skillsToReinforce}</strong><span className="text-xs text-slate-400">habilidades &lt;70%</span></div><div className="rounded-2xl bg-white/[0.07] p-3"><strong className="block text-2xl text-cyan-300">{data.summary.withoutAttempts}</strong><span className="text-xs text-slate-400">sem tentativa</span></div></div></div></header>

      <section aria-labelledby="interventions-title"><div className="mb-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">Fila priorizada</p><h3 id="interventions-title" className="mt-1 flex items-center gap-2 text-2xl font-black"><AlertTriangle className="text-violet-500" /> Onde olhar primeiro</h3></div>{interventions.length ? <div className="grid gap-4">{interventions.map(item => { const meta = INTERVENTION_META[item.type]; return <Card key={item.id} className="border-0 shadow-[0_12px_35px_rgba(15,23,42,.07)]"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge tone={meta.tone}>{meta.label}</Badge><span className="font-black text-slate-900">{item.student.name}</span></div><h4 className="mt-3 text-lg font-black">{item.title}</h4><p className="mt-1 text-sm text-slate-600"><strong>Origem:</strong> {item.evidence}</p><p className="mt-2 text-sm text-blue-700"><strong>Ação possível:</strong> {meta.action}</p></div>{item.topicId && <Button size="sm" variant="secondary" className="shrink-0" onClick={() => onSelectTopic(item.topicId)}>Abrir tópico <ArrowRight size={16} /></Button>}</div></Card>; })}</div> : <EmptyState title="Nenhuma intervenção prioritária" description="Não existem revisões vencidas, ausência de tentativa ou habilidades com sinal suficiente para reforço." />}</section>

      <section aria-labelledby="students-title"><div className="mb-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-teal-600">Leitura completa</p><h3 id="students-title" className="mt-1 flex items-center gap-2 text-2xl font-black"><Users className="text-teal-500" /> Evidências por estudante</h3></div><div className="grid gap-4 md:grid-cols-2">{data.students.map(student => <Card key={student.userId}><div className="flex items-start justify-between gap-3"><div><h4 className="font-black text-slate-900">{student.name}</h4><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Clock3 size={13} /> Última prática: {formatDate(student.lastPracticedAt)}</p></div><Badge tone={student.attempts ? 'info' : 'neutral'}>{student.attempts} tentativa{student.attempts === 1 ? '' : 's'}</Badge></div><div className="mt-4 flex flex-wrap gap-2">{student.skills.map(skill => <Badge key={skill.skill} tone={skill.status === 'mastered' ? 'success' : 'warning'}>{skill.skill} · {skill.masteryPct}% · n={skill.totalCount}</Badge>)}{!student.skills.length && <span className="text-sm text-slate-500">Sem habilidade medida.</span>}</div>{student.attempts > 0 && <p className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-600"><BarChart3 size={16} /> Média descritiva das tentativas: {student.avgPercentage}%</p>}</Card>)}</div></section>

      <Card className="border-blue-100 bg-blue-50"><div className="flex gap-3"><SearchCheck className="shrink-0 text-blue-700" /><div><h3 className="font-black text-blue-950">Limites da leitura</h3><p className="mt-1 text-sm text-blue-800">“Pouca evidência” significa uma resposta ou menos. “Reforço” exige mais de uma resposta e domínio abaixo de 70%. O painel não diagnostica capacidade, esforço ou causa.</p></div></div></Card>
    </div>
  );
};

export default TeacherDashboard;
