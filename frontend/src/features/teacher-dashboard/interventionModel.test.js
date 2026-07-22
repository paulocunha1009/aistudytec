import { buildInterventions } from './interventionModel';

test('prioriza revisão vencida e expõe a origem', () => {
  const items = buildInterventions([{ userId: '1', name: 'Ana', attempts: 2, dueReviews: [{ skill: 'Frações', topic_id: 't1' }], skills: [] }]);
  expect(items[0]).toMatchObject({ type: 'due-review', evidence: 'Frações', topicId: 't1', priority: 0 });
});

test('não chama habilidade frágil com apenas uma evidência', () => {
  const items = buildInterventions([{ userId: '1', name: 'Bia', attempts: 1, dueReviews: [], skills: [{ skill: 'Gráficos', masteryPct: 0, totalCount: 1, status: 'reforcar' }] }]);
  expect(items.map(item => item.type)).toEqual(['low-evidence']);
});

test('separa ausência de tentativa de dificuldade acadêmica', () => {
  const items = buildInterventions([{ userId: '1', name: 'Caio', attempts: 0, dueReviews: [], skills: [] }]);
  expect(items).toHaveLength(1);
  expect(items[0].type).toBe('no-attempt');
});
