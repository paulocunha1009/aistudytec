import { buildTopicGate, generateTopicContent, publishTopic } from './topicReviewService';
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

  test('checklist exige conteúdo completo e aprovação humana dos vídeos', () => {
    const path = {
      hook: 'Pergunta', objectives: ['A'], keyIdeas: ['B'],
      realWorldConnection: 'C', guidedInvestigation: {}, watchMission: {},
      handsOnChallenge: {}, reflectionQuestions: ['D'], discussionPrompt: 'E',
    };
    const topic = {
      explanations: {
        simple: 'x'.repeat(120), technical: 'x'.repeat(120), advanced: 'x'.repeat(120),
      },
      learningPaths: { simple: path, technical: path, advanced: path },
      questions: Array.from({ length: 8 }, (_, index) => ({
        id: index, correct_option: 'A', explanation: 'feedback detalhado válido',
        descriptors: [{ code: 'D01' }],
      })),
      videos: {
        simple: [{ approved: true }],
        technical: [{ approved: true }],
        advanced: [{ approved: false }],
      },
    };

    const gate = buildTopicGate(topic);
    expect(gate.filter(item => item.ready)).toHaveLength(3);
    expect(gate.find(item => item.key === 'videos').ready).toBe(false);
  });
});
