import { buildProgressModel } from './progressModel';

test('prioriza revisão vencida e mantém evidência real', () => {
  const result = buildProgressModel({
    mastery: [{ id: 'm1', skill: 'Equações', mastery_pct: 80, total_count: 4 }],
    reviews: [{ id: 'r1', skill: 'Equações', topic_title: 'Funções', due_date: '2026-07-22' }],
  });
  expect(result.skills[0].stage).toBe('revisar');
  expect(result.plan[0]).toMatchObject({ kind: 'review', title: 'Revisar Equações', context: 'Funções' });
});

test('classifica domínio pela regra de 70% e quantidade de evidências', () => {
  const result = buildProgressModel({ mastery: [
    { id: 'a', skill: 'A', mastery_pct: 100, total_count: 1 },
    { id: 'b', skill: 'B', mastery_pct: 50, total_count: 2 },
    { id: 'c', skill: 'C', mastery_pct: 70, total_count: 3 },
  ] });
  expect(result.skills.map(item => item.stage)).toEqual(['consistente', 'em-pratica', 'consistente']);
  expect(result.summary.consistent).toBe(2);
});

test('ordena histórico brasileiro e sugere continuidade quando não há revisão', () => {
  const result = buildProgressModel({ history: [
    { id: 'old', type: 'quiz', theme: 'Química', percentage: 60, date: '02/07/2026 10:00' },
    { id: 'new', type: 'quiz', theme: 'Física', percentage: 90, date: '20/07/2026 10:00' },
  ] });
  expect(result.timeline.map(item => item.id)).toEqual(['new', 'old']);
  expect(result.plan[0].title).toBe('Continuar em Física');
});
