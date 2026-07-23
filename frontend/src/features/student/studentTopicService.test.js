import { listStudentPublishedTopics, submitPublishedQuiz } from './studentTopicService';
import { requireSupabase } from '../../lib/supabase';

jest.mock('../../lib/supabase', () => ({ requireSupabase: jest.fn() }));

describe('studentTopicService', () => {
  beforeEach(() => jest.clearAllMocks());

  test('carrega materiais publicados de todas as matrículas ativas', async () => {
    const membershipQuery = {
      select: jest.fn().mockReturnThis(),
      is: jest.fn().mockResolvedValue({
        data: [
          { class_id: 'class-1', classes: { name: 'Turma A' } },
          { class_id: 'class-2', classes: { name: 'Turma B' } },
        ],
        error: null,
      }),
    };
    const topicQuery = {
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [{ id: 'topic-1', class_id: 'class-2', title: 'Hardware' }],
        error: null,
      }),
    };
    requireSupabase.mockReturnValue({
      from: jest.fn(table => table === 'class_memberships' ? membershipQuery : topicQuery),
    });

    await expect(listStudentPublishedTopics()).resolves.toEqual([
      expect.objectContaining({ id: 'topic-1', className: 'Turma B' }),
    ]);
    expect(topicQuery.in).toHaveBeenCalledWith('class_id', ['class-1', 'class-2']);
    expect(topicQuery.eq).toHaveBeenCalledWith('status', 'published');
  });

  test('submete somente respostas, deixando o gabarito no servidor', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: { score: 1, total: 1, percentage: 100 },
      error: null,
    });
    requireSupabase.mockReturnValue({ rpc });

    await submitPublishedQuiz({
      topicId: 'topic-1',
      answers: [{ questionId: 'question-1', selectedOption: 'A' }],
    });

    expect(rpc).toHaveBeenCalledWith('submit_published_topic_quiz', {
      p_topic_id: 'topic-1',
      p_answers: [{ questionId: 'question-1', selectedOption: 'A' }],
    });
    expect(JSON.stringify(rpc.mock.calls)).not.toContain('correctOption');
  });
});
