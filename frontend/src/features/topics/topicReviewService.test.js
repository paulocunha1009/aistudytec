import { generateTopicContent, publishTopic } from './topicReviewService';
import { requireSupabase } from '../../lib/supabase';

jest.mock('../../lib/supabase', () => ({ requireSupabase: jest.fn() }));

describe('topicReviewService', () => {
  beforeEach(() => jest.clearAllMocks());

  test('invoca geração somente pela Edge Function protegida', async () => {
    const invoke = jest.fn().mockResolvedValue({
      data: { status: 'generated', sourceCount: 4 },
      error: null,
    });
    requireSupabase.mockReturnValue({ functions: { invoke } });

    await expect(generateTopicContent({ topicId: 'topic-1' }))
      .resolves.toMatchObject({ status: 'generated' });
    expect(invoke).toHaveBeenCalledWith('generate-topic', {
      body: { topicId: 'topic-1', part: 'all' },
    });
  });

  test('traduz detalhes do gate de publicação', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: null,
      error: { code: '23514', details: 'mínimo de oito questões | um vídeo aprovado por nível' },
    });
    requireSupabase.mockReturnValue({ rpc });

    await expect(publishTopic('topic-1')).rejects.toMatchObject({
      missing: ['mínimo de oito questões', 'um vídeo aprovado por nível'],
    });
  });
});
