import { loadStudentProgress } from './progressService';
import { requireSupabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({ requireSupabase: vi.fn() }));

const queryWith = result => {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return query;
};

test('monta progresso somente com registros persistidos do próprio aluno', async () => {
  const mastery = queryWith({ data: [{ id: 'm1', skill: 'Hardware', mastery_pct: 50 }], error: null });
  const reviews = queryWith({
    data: [{ id: 'r1', skill: 'Hardware', topic_id: 't1', due_at: '2026-07-23T10:00:00Z', topics: { title: 'Componentes', status: 'published' } }],
    error: null,
  });
  const attempts = queryWith({
    data: [{ id: 'a1', topic_id: 't1', score: 1, total: 2, percentage: 50, completed_at: '2026-07-23T10:00:00Z', topics: { title: 'Componentes', status: 'published' } }],
    error: null,
  });
  requireSupabase.mockReturnValue({
    from: vi.fn(table => ({ skill_mastery: mastery, review_queue: reviews, quiz_attempts: attempts })[table]),
  });

  const result = await loadStudentProgress('student-1');

  expect(result.reviews[0]).toMatchObject({ topic_title: 'Componentes', topic_available: true, due_date: '2026-07-23' });
  expect(result.history[0]).toMatchObject({ type: 'quiz', theme: 'Componentes', topic_available: true, percentage: 50 });
  [mastery, reviews, attempts].forEach(query => {
    expect(query.eq).toHaveBeenCalledWith('student_id', 'student-1');
  });
});
