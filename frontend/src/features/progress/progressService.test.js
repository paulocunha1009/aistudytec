import { loadStudentProgress } from './progressService';
import { requireSupabase } from '../../lib/supabase';

jest.mock('../../lib/supabase', () => ({ requireSupabase: jest.fn() }));

const queryWith = result => {
  const query = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return query;
};

test('monta progresso somente com registros persistidos do próprio aluno', async () => {
  const mastery = queryWith({ data: [{ id: 'm1', skill: 'Hardware', mastery_pct: 50 }], error: null });
  const reviews = queryWith({
    data: [{ id: 'r1', skill: 'Hardware', topic_id: 't1', due_at: '2026-07-23T10:00:00Z', topics: { title: 'Componentes' } }],
    error: null,
  });
  const attempts = queryWith({
    data: [{ id: 'a1', topic_id: 't1', score: 1, total: 2, percentage: 50, completed_at: '2026-07-23T10:00:00Z', topics: { title: 'Componentes' } }],
    error: null,
  });
  requireSupabase.mockReturnValue({
    from: jest.fn(table => ({ skill_mastery: mastery, review_queue: reviews, quiz_attempts: attempts })[table]),
  });

  const result = await loadStudentProgress('student-1');

  expect(result.reviews[0]).toMatchObject({ topic_title: 'Componentes', due_date: '2026-07-23' });
  expect(result.history[0]).toMatchObject({ type: 'quiz', theme: 'Componentes', percentage: 50 });
  [mastery, reviews, attempts].forEach(query => {
    expect(query.eq).toHaveBeenCalledWith('student_id', 'student-1');
  });
});
